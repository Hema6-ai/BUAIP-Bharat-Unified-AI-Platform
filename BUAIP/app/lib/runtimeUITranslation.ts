// Runtime UI Translation System
// Dynamically translates UI strings to any of the 90+ supported languages

import { translations } from "@/app/i18n";

// In-memory cache for runtime UI translations
const uiTranslationCache: Map<string, Map<string, string>> = new Map();

/**
 * Get UI translation cache key
 */
function getUICacheKey(languageCode: string, key: string): string {
  return `ui:${languageCode}:${key}`;
}

/**
 * Check if language has a static dictionary
 */
export function hasStaticDictionary(languageCode: string): boolean {
  return languageCode in translations;
}

/**
 * Get cached UI translation from memory
 */
export function getCachedUITranslation(languageCode: string, key: string): string | null {
  const langCache = uiTranslationCache.get(languageCode);
  if (langCache) {
    return langCache.get(key) || null;
  }
  return null;
}

/**
 * Set cached UI translation in memory
 */
function setCachedUITranslation(languageCode: string, key: string, value: string): void {
  let langCache = uiTranslationCache.get(languageCode);
  if (!langCache) {
    langCache = new Map();
    uiTranslationCache.set(languageCode, langCache);
  }
  langCache.set(key, value);
}

/**
 * Load UI translations from localStorage
 */
export function loadUITranslationsFromStorage(languageCode: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const storageKey = `ui-translations-${languageCode}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      const langCache = new Map<string, string>(Object.entries(parsed));
      uiTranslationCache.set(languageCode, langCache);
    }
  } catch (error) {
    console.warn("Failed to load UI translations from storage:", error);
  }
}

/**
 * Save UI translations to localStorage
 */
export function saveUITranslationsToStorage(languageCode: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const langCache = uiTranslationCache.get(languageCode);
    if (langCache && langCache.size > 0) {
      const storageKey = `ui-translations-${languageCode}`;
      const obj = Object.fromEntries(langCache.entries());
      localStorage.setItem(storageKey, JSON.stringify(obj));
    }
  } catch (error) {
    console.warn("Failed to save UI translations to storage:", error);
  }
}

/**
 * Translate a single UI key to target language
 * Uses cache first, then AWS Translate
 */
export async function translateUIKey(
  key: string,
  targetLanguage: string
): Promise<string> {
  // Check if we have a static dictionary
  const staticDict = translations[targetLanguage];
  if (staticDict && (key in staticDict)) {
    return (staticDict as Record<string, string>)[key];
  }

  // Check memory cache
  const cached = getCachedUITranslation(targetLanguage, key);
  if (cached) {
    return cached;
  }

  // Get English source text
  const sourceText = (translations.en as Record<string, string>)[key];
  if (!sourceText) {
    console.warn(`Translation key not found in English dictionary: ${key}`);
    return key;
  }

  // Skip translation for English
  if (targetLanguage === "en") {
    return sourceText;
  }

  // Use AWS Translate with the existing translation cache
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: sourceText,
        sourceLanguage: "en",
        targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`UI translation request failed with status ${response.status}`);
    }

    const data = await response.json();
    const translated = (data?.translatedText as string) || sourceText;

    // Cache the result
    setCachedUITranslation(targetLanguage, key, translated);
    
    // Periodically save to localStorage (debounced)
    saveUITranslationsToStorage(targetLanguage);

    return translated;
  } catch (error) {
    console.error(`Failed to translate UI key "${key}" to ${targetLanguage}:`, error);
    
    // Fallback to English
    return sourceText;
  }
}

/**
 * Priority UI keys that should be translated immediately
 * These are visible in the UI right away (navbar, AI menu, input placeholders)
 */
const PRIORITY_UI_KEYS = [
  // AI Capabilities Menu
  'chat_ai_menu_title',
  'chat_ai_menu_document_explainer',
  'chat_ai_menu_document_explainer_sub',
  'chat_ai_menu_photo_answer',
  'chat_ai_menu_photo_answer_sub',
  'chat_ai_menu_learning_mode',
  'chat_ai_menu_learning_mode_sub',
  'chat_ai_menu_voice_query',
  'chat_ai_menu_voice_query_sub',
  'chat_ai_menu_upload_file',
  'chat_ai_menu_upload_file_sub',
  // Chat Input
  'chat_input_placeholder',
  'chat_input_listening_placeholder',
  'chat_pending_file_placeholder',
  // Navbar
  'navbar_platform_subtitle',
  'navbar_select_language',
  // Common
  'common_loading',
  'common_send',
  'common_try_again',
];

/**
 * Preload ONLY priority UI translations immediately
 * Returns quickly so UI can render with key elements translated
 */
export async function preloadPriorityUITranslations(targetLanguage: string): Promise<void> {
  // Skip for English
  if (targetLanguage === "en") {
    return;
  }

  // Load from localStorage first
  loadUITranslationsFromStorage(targetLanguage);

  const staticDict = translations[targetLanguage] as Record<string, string> | undefined;
  
  // Find priority keys that need translation
  const priorityKeysToTranslate = PRIORITY_UI_KEYS.filter((key) => {
    // Skip if already cached
    if (getCachedUITranslation(targetLanguage, key)) {
      return false;
    }
    // Skip if in static dictionary
    if (staticDict && key in staticDict) {
      return false;
    }
    return true;
  });

  if (priorityKeysToTranslate.length === 0) {
    return;
  }

  console.log(`Translating ${priorityKeysToTranslate.length} priority UI keys for ${targetLanguage}...`);
  
  // Translate all priority keys in parallel (fast)
  await Promise.all(
    priorityKeysToTranslate.map((key) => translateUIKey(key, targetLanguage))
  );

  console.log(`Priority UI translations ready for ${targetLanguage}`);
}

/**
 * Preload all UI translations for a language
 * This runs in the background to populate the cache
 */
export async function preloadUITranslations(targetLanguage: string): Promise<void> {
  // Skip for English
  if (targetLanguage === "en") {
    return;
  }

  // Load from localStorage first
  loadUITranslationsFromStorage(targetLanguage);

  // Get all keys from English dictionary
  const allKeys = Object.keys(translations.en);
  const staticDict = translations[targetLanguage] as Record<string, string> | undefined;
  
  // Translate only keys missing in both static dictionary and runtime cache.
  const keysToTranslate = allKeys.filter((key) => {
    if (getCachedUITranslation(targetLanguage, key)) {
      return false;
    }
    if (staticDict && key in staticDict) {
      return false;
    }
    return true;
  });

  // If everything is cached, we're done
  if (keysToTranslate.length === 0) {
    return;
  }

  console.log(`Preloading ${keysToTranslate.length} UI translations for ${targetLanguage}`);

  // First, translate priority keys immediately (no delay)
  const priorityKeys = keysToTranslate.filter(key => PRIORITY_UI_KEYS.includes(key));
  if (priorityKeys.length > 0) {
    console.log(`Translating ${priorityKeys.length} priority UI keys immediately...`);
    await Promise.all(
      priorityKeys.map((key) => translateUIKey(key, targetLanguage))
    );
  }

  // Then translate remaining keys in batches
  const remainingKeys = keysToTranslate.filter(key => !PRIORITY_UI_KEYS.includes(key));
  const BATCH_SIZE = 10;
  for (let i = 0; i < remainingKeys.length; i += BATCH_SIZE) {
    const batch = remainingKeys.slice(i, i + BATCH_SIZE);
    
    // Translate batch in parallel
    await Promise.all(
      batch.map((key) => translateUIKey(key, targetLanguage))
    );

    // Small delay between batches to be nice to AWS
    if (i + BATCH_SIZE < remainingKeys.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(`Preloaded UI translations for ${targetLanguage}`);
}

/**
 * Clear cached translations for a language
 */
export function clearUITranslationCache(languageCode?: string): void {
  if (languageCode) {
    uiTranslationCache.delete(languageCode);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`ui-translations-${languageCode}`);
    }
  } else {
    uiTranslationCache.clear();
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith("ui-translations-")) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

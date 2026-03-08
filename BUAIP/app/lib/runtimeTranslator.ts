import type { Language } from "@/app/lib/languageContext";

// In-memory cache for translations
// Structure: { "text" => { "te": "translated", ... } }
const translationCache = new Map<string, Map<Language, string>>();

// Track ongoing translation requests to prevent duplicate API calls
const pendingTranslations = new Map<string, Promise<string>>();

const TRANSLATION_UNAVAILABLE: Record<string, string> = {
  en: "Translation unavailable",
  hi: "अनुवाद अस्थायी रूप से उपलब्ध नहीं है",
  te: "అనువాదం తాత్కాలికంగా అందుబాటులో లేదు",
  ta: "மொழிபெயர்ப்பு தற்காலிகமாக கிடைக்கவில்லை",
};

/**
 * Translates text to the target language using Bedrock API
 * Implements in-memory caching to avoid redundant API calls
 * 
 * @param text - The text to translate
 * @param language - Target language ("en", "te")
 * @returns Translated text or original if language is English
 */
export async function translateText(
  text: string,
  language: Language
): Promise<string> {
  // Return original text for English
  if (language === "en") {
    return text;
  }

  // Return empty for empty input
  if (!text || text.trim() === "") {
    return text;
  }

  // Check cache first
  const cached = translationCache.get(text)?.get(language);
  if (cached) {
    return cached;
  }

  // Create unique key for this translation request
  const requestKey = `${text}:${language}`;

  // Check if there's already a pending request for this translation
  const pending = pendingTranslations.get(requestKey);
  if (pending) {
    return pending;
  }

  // Create new translation request
  const translationPromise = fetchTranslation(text, language);

  // Store as pending
  pendingTranslations.set(requestKey, translationPromise);

  try {
    const translatedText = await translationPromise;

    // Cache the result
    if (!translationCache.has(text)) {
      translationCache.set(text, new Map());
    }
    translationCache.get(text)?.set(language, translatedText);

    return translatedText;
  } catch (error) {
    console.error(`Translation failed for language ${language}:`, error);
    return TRANSLATION_UNAVAILABLE[language] || TRANSLATION_UNAVAILABLE.en;
  } finally {
    // Remove from pending
    pendingTranslations.delete(requestKey);
  }
}

/**
 * Internal function to fetch translation from API
 */
async function fetchTranslation(
  text: string,
  language: Language
): Promise<string> {
  const response = await fetch("/api/assistant-translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, language }),
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.translatedText || TRANSLATION_UNAVAILABLE[language] || TRANSLATION_UNAVAILABLE.en;
}

/**
 * Batch translate multiple texts at once
 * Useful for translating all fields of a scheme simultaneously
 * 
 * @param texts - Array of texts to translate
 * @param language - Target language ("en", "te")
 * @returns Array of translated texts in the same order
 */
export async function batchTranslate(
  texts: string[],
  language: Language
): Promise<string[]> {
  if (language === "en") {
    return texts;
  }

  // Translate all texts in parallel
  const promises = texts.map((text) => translateText(text, language));
  return Promise.all(promises);
}

/**
 * Clear translation cache (useful for testing or memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
  pendingTranslations.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats() {
  return {
    cachedTexts: translationCache.size,
    pendingTranslations: pendingTranslations.size,
  };
}

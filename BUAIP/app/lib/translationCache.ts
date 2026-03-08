// app/lib/translationCache.ts

/**
 * Translation Cache Manager with Language Invalidation
 * Provides intelligent caching for AI-translated scheme content
 * Automatically invalidates cache when language changes
 */

import type { Language } from "./languageContext";
import { OldLanguageType } from "./languageCompat";

interface CacheEntry {
  translatedText: string;
  timestamp: number;
  language: Language | OldLanguageType;
}

/**
 * Cache structure: Map<schemeIdentifier, Map<language, CacheEntry>>
 * This allows efficient lookups by scheme + language combination
 */
const translationCache = new Map<string, Map<Language | OldLanguageType, CacheEntry>>();

/**
 * Track current active language to detect changes
 */
let currentLanguage: Language = "en";

/**
 * Default cache TTL: 1 hour (in milliseconds)
 * Translations are relatively stable but we refresh periodically
 */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/**
 * Generate cache key from scheme name
 * Normalizes to prevent duplicate entries
 */
function generateCacheKey(schemeName: string): string {
  return schemeName.toLowerCase().trim().replace(/\s+/g, "_");
}

/**
 * Get cached translation if available and not expired
 * 
 * @param schemeName - Name of the scheme
 * @param language - Target language (can be old or new format)
 * @returns Cached translation or null if not found/expired
 */
export function getCachedTranslation(
  schemeName: string,
  language: Language | OldLanguageType
): string | null {
  const key = generateCacheKey(schemeName);
  const languageCache = translationCache.get(key);

  if (!languageCache) {
    return null;
  }

  const entry = languageCache.get(language);

  if (!entry) {
    return null;
  }

  // Check if entry is expired
  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > DEFAULT_TTL_MS) {
    // Remove expired entry
    languageCache.delete(language);
    if (languageCache.size === 0) {
      translationCache.delete(key);
    }
    return null;
  }

  return entry.translatedText;
}

/**
 * Store translation in cache
 * 
 * @param schemeName - Name of the scheme
 * @param language - Language of translation (can be old or new format)
 * @param translatedText - Translated content
 */
export function setCachedTranslation(
  schemeName: string,
  language: Language | OldLanguageType,
  translatedText: string
): void {
  const key = generateCacheKey(schemeName);

  if (!translationCache.has(key)) {
    translationCache.set(key, new Map());
  }

  const languageCache = translationCache.get(key)!;

  languageCache.set(language, {
    translatedText,
    timestamp: Date.now(),
    language,
  });
}

/**
 * Clear all cached translations for a specific language
 * Called when user switches language to ensure fresh content
 * 
 * @param language - Language to clear (can be old or new format)
 */
export function clearLanguageCache(language: Language | OldLanguageType): void {
  translationCache.forEach((languageCache) => {
    languageCache.delete(language);
  });
}

/**
 * Clear entire translation cache
 * Useful for memory management or forced refresh
 */
export function clearAllTranslations(): void {
  translationCache.clear();
}

/**
 * Clear cache for a specific scheme across all languages
 * 
 * @param schemeName - Name of scheme to clear
 */
export function clearSchemeCache(schemeName: string): void {
  const key = generateCacheKey(schemeName);
  translationCache.delete(key);
}

/**
 * Update current language and optionally clear old language cache
 * This is the key function for language switching
 * 
 * @param newLanguage - New language being switched to
 * @param clearOldCache - Whether to clear previous language cache (default: false)
 */
export function updateCurrentLanguage(
  newLanguage: Language,
  clearOldCache: boolean = false
): void {
  const oldLanguage = currentLanguage;

  if (oldLanguage !== newLanguage) {
    if (clearOldCache) {
      clearLanguageCache(oldLanguage);
    }
    currentLanguage = newLanguage;
  }
}

/**
 * Get current active language
 * 
 * @returns Current language
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Get cache statistics for monitoring/debugging
 * 
 * @returns Object with cache metrics
 */
export function getCacheStats() {
  let totalEntries = 0;
  const entriesByLanguage: Record<string, number> = {};

  translationCache.forEach((languageCache) => {
    languageCache.forEach((entry) => {
      totalEntries++;
      const langKey = String(entry.language);
      entriesByLanguage[langKey] = (entriesByLanguage[langKey] || 0) + 1;
    });
  });

  return {
    totalSchemes: translationCache.size,
    totalEntries,
    entriesByLanguage,
    currentLanguage,
  };
}

/**
 * Remove expired entries from cache
 * Can be called periodically for maintenance
 * 
 * @returns Number of entries removed
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let removedCount = 0;

  translationCache.forEach((languageCache, schemeKey) => {
    languageCache.forEach((entry, language) => {
      const age = now - entry.timestamp;
      if (age > DEFAULT_TTL_MS) {
        languageCache.delete(language);
        removedCount++;
      }
    });

    // Remove empty scheme entries
    if (languageCache.size === 0) {
      translationCache.delete(schemeKey);
    }
  });

  return removedCount;
}

/**
 * Check if a translation exists in cache (regardless of expiry)
 * 
 * @param schemeName - Name of the scheme
 * @param language - Target language (can be old or new format)
 * @returns True if cached (even if expired)
 */
export function hasCachedTranslation(
  schemeName: string,
  language: Language | OldLanguageType
): boolean {
  const key = generateCacheKey(schemeName);
  const languageCache = translationCache.get(key);
  return languageCache?.has(language) || false;
}

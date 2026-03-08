// app/lib/languageCompat.ts
// Backward compatibility layer for language codes

import {
  getDisplayLanguageName,
  normalizeLanguageCode,
  SUPPORTED_LANGUAGE_OPTIONS,
  type SupportedLanguageCode,
} from "@/app/lib/languageConfig";

export type OldLanguageType = "English" | "Hindi" | "Telugu" | "Tamil";
export type NewLanguageType = SupportedLanguageCode;

/**
 * Map old language names to new language codes
 */
export function mapOldToNewLanguage(
  oldLang: OldLanguageType | NewLanguageType | string
): NewLanguageType {
  return normalizeLanguageCode(oldLang);
}

/**
 * Map new language codes to display names
 */
export function mapNewToOldLanguage(newLang: NewLanguageType): string {
  return getDisplayLanguageName(newLang);
}

/**
 * Check if a language value is valid (old or new format)
 */
export function isValidLanguage(lang: any): lang is OldLanguageType | NewLanguageType {
  if (typeof lang !== "string") {
    return false;
  }

  const normalized = lang.trim().toLowerCase();
  return SUPPORTED_LANGUAGE_OPTIONS.some(
    (option) => option.code === normalized || option.label.toLowerCase() === normalized
  );
}

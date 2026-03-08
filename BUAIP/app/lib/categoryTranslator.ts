// app/lib/categoryTranslator.ts

/**
 * Category Translation Mapping Layer
 * Maps raw CSV category names to translation keys for multilingual support
 */

import type { Language } from "./languageContext";
import { getTranslation } from "./translations";

/**
 * Maps English category names from dataset to translation keys
 * This ensures category labels are properly translated across languages
 */
const CATEGORY_TO_KEY_MAP: Record<string, string> = {
  "Agriculture & Allied Activities": "agriculture",
  "Disability Support (Divyang Schemes)": "disability",
  "Education & Scholarships": "education",
  "Health & Public Health": "health",
  "SC/ST/OBC Welfare": "sc_st_obc",
  "Senior Citizen Welfare": "senior",
  "Women Empowerment & Child Welfare": "women_child",
};

/**
 * Reverse mapping from key to English name
 */
const KEY_TO_ENGLISH_MAP: Record<string, string> = Object.entries(
  CATEGORY_TO_KEY_MAP
).reduce((acc, [english, key]) => {
  acc[key] = english;
  return acc;
}, {} as Record<string, string>);

/**
 * Get translation key from CSV category name
 * 
 * @param categoryName - Raw category name from CSV (English)
 * @returns Translation key (e.g., "agriculture", "education")
 */
export function getCategoryKey(categoryName: string): string {
  return CATEGORY_TO_KEY_MAP[categoryName] || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

/**
 * Get translated category name for display
 * 
 * @param categoryName - Raw category name from CSV or translation key
 * @param language - Target language
 * @returns Translated category name
 */
export function getTranslatedCategoryName(
  categoryName: string,
  language: Language
): string {
  // Get the key (handles both English name and key input)
  const key = CATEGORY_TO_KEY_MAP[categoryName] || categoryName;
  
  // Get translation using the categories prefix
  const translationKey = `categories.${key}`;
  return getTranslation(translationKey, language);
}

/**
 * Get English name from translation key
 * 
 * @param key - Translation key (e.g., "agriculture")
 * @returns English category name
 */
export function getCategoryEnglishName(key: string): string {
  return KEY_TO_ENGLISH_MAP[key] || key;
}

/**
 * Get all available category keys
 * 
 * @returns Array of all category keys
 */
export function getAllCategoryKeys(): string[] {
  return Object.values(CATEGORY_TO_KEY_MAP);
}

/**
 * Check if a category name or key is valid
 * 
 * @param nameOrKey - Category name or key to validate
 * @returns True if valid, false otherwise
 */
export function isValidCategory(nameOrKey: string): boolean {
  return (
    Object.keys(CATEGORY_TO_KEY_MAP).includes(nameOrKey) ||
    Object.values(CATEGORY_TO_KEY_MAP).includes(nameOrKey)
  );
}

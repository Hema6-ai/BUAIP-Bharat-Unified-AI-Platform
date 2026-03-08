/**
 * app/lib/translations.ts
 * 
 * DEPRECATED LEGACY FILE - DO NOT USE FOR NEW CODE
 * 
 * All active translations have been consolidated into languageContext.tsx
 * This file is kept ONLY for backward compatibility type exports and legacy API routes
 * 
 * Usage: Only imported by categoryTranslator.ts for the getTranslation stub function
 */

export type OldLanguageType = "English" | "Hindi" | "Telugu" | "Tamil";

/**
 * Stub function for backward compatibility
 * Returns the key itself as fallback
 * All actual translations should use languageContext.tsx t() function
 */
export function getTranslation(key: string, language: OldLanguageType | string): string {
  return key;
}

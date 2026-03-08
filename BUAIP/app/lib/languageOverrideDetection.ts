/**
 * Language Override Detection System
 * 
 * Detects when users explicitly request responses in a different language
 * Patterns: "explain in English", "say in Hindi", "translate to Spanish", etc.
 * 
 * After override response, system auto-reverts to selected UI language
 */

import { SupportedLanguageCode, SUPPORTED_LANGUAGE_OPTIONS } from '@/app/lib/languageConfig';

interface LanguageOverrideResult {
  hasOverride: boolean;
  overrideLanguage?: SupportedLanguageCode;
  confidence: number;
  matchedPhrase?: string;
}

/**
 * Explicit patterns users might use to request language override
 */
const OVERRIDE_PATTERNS = [
  // "explain in X", "say in X", "respond in X", etc.
  /\b(?:explain|tell|write|say|respond|answer|reply|describe|give|provide|show|list|outline|summarize|give me|provide me)\s+(?:in|with|using|through)?\s+([a-z\s-]+)(?:\s+(?:language|translation|version))?\b/i,
  
  // "translate to X"
  /\b(?:translate|convert|switch|change)\s+(?:to|into)\s+([a-z\s-]+)\b/i,
  
  // "X version", "X answer", "X response"
  /\b([a-z\s-]+)\s+(?:version|answer|response|translation|explanation|description|version)\b/i,
  
  // "use X", "speak X", "language X"
  /\b(?:use|speak|language|in)\s+([a-z\s-]+)\b/i,
  
  // Direct requests: "English please", "Hindi language", etc.
  /\b([a-z\s-]+)\s+(?:please|language|translation)\b/i,
];

/**
 * Create lookup maps for language names and aliases
 */
const languageNameMap = new Map<string, SupportedLanguageCode>();
const languageAliasMap = new Map<string, SupportedLanguageCode>();

// Initialize maps
for (const option of SUPPORTED_LANGUAGE_OPTIONS) {
  // Add main language name
  languageNameMap.set(option.label.toLowerCase(), option.code);
  
  // Add aliases if any
  if ('aliases' in option && option.aliases) {
    for (const alias of option.aliases) {
      languageAliasMap.set(alias.toLowerCase(), option.code);
    }
  }
  
  // Add common variations
  const parts = option.label.split('(');
  if (parts.length > 1) {
    // "Chinese (Simplified)" -> add "Chinese" and "Simplified"
    languageNameMap.set(parts[0].trim().toLowerCase(), option.code);
    const simplified = parts[1].replace(')', '').trim();
    languageNameMap.set(simplified.toLowerCase(), option.code);
  }
}

/**
 * Resolve a language name to language code
 */
function resolveLanguageName(name: string): SupportedLanguageCode | null {
  const normalized = name.trim().toLowerCase();
  
  // Check exact match in language names
  if (languageNameMap.has(normalized)) {
    return languageNameMap.get(normalized)!;
  }
  
  // Check aliases
  if (languageAliasMap.has(normalized)) {
    return languageAliasMap.get(normalized)!;
  }
  
  // Check if it's a language code directly
  if (SUPPORTED_LANGUAGE_OPTIONS.some(opt => opt.code === normalized)) {
    return normalized as SupportedLanguageCode;
  }
  
  return null;
}

/**
 * Detect if user is requesting a language override
 * Returns the requested language code if found, null otherwise
 */
export function detectLanguageOverride(userQuery: string): LanguageOverrideResult {
  if (!userQuery || userQuery.trim().length === 0) {
    return { hasOverride: false, confidence: 0 };
  }
  
  // Try each pattern
  for (const pattern of OVERRIDE_PATTERNS) {
    const match = userQuery.match(pattern);
    if (match) {
      const languageName = match[1];
      const resolvedLang = resolveLanguageName(languageName);
      
      if (resolvedLang) {
        return {
          hasOverride: true,
          overrideLanguage: resolvedLang,
          confidence: 0.95, // High confidence for explicit requests
          matchedPhrase: match[0],
        };
      }
    }
  }
  
  // No override detected
  return { hasOverride: false, confidence: 0 };
}

/**
 * Extract the actual question from a query that includes language override
 * 
 * Example: "Explain GST in English" -> "Explain GST"
 */
export function extractBaseQuery(userQuery: string): string {
  // Remove common override patterns from the query
  let baseQuery = userQuery;
  
  // Remove "explain in X language" patterns
  baseQuery = baseQuery.replace(
    /\b(?:explain|tell|write|say|respond|answer|reply)\s+(?:in|with|using|through)?\s+(?:[a-z\s-]+)(?:\s+language)?\b/i,
    ''
  );
  
  // Remove "translate to X" patterns
  baseQuery = baseQuery.replace(
    /\b(?:translate|convert|switch|change)\s+(?:to|into)\s+[a-z\s-]+\b/i,
    ''
  );
  
  // Remove "use X language" patterns
  baseQuery = baseQuery.replace(
    /\b(?:use|speak)\s+[a-z\s-]+\s+(?:language|translation)?\b/i,
    ''
  );
  
  return baseQuery.trim();
}

/**
 * Get human-readable language name
 */
export function getLanguageLabel(code: SupportedLanguageCode): string {
  const option = SUPPORTED_LANGUAGE_OPTIONS.find(opt => opt.code === code);
  return option ? option.label : code;
}

/**
 * Check if a language override is different from selected language
 */
export function isOverrideDifferent(
  selectedLanguage: SupportedLanguageCode,
  overrideLanguage: SupportedLanguageCode,
): boolean {
  return selectedLanguage !== overrideLanguage;
}

/**
 * Build context message about language override
 * Used for AI to understand the override situation
 */
export function buildLanguageOverrideContext(
  selectedLanguage: SupportedLanguageCode,
  overrideLanguage: SupportedLanguageCode,
): string {
  const selectedLabel = getLanguageLabel(selectedLanguage);
  const overrideLabel = getLanguageLabel(overrideLanguage);
  
  return `
[LANGUAGE OVERRIDE DETECTED]
User's selected UI language: ${selectedLabel}
User explicitly requested this response in: ${overrideLabel}

IMPORTANT: 
- Respond ENTIRELY in ${overrideLabel} for this response only.
- After this response, the system will revert to ${selectedLabel}.
- Do NOT mention the language override to the user.
- Just provide the response in the requested language.
`;
}

/**
 * Format system prompt instruction for normal operation (no override)
 */
export function buildNormalLanguageInstruction(selectedLanguage: SupportedLanguageCode): string {
  const languageLabel = getLanguageLabel(selectedLanguage);
  
  return `
[LANGUAGE CONTROL]
The user's interface language is: ${languageLabel}

RESPONSE RULES:
1. Always respond in ${languageLabel} UNLESS the user explicitly requests another language
2. Examples of explicit language requests:
   - "explain in English"
   - "say in Hindi"
   - "translate to Spanish"
   - "respond in French"
3. If user explicitly requests another language, respond ONLY in that language for that response
4. After responding in an override language, revert to ${languageLabel} for future responses
5. If user does NOT explicitly request another language, respond in ${languageLabel} only
`;
}

/**
 * Detect patterns where user might want multilingual responses
 * (This is prevented - users get one language per response)
 */
export function preventCodeSwitching(userQuery: string): boolean {
  // Check if query contains mixed script text (would indicate code-switching request)
  const devanagariCount = (userQuery.match(/[\u0900-\u097F]/g) || []).length;
  const latinCount = (userQuery.match(/[a-zA-Z]/g) || []).length;
  const teluguCount = (userQuery.match(/[\u0C60-\u0C7F]/g) || []).length;
  const tamilCount = (userQuery.match(/[\u0B80-\u0BFF]/g) || []).length;
  
  // If multiple scripts are present AND it's NOT just a single language with some numerals,
  // it might be a code-switching attempt (which we prevent)
  const scriptCount = [
    devanagariCount > 0 ? 1 : 0,
    latinCount > 0 ? 1 : 0,
    teluguCount > 0 ? 1 : 0,
    tamilCount > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  
  // Allow mixed scripts only if it's a language override request
  // Otherwise prevent code-switching
  return scriptCount > 2;
}

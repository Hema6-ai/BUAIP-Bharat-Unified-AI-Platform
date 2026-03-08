/**
 * System Prompt Builder with Language Enforcement
 * 
 * Adds language context to AI system prompts to enforce:
 * 1. Default: Selected UI language for all responses
 * 2. Override: Different language if user explicitly requests it
 * 3. Auto-revert: Return to selected language for next response
 */

import { SupportedLanguageCode, SUPPORTED_LANGUAGE_OPTIONS } from '@/app/lib/languageConfig';

interface LanguagePromptOptions {
  selectedLanguage: SupportedLanguageCode;
  responseLanguage?: SupportedLanguageCode;
  hasOverride?: boolean;
  includeDetectionNote?: boolean;
}

/**
 * Get language name for display in system prompts
 */
function getLanguageName(code: SupportedLanguageCode): string {
  const option = SUPPORTED_LANGUAGE_OPTIONS.find(opt => opt.code === code);
  return option ? option.label : code;
}

/**
 * Build system prompt section for language enforcement
 * Shows which language should be used for this response
 */
export function buildLanguageSystemPrompt(options: LanguagePromptOptions): string {
  const {
    selectedLanguage,
    responseLanguage = selectedLanguage,
    hasOverride = false,
    includeDetectionNote = true,
  } = options;

  const selectedLabel = getLanguageName(selectedLanguage);
  const responseLabel = getLanguageName(responseLanguage);

  if (hasOverride && responseLanguage !== selectedLanguage) {
    // User explicitly requested a different language
    return `
[LANGUAGE ENFORCEMENT - OVERRIDE MODE]
Default interface language: ${selectedLabel}
User explicitly requested: ${responseLabel}

CRITICAL INSTRUCTIONS:
1. Respond ENTIRELY in ${responseLabel} for this message only
2. Do NOT mix languages or code-switch
3. Do NOT mention the language override to the user
4. After this response, the system will revert to ${selectedLabel}
5. Provide complete information in the requested language
`;
  }

  // Normal mode: use selected language
  return `
[LANGUAGE ENFORCEMENT - NORMAL MODE]
Interface language: ${selectedLabel}

CRITICAL INSTRUCTIONS:
1. Always respond in ${selectedLabel}
2. Do NOT use other languages unless user explicitly requests one
3. Examples of explicit language override requests:
   - "explain in English"
   - "respond in Spanish"
   - "translate this to French"
   - "say in Hindi"
4. If user does NOT explicitly request another language, use ${selectedLabel} only
5. Do NOT code-switch or mix languages
6. Provide complete, clear responses in ${selectedLabel}
${includeDetectionNote ? `
NOTE: We automatically detect the user's input language but you should
still respond in ${selectedLabel} unless they explicitly request otherwise.
` : ''}
`;
}

/**
 * Enrich an existing system prompt with language instructions
 * Use when adding language enforcement to existing engine prompts
 */
export function enrichSystemPromptWithLanguageControl(
  existingPrompt: string,
  languageOptions: LanguagePromptOptions,
): string {
  const languageSection = buildLanguageSystemPrompt(languageOptions);
  
  return `${existingPrompt}

${languageSection}`;
}

/**
 * Build a brief language instruction for inline inclusion
 * Use this for compact prompts or when space is limited
 */
export function buildBriefLanguageInstruction(
  selectedLanguage: SupportedLanguageCode,
  responseLanguage?: SupportedLanguageCode,
): string {
  const actualResponse = responseLanguage || selectedLanguage;
  const label = getLanguageName(actualResponse);
  
  if (actualResponse !== selectedLanguage) {
    return `Respond entirely in ${label}.`;
  }
  
  return `Respond entirely in ${label}. Unless the user explicitly requests another language.`;
}

/**
 * Get a note about language detection for logging/debugging
 */
export function getLanguageDetectionNote(
  selectedLanguage: SupportedLanguageCode,
  detectedLanguage: SupportedLanguageCode,
  hasOverride: boolean,
): string {
  const selectedLabel = getLanguageName(selectedLanguage);
  const detectedLabel = getLanguageName(detectedLanguage);

  if (hasOverride) {
    return `[Language] User selected: ${selectedLabel}, Input detected as: ${detectedLabel}, Override requested`;
  }

  if (selectedLanguage !== detectedLanguage) {
    return `[Language] User selected: ${selectedLabel}, Input detected as: ${detectedLabel}, Using selected language`;
  }

  return `[Language] User selected: ${selectedLabel}, Input matches selection`;
}

/**
 * Create a user-facing message about language switching
 * Show when language override is detected
 */
export function getUserMessageAboutLanguageSwitch(
  responseLanguage: SupportedLanguageCode,
): string {
  const label = getLanguageName(responseLanguage);
  
  // Return empty string - don't inform user about language switching
  // Just silently switch (better UX)
  return '';
}

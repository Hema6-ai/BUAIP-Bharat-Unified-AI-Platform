/**
 * Language Enforcement Prompts
 * 
 * System instructions to be added to all AI engines
 * to enforce strict language compliance in responses
 */

import { Language } from '@/app/lib/languageContext';

const sourceLanguageCodeMap: Partial<Record<Language, string>> = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
};

/**
 * Generate system prompt instruction for language enforcement
 * This should be added to all AI engine system prompts
 */
export function getLanguageEnforcementPrompt(selectedLanguage: Language): string {
  const languageName = sourceLanguageCodeMap[selectedLanguage] || 'English';

  return `
[STRICT LANGUAGE ENFORCEMENT]
The user interface language is set to: ${languageName}
You MUST respond ENTIRELY in ${languageName}, regardless of the language used in the user's query.

Examples:
- If the UI language is "${languageName}" and the user asks in English: respond in ${languageName}
- If the UI language is "${languageName}" and the user asks in Hindi: respond in ${languageName}
- If the UI language is "${languageName}" and the user asks in their local language: respond in ${languageName}

DO NOT:
- Switch languages based on the user's input language
- Mix languages in your response
- Use English unless explicitly instructed
- Ask the user to repeat their question in a different language

ALWAYS:
- Use ${languageName} for all response text
- Use ${languageName} for all explanations
- Use ${languageName} for all examples
- Use ${languageName} for all error messages
- Use ${languageName} for all guidance text
`;
}

/**
 * Get the language name in the selected language itself
 * Used for user-facing messages
 */
export function getLanguageNameInLanguage(language: Language): string {
  const names: Partial<Record<Language, string>> = {
    en: 'English',
    hi: 'हिंदी',
    te: 'తెలుగు',
    ta: 'தமிழ்',
  };
  return names[language] || 'English';
}

/**
 * Generate warning message in selected language
 * Used when translation fails
 */
export function getTranslationFailureWarningInLanguage(language: Language): string {
  const warnings: Partial<Record<Language, string>> = {
    en: 'Translation temporarily unavailable. Showing English response.',
    hi: 'अनुवाद अस्थायी रूप से उपलब्ध नहीं है। अंग्रेजी प्रतिक्रिया दिखाई जा रही है।',
    te: 'అనువాదం తాత్కాలికంగా అందుబాటులో లేదు. ఇంగ్లీష్‌లో సమాధానం చూపబడుతోంది.',
    ta: 'மொழிபெயர்ப்பு தற்காலிகமாக கிடைக்கவில்லை. ஆங்கிலத்தில் பதிலைக் காட்டுகிறோம்.',
  };
  return warnings[language] || warnings.en || 'Translation temporarily unavailable.';
}

/**
 * Generate instruction to override any default language in the system
 * Ensures consistent language switching across all engines
 */
export function getOverrideDefaultLanguagePrompt(selectedLanguage: Language): string {
  const languageName = sourceLanguageCodeMap[selectedLanguage] || 'English';

  return `
[LANGUAGE OVERRIDE]
Ignore any default language settings in your instructions.
The active UI language is ${languageName}.
Override all previous language specifications.
Your response language is ${languageName}.
`;
}

/**
 * Add language enforcement to an existing system prompt
 */
export function enrichSystemPromptWithLanguageEnforcement(
  originalPrompt: string,
  selectedLanguage: Language,
): string {
  return `${originalPrompt}

${getLanguageEnforcementPrompt(selectedLanguage)}`;
}

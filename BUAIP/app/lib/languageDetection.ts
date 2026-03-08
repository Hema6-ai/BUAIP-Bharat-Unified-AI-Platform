/**
 * Language Detection & Translation Utilities
 * 
 * Implements the BUAIP multilingual architecture:
 * - Detect user query language
 * - Translate to internal reasoning language (English)
 * - Translate from English to UI language
 * - Enforce strict language compliance
 */

import { Language } from '@/app/lib/languageContext';

// Language code mappings for AWS Translate
const languageCodeMap: Partial<Record<Language, string>> = {
  en: 'en',
  hi: 'hi',
  te: 'te',
  ta: 'ta',
};

/**
 * Language-specific detection patterns
 * Used to identify language of user input without external services
 */
interface LanguagePatterns {
  scripts: RegExp;
  commonWords: string[];
  confidence: number;
}

const languagePatterns: Partial<Record<Language, LanguagePatterns>> = {
  en: {
    scripts: /[a-zA-Z]/,
    commonWords: ['the', 'a', 'is', 'what', 'how', 'why', 'where', 'can', 'do', 'i'],
    confidence: 0,
  },
  hi: {
    scripts: /[\u0900-\u097F]/,  // Devanagari script
    commonWords: ['क्या', 'कैसे', 'क्यों', 'है', 'हो', 'मुझे', 'मैं', 'आप', 'यह', 'वह'],
    confidence: 90,
  },
  te: {
    scripts: /[\u0C60-\u0C7F]/,  // Telugu script
    commonWords: ['ఎంచుకోండి', 'ఎలా', 'ఉన్న', 'ఈ', 'ఆ', 'నేను', 'మీరు', 'ఏమి', 'ఎక్కడ', 'ఎప్పుడు'],
    confidence: 90,
  },
  ta: {
    scripts: /[\u0B80-\u0BFF]/,  // Tamil script
    commonWords: ['என்ன', 'எப்படி', 'யார்', 'எங்கே', 'எப்போது', 'நான்', 'நீ', 'இது', 'அது', 'இருக்கு'],
    confidence: 90,
  },
};

/**
 * Detect language of user input
 * Returns detected language code and confidence
 */
export function detectLanguage(text: string): {
  language: Language;
  confidence: number;
  textToTranslate: string | null;
} {
  const trimmedText = text.trim();
  
  // Score each language based on script detection
  const scores: Partial<Record<Language, number>> = {
    en: 0,
    hi: 0,
    te: 0,
    ta: 0,
  };

  let totalChars = 0;

  // Script-based detection
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    const matches = trimmedText.match(patterns.scripts);
    if (matches) {
      scores[lang as Language] = matches.length;
      totalChars += matches.length;
    }
  }

  // If nothing detected, assume English
  if (totalChars === 0) {
    return {
      language: 'en',
      confidence: 50,
      textToTranslate: null,
    };
  }

  // Find language with highest score
  const detectedLang = (
    Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  ) as Language;

  // Calculate confidence as percentage
  const confidence = Math.round(((scores[detectedLang] ?? 0) / totalChars) * 100);

  return {
    language: detectedLang,
    confidence: Math.min(confidence, 95), // Cap at 95
    textToTranslate: detectedLang !== 'en' ? trimmedText : null,
  };
}

/**
 * Translate user query to English for internal reasoning
 * This is the canonical reasoning language
 */
export async function translateUserQueryToEnglish(
  text: string,
  detectedLanguage: Language,
): Promise<string> {
  // If already in English, no translation needed
  if (detectedLanguage === 'en') {
    return text;
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLanguage: detectedLanguage,
        targetLanguage: 'en',
      }),
    });

    if (!response.ok) {
      console.warn(`Translation failed: ${response.statusText}`);
      return text; // Return original if translation fails
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Failsafe: return original
  }
}

/**
 * Translate AI response from English to selected UI language
 * Called before displaying response to user
 */
export async function translateResponseToUILanguage(
  text: string,
  targetLanguage: Language,
): Promise<{
  translatedText: string;
  isFallback: boolean;
  warning?: string;
}> {
  // If target is English, no translation needed
  if (targetLanguage === 'en') {
    return {
      translatedText: text,
      isFallback: false,
    };
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
      }),
    });

    if (!response.ok) {
      console.warn(`Translation to ${targetLanguage} failed: ${response.statusText}`);
      return {
        translatedText: text,
        isFallback: true,
        warning: 'Translation temporarily unavailable.',
      };
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText || text,
      isFallback: false,
    };
  } catch (error) {
    console.error(`Translation error for ${targetLanguage}:`, error);
    return {
      translatedText: text,
      isFallback: true,
      warning: 'Translation temporarily unavailable.',
    };
  }
}

/**
 * Get AWS Translate language code for a BUAIP language
 */
export function getAWSLanguageCode(language: Language): string {
  return languageCodeMap[language] || 'en';
}

/**
 * Determines if a text likely contains mixed languages
 * Returns the predominant language
 */
export function detectPredominantLanguage(text: string): Language {
  const lines = text.split('\n');
  const detections = lines.map(line => detectLanguage(line));
  
  // Count occurrences of each language
  const counts: Partial<Record<Language, number>> = {
    en: 0,
    hi: 0,
    te: 0,
    ta: 0,
  };

  detections.forEach(d => {
    counts[d.language] = (counts[d.language] ?? 0) + 1;
  });

  // Return language with most lines
  return (
    Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  ) as Language;
}

/**
 * Pipeline: User Input → Reasoning → Output
 * 
 * User Input (any language)
 *   ↓
 * Translate to English (reasoning language)
 *   ↓
 * AI Reasoning & Processing
 *   ↓
 * Translate to Selected UI Language
 *   ↓
 * Display to User
 */
export async function executeMultilingualPipeline(
  userQuery: string,
  selectedUILanguage: Language,
  reasoningFunction: (englishQuery: string) => Promise<string>,
): Promise<{
  response: string;
  inputLanguage: Language;
  inputLanguageConfidence: number;
  isFallback: boolean;
  warning?: string;
}> {
  try {
    // Step 1: Detect input language
    const { language: inputLang, confidence: inputConfidence, textToTranslate } = detectLanguage(
      userQuery,
    );

    // Step 2: Translate to English for reasoning
    const englishQuery = await translateUserQueryToEnglish(userQuery, inputLang);

    // Step 3: Run reasoning in English
    const englishResponse = await reasoningFunction(englishQuery);

    // Step 4: Translate response to UI language
    const { translatedText, isFallback, warning } = await translateResponseToUILanguage(
      englishResponse,
      selectedUILanguage,
    );

    return {
      response: translatedText,
      inputLanguage: inputLang,
      inputLanguageConfidence: inputConfidence,
      isFallback,
      warning,
    };
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      response: `Error processing request: ${String(error)}`,
      inputLanguage: 'en',
      inputLanguageConfidence: 0,
      isFallback: true,
      warning: 'An error occurred during processing.',
    };
  }
}

import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { awsConfig } from '@/app/lib/aws/config';
import { detectLanguage } from '@/app/lib/aws/comprehendClient';
import {
  getCachedTranslation,
  setCachedTranslation,
} from '@/app/lib/aws/translationCache';
import {
  DEFAULT_LANGUAGE_CODE,
  getAwsTranslateTargetCode,
  getLanguageOption,
  normalizeLanguageCode,
  type SupportedLanguageCode,
} from '@/app/lib/languageConfig';
import {
  detectLanguageOverride,
  extractBaseQuery,
  buildLanguageOverrideContext,
  buildNormalLanguageInstruction,
} from '@/app/lib/languageOverrideDetection';

const translateClient = new TranslateClient({
  region: awsConfig.region,
});

export interface CanonicalInputPipelineResult {
  englishText: string;
  requestedLanguage: SupportedLanguageCode;
  responseLanguage: SupportedLanguageCode;
  detectedLanguage: SupportedLanguageCode;
  detectionScore: number;
  inputTranslated: boolean;
  inputTranslationCacheHit: boolean;
  warning?: string;
  // Language override fields
  hasLanguageOverride: boolean;
  overrideLanguage?: SupportedLanguageCode;
  baseQuery?: string;
  languageContext?: string;
}

export interface CanonicalOutputPipelineResult {
  localizedText: string;
  targetLanguage: SupportedLanguageCode;
  translated: boolean;
  cacheHit: boolean;
  warning?: string;
}

function looksLikelyEnglish(text: string): boolean {
  const normalized = (text || '').trim();
  if (!normalized) {
    return true;
  }

  // Fast heuristic: ASCII-heavy text with Latin letters is treated as English input.
  const hasLatinLetters = /[a-zA-Z]/.test(normalized);
  const hasNonAscii = /[^\x00-\x7F]/.test(normalized);
  return hasLatinLetters && !hasNonAscii;
}

async function runTranslate(
  text: string,
  sourceLanguageCode: string,
  targetLanguageCode: string
): Promise<string> {
  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: sourceLanguageCode,
    TargetLanguageCode: targetLanguageCode,
  });

  const response = await translateClient.send(command);
  return response.TranslatedText || text;
}

async function translateWithCache(params: {
  text: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
}): Promise<{ translatedText: string; cacheHit: boolean }> {
  const { text, sourceLanguageCode, targetLanguageCode } = params;

  const cacheHit = await getCachedTranslation(text, targetLanguageCode);
  if (cacheHit) {
    return {
      translatedText: cacheHit,
      cacheHit: true,
    };
  }

  const translatedText = await runTranslate(text, sourceLanguageCode, targetLanguageCode);
  await setCachedTranslation({
    sourceText: text,
    sourceLanguage: sourceLanguageCode,
    targetLanguage: targetLanguageCode,
    translatedText,
  });

  return {
    translatedText,
    cacheHit: false,
  };
}

export async function runCanonicalInputPipeline(params: {
  text: string;
  selectedLanguage?: string;
}): Promise<CanonicalInputPipelineResult> {
  const requestedLanguage = normalizeLanguageCode(params.selectedLanguage);
  const sourceText = params.text || '';

  // STEP 1: Detect language override (if user explicitly requests different language)
  const overrideResult = detectLanguageOverride(sourceText);
  const baseQueryForProcessing = overrideResult.hasOverride ? extractBaseQuery(sourceText) : sourceText;

  if (!sourceText.trim()) {
    return {
      englishText: sourceText,
      requestedLanguage,
      responseLanguage: requestedLanguage,
      detectedLanguage: DEFAULT_LANGUAGE_CODE,
      detectionScore: 0,
      inputTranslated: false,
      inputTranslationCacheHit: false,
      hasLanguageOverride: false,
      languageContext: buildNormalLanguageInstruction(requestedLanguage),
    };
  }

  let detectedLanguage = DEFAULT_LANGUAGE_CODE;
  let detectionScore = 0;

  try {
    const detection = await detectLanguage(baseQueryForProcessing);
    detectedLanguage = normalizeLanguageCode(detection.language);
    detectionScore = detection.score;
  } catch (error) {
    console.error('[TranslationPipeline] Language detection failed. Defaulting to English:', error);
  }

  // STEP 2: Determine response language
  // If override: use override language
  // If no override: use selected UI language (strict mode)
  const responseLanguage = overrideResult.hasOverride && overrideResult.overrideLanguage
    ? overrideResult.overrideLanguage
    : requestedLanguage;

  // STEP 3: Build language context for AI
  const languageContext = overrideResult.hasOverride
    ? buildLanguageOverrideContext(requestedLanguage, responseLanguage)
    : buildNormalLanguageInstruction(requestedLanguage);

  if (looksLikelyEnglish(baseQueryForProcessing)) {
    return {
      englishText: baseQueryForProcessing,
      requestedLanguage,
      responseLanguage,
      detectedLanguage: DEFAULT_LANGUAGE_CODE,
      detectionScore: 0.99,
      inputTranslated: false,
      inputTranslationCacheHit: false,
      hasLanguageOverride: overrideResult.hasOverride,
      overrideLanguage: overrideResult.overrideLanguage,
      baseQuery: overrideResult.hasOverride ? baseQueryForProcessing : undefined,
      languageContext,
    };
  }

  if (detectedLanguage === DEFAULT_LANGUAGE_CODE) {
    return {
      englishText: baseQueryForProcessing,
      requestedLanguage,
      responseLanguage,
      detectedLanguage,
      detectionScore,
      inputTranslated: false,
      inputTranslationCacheHit: false,
      hasLanguageOverride: overrideResult.hasOverride,
      overrideLanguage: overrideResult.overrideLanguage,
      baseQuery: overrideResult.hasOverride ? baseQueryForProcessing : undefined,
      languageContext,
    };
  }

  try {
    const sourceLanguageCode = getLanguageOption(detectedLanguage).awsTranslateCode;
    const translation = await translateWithCache({
      text: baseQueryForProcessing,
      sourceLanguageCode,
      targetLanguageCode: 'en',
    });

    return {
      englishText: translation.translatedText,
      requestedLanguage,
      responseLanguage,
      detectedLanguage,
      detectionScore,
      inputTranslated: true,
      inputTranslationCacheHit: translation.cacheHit,
      hasLanguageOverride: overrideResult.hasOverride,
      overrideLanguage: overrideResult.overrideLanguage,
      baseQuery: overrideResult.hasOverride ? baseQueryForProcessing : undefined,
      languageContext,
    };
  } catch (error) {
    console.error('[TranslationPipeline] Input translation failed. Falling back to source text:', error);
    return {
      englishText: baseQueryForProcessing,
      requestedLanguage,
      responseLanguage,
      detectedLanguage,
      detectionScore,
      inputTranslated: false,
      inputTranslationCacheHit: false,
      hasLanguageOverride: overrideResult.hasOverride,
      overrideLanguage: overrideResult.overrideLanguage,
      baseQuery: overrideResult.hasOverride ? baseQueryForProcessing : undefined,
      languageContext,
      warning: 'Translation temporarily unavailable. Showing English response.',
    };
  }
}

export async function runCanonicalOutputPipeline(params: {
  englishText: string;
  targetLanguage: SupportedLanguageCode;
}): Promise<CanonicalOutputPipelineResult> {
  const normalizedTarget = normalizeLanguageCode(params.targetLanguage);
  const englishText = params.englishText || '';

  if (!englishText.trim() || normalizedTarget === DEFAULT_LANGUAGE_CODE) {
    return {
      localizedText: englishText,
      targetLanguage: normalizedTarget,
      translated: false,
      cacheHit: false,
    };
  }

  const targetLanguageCode = getAwsTranslateTargetCode(normalizedTarget);

  try {
    const translation = await translateWithCache({
      text: englishText,
      sourceLanguageCode: 'en',
      targetLanguageCode,
    });

    return {
      localizedText: translation.translatedText,
      targetLanguage: normalizedTarget,
      translated: true,
      cacheHit: translation.cacheHit,
    };
  } catch (error) {
    console.error('[TranslationPipeline] Output translation failed. Returning English response:', error);
    return {
      localizedText: englishText,
      targetLanguage: normalizedTarget,
      translated: false,
      cacheHit: false,
      warning: 'Translation temporarily unavailable. Showing English response.',
    };
  }
}

export function normalizeUserLanguage(languageInput?: string): SupportedLanguageCode {
  return normalizeLanguageCode(languageInput);
}

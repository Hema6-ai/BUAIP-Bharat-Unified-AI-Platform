/**
 * Translation API Route
 * 
 * Handles bidirectional translation:
 * - User input to English (for reasoning)
 * - English to UI language (for display)
 * 
 * Uses AWS Translate with caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateWithCache } from '@/app/lib/aws/translationCache';
import {
  DEFAULT_LANGUAGE_CODE,
  getAwsTranslateTargetCode,
  normalizeLanguageCode,
} from '@/app/lib/languageConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * POST handler for translation requests
 */
export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = (await request.json()) as TranslationRequest;

    // Validation
    if (!text || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sourceLanguage, targetLanguage' },
        { status: 400 },
      );
    }

    // If languages are the same, return original text
    if (sourceLanguage === targetLanguage) {
      return NextResponse.json(
        { translatedText: text, cached: false, sameLanguage: true },
        { status: 200 },
      );
    }

    const source = resolveAwsLanguageCode(sourceLanguage, true);
    const target = resolveAwsLanguageCode(targetLanguage, false);

    const translatedText = await translateWithCache(text, target, source);

    return NextResponse.json(
      {
        translatedText,
        cached: false,
        sameLanguage: false,
        resolvedSourceLanguage: source,
        resolvedTargetLanguage: target,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation service error', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * Resolve BUAIP language codes into AWS Translate codes.
 * Falls back to English for unknown values.
 */
function resolveAwsLanguageCode(language: string, allowAuto: boolean): string {
  const raw = (language || '').trim();
  if (!raw) {
    return getAwsTranslateTargetCode(DEFAULT_LANGUAGE_CODE);
  }

  if (allowAuto && raw.toLowerCase() === 'auto') {
    return 'auto';
  }

  const normalized = normalizeLanguageCode(raw);
  return getAwsTranslateTargetCode(normalized);
}

/**
 * GET handler - Health check
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      service: 'BUAIP Translation Service',
      version: '2.0.0',
      supportedLanguages: 'All languages configured in app/lib/languageConfig.ts',
      status: 'active',
    },
    { status: 200 },
  );
}

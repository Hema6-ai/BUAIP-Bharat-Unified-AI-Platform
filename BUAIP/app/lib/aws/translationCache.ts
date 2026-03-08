import crypto from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const CACHE_TTL_MS = 60 * 60 * 1000;
const TRANSLATION_CACHE_TABLE =
  process.env.DYNAMODB_TRANSLATION_CACHE_TABLE || 'buaip-translation-cache';

const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});

interface TranslationCacheRecord {
  cacheKey: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
  expiresAt: number;
  ttlEpoch: number;
}

const inMemoryCache = new Map<string, TranslationCacheRecord>();

const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export function buildTranslationCacheKey(text: string, languageCode: string): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `${hash}:${languageCode.toLowerCase()}`;
}

function getMemoryCache(cacheKey: string): string | null {
  const item = inMemoryCache.get(cacheKey);
  if (!item) {
    return null;
  }

  if (Date.now() > item.expiresAt) {
    inMemoryCache.delete(cacheKey);
    return null;
  }

  return item.translatedText;
}

function setMemoryCache(record: TranslationCacheRecord): void {
  inMemoryCache.set(record.cacheKey, record);
}

/**
 * Simple memory-only cache functions for translation API
 * Used by the translate route for quick lookups
 */
export function getMemoryCachedTranslation(cacheKey: string): string | null {
  const item = inMemoryCache.get(cacheKey);
  if (!item) {
    return null;
  }

  if (Date.now() > item.expiresAt) {
    inMemoryCache.delete(cacheKey);
    return null;
  }

  return item.translatedText;
}

export function setCacheTranslation(cacheKey: string, translatedText: string): void {
  const now = Date.now();
  const record: TranslationCacheRecord = {
    cacheKey,
    translatedText,
    sourceLanguage: 'auto',
    targetLanguage: 'auto',
    createdAt: now,
    expiresAt: now + CACHE_TTL_MS,
    ttlEpoch: Math.floor((now + CACHE_TTL_MS) / 1000),
  };
  setMemoryCache(record);
}

export async function getCachedTranslation(
  text: string,
  targetLanguage: string
): Promise<string | null> {
  const cacheKey = buildTranslationCacheKey(text, targetLanguage);

  const memoryHit = getMemoryCache(cacheKey);
  if (memoryHit) {
    return memoryHit;
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TRANSLATION_CACHE_TABLE,
        Key: { cacheKey },
      })
    );

    const item = result.Item as TranslationCacheRecord | undefined;
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      return null;
    }

    setMemoryCache(item);
    return item.translatedText;
  } catch (error) {
    console.error('[TranslationCache] DynamoDB read failed (non-blocking):', error);
    return null;
  }
}

export async function setCachedTranslation(params: {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
}): Promise<void> {
  const { sourceText, sourceLanguage, targetLanguage, translatedText } = params;
  const now = Date.now();
  const expiresAt = now + CACHE_TTL_MS;

  const record: TranslationCacheRecord = {
    cacheKey: buildTranslationCacheKey(sourceText, targetLanguage),
    translatedText,
    sourceLanguage,
    targetLanguage,
    createdAt: now,
    expiresAt,
    ttlEpoch: Math.floor(expiresAt / 1000),
  };

  setMemoryCache(record);

  try {
    await docClient.send(
      new PutCommand({
        TableName: TRANSLATION_CACHE_TABLE,
        Item: record,
      })
    );
  } catch (error) {
    console.error('[TranslationCache] DynamoDB write failed (non-blocking):', error);
  }
}

/**
 * Translate text with caching
 * Simple wrapper for UI translation use
 */
export async function translateWithCache(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<string> {
  // Check cache first
  const cached = await getCachedTranslation(text, targetLanguage);
  if (cached) {
    return cached;
  }

  // Translate with AWS
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage,
    });

    const response = await translateClient.send(command);
    const translatedText = response.TranslatedText || text;

    // Cache the result
    await setCachedTranslation({
      sourceText: text,
      sourceLanguage,
      targetLanguage,
      translatedText,
    });

    return translatedText;
  } catch (error) {
    console.error(`[TranslationCache] Translation failed for ${sourceLanguage} → ${targetLanguage}:`, error);
    return text; // Fallback to original text
  }
}

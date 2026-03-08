/**
 * AWS Translate Client Wrapper
 * Real-time language translation
 */

import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { awsConfig } from "./config";

export const translateClient = new TranslateClient({
  region: awsConfig.region,
});

export type LanguageCode = string;

/**
 * Translate text from source to target language
 */
export async function translateText(
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string> {
  try {
    if (sourceLanguage === targetLanguage) {
      return text;
    }

    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage,
    });

    const response = await translateClient.send(command);
    return response.TranslatedText || text;
  } catch (error) {
    console.error("Translate error:", error);
    throw error;
  }
}

/**
 * Translate to English for processing
 */
export async function translateToEnglish(
  text: string,
  sourceLanguage: LanguageCode
): Promise<string> {
  return translateText(text, sourceLanguage, "en");
}

/**
 * Translate from English to target language
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: LanguageCode
): Promise<string> {
  return translateText(text, "en", targetLanguage);
}

/**
 * Batch translate multiple texts
 */
export async function translateBatch(
  texts: string[],
  sourceLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string[]> {
  const results = await Promise.all(
    texts.map((text) => translateText(text, sourceLanguage, targetLanguage))
  );
  return results;
}

export default translateClient;

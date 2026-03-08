/**
 * AWS Comprehend Client Wrapper
 * Natural Language Processing
 */

import {
  ComprehendClient,
  DetectDominantLanguageCommand,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
  DetectEntitiesCommand,
} from "@aws-sdk/client-comprehend";
import { awsConfig } from "./config";

export const comprehendClient = new ComprehendClient({
  region: awsConfig.region,
});

export interface LanguageDetection {
  language: string;
  score: number;
}

export interface SentimentResult {
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  scores: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
}

export interface KeyPhrase {
  text: string;
  score: number;
  beginOffset: number;
  endOffset: number;
}

export interface Entity {
  type: string;
  text: string;
  score: number;
  beginOffset: number;
  endOffset: number;
}

/**
 * Detect dominant language in text
 */
export async function detectLanguage(text: string): Promise<LanguageDetection> {
  try {
    const command = new DetectDominantLanguageCommand({
      Text: text,
    });

    const response = await comprehendClient.send(command);
    const languages = response.Languages || [];

    if (languages.length === 0) {
      return { language: "en", score: 0 };
    }

    const dominant = languages[0];
    return {
      language: dominant.LanguageCode || "en",
      score: dominant.Score || 0,
    };
  } catch (error) {
    console.error("Detect language error:", error);
    throw error;
  }
}

/**
 * Analyze sentiment of text
 */
export async function analyzeSentiment(
  text: string,
  languageCode: string = "en"
): Promise<SentimentResult> {
  try {
    const command = new DetectSentimentCommand({
      Text: text,
      LanguageCode: languageCode as any,
    });

    const response = await comprehendClient.send(command);

    return {
      sentiment:
        (response.Sentiment as
          | "POSITIVE"
          | "NEGATIVE"
          | "NEUTRAL"
          | "MIXED") || "NEUTRAL",
      scores: {
        positive: response.SentimentScore?.Positive || 0,
        negative: response.SentimentScore?.Negative || 0,
        neutral: response.SentimentScore?.Neutral || 0,
        mixed: response.SentimentScore?.Mixed || 0,
      },
    };
  } catch (error) {
    console.error("Analyze sentiment error:", error);
    throw error;
  }
}

/**
 * Extract key phrases from text
 */
export async function extractKeyPhrases(
  text: string,
  languageCode: string = "en"
): Promise<KeyPhrase[]> {
  try {
    const command = new DetectKeyPhrasesCommand({
      Text: text,
      LanguageCode: languageCode as any,
    });

    const response = await comprehendClient.send(command);

    return (response.KeyPhrases || []).map((kp) => ({
      text: kp.Text || "",
      score: kp.Score || 0,
      beginOffset: kp.BeginOffset || 0,
      endOffset: kp.EndOffset || 0,
    }));
  } catch (error) {
    console.error("Extract key phrases error:", error);
    throw error;
  }
}

/**
 * Extract named entities from text
 */
export async function extractEntities(
  text: string,
  languageCode: string = "en"
): Promise<Entity[]> {
  try {
    const command = new DetectEntitiesCommand({
      Text: text,
      LanguageCode: languageCode as any,
    });

    const response = await comprehendClient.send(command);

    return (response.Entities || []).map((entity) => ({
      type: entity.Type || "OTHER",
      text: entity.Text || "",
      score: entity.Score || 0,
      beginOffset: entity.BeginOffset || 0,
      endOffset: entity.EndOffset || 0,
    }));
  } catch (error) {
    console.error("Extract entities error:", error);
    throw error;
  }
}

/**
 * Analyze text comprehensively
 */
export async function analyzeText(
  text: string,
  languageCode?: string
): Promise<{
  language: LanguageDetection;
  sentiment: SentimentResult;
  keyPhrases: KeyPhrase[];
  entities: Entity[];
}> {
  try {
    const lang =
      languageCode ||
      (await detectLanguage(text)).language ||
      "en";

    const [sentiment, keyPhrases, entities] = await Promise.all([
      analyzeSentiment(text, lang),
      extractKeyPhrases(text, lang),
      extractEntities(text, lang),
    ]);

    return {
      language: { language: lang, score: 1 },
      sentiment,
      keyPhrases,
      entities,
    };
  } catch (error) {
    console.error("Analyze text error:", error);
    throw error;
  }
}

export default comprehendClient;

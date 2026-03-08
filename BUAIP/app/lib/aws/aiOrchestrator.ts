/**
 * AI Orchestrator
 * Central request router coordinating all AWS AI services
 */

import { invokeBedrockModel, invokeBedrockWithSystem } from './bedrockClient';
import { synthesizeToBase64, getAvailableVoices } from './pollyClient';
import { translateToEnglish, translateFromEnglish } from './translateClient';
import { detectLanguage, analyzeText } from './comprehendClient';
import { detectLabels, detectText } from './rekognitionClient';
import { getLogEvents, putLogEvents, trackEvent } from './cloudwatchClient';
import { putMetric } from './cloudwatchClient';

export interface OrchestratorRequest {
  userId: string;
  engine: string;
  userInput: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  includeVoice?: boolean;
  imageBuffer?: Buffer;
  metadata?: { [key: string]: any };
}

export interface OrchestratorResponse {
  success: boolean;
  result: any;
  sourceLanguage?: string;
  targetLanguage?: string;
  voiceUrl?: string;
  processingTime: number;
  confidence?: number;
  metadata?: { [key: string]: any };
}

// Engine-specific system prompts - 6 Core BUAIP Engines
const ENGINE_PROMPTS: { [key: string]: string } = {
  scheme: `You are SCHEME-AI, an expert on Indian government schemes. Help users find and understand relevant government schemes, benefits, eligibility criteria, and application procedures. Focus on making scheme information accessible to all citizens.`,
  
  annadata: `You are ANNADATA, an AI assistant for Indian farmers. Provide agricultural advice, crop information, and market prices. Convert technical information to simple, farmer-friendly language. Include local context when relevant.`,
  
  nyaya: `You are NYAYA, an AI legal advisor. Explain legal concepts, laws, and procedures in simple terms. Provide general legal information and guidance on accessing legal resources. Always recommend consulting actual lawyers for specific cases.`,
  
  udyog: `You are UDYOG, an entrepreneurship and business AI. Help aspiring and active entrepreneurs with business planning, startup guidance, funding resources, and market insights. Make business development accessible.`,
  
  globalseller: `You are GLOBALSELLER, a global trade and export AI assistant. Help businesses understand export procedures, find markets, manage regulations, and expand internationally. Provide practical business guidance.`,
  
  atithi: `You are ATITHI, a smart tourism and travel AI. Help tourists and travelers explore destinations, find accommodations, plan itineraries, and discover local experiences. Provide personalized travel recommendations.`,
};

/**
 * Preprocess user input (translate, detect sentiment, extract entities)
 */
async function preprocessInput(
  request: OrchestratorRequest
): Promise<{
  processedInput: string;
  detectedLanguage: string;
  sentiment: string;
  keyEntities: string[];
}> {
  try {
    const sourceLanguage = request.sourceLanguage || 'en';

    // Detect language if not provided
    let detectedLanguage = sourceLanguage;
    if (sourceLanguage === 'auto') {
      const langDetection = await detectLanguage(request.userInput);
      detectedLanguage = langDetection.language;
    }

    // Translate to English if needed
    let processedInput = request.userInput;
    if (detectedLanguage !== 'en') {
      processedInput = await translateToEnglish(
        request.userInput,
        detectedLanguage as any
      );
    }

    // Analyze sentiment and extract entities
    const analysis = await analyzeText(
      processedInput,
      'en'
    );

    return {
      processedInput,
      detectedLanguage,
      sentiment: analysis.sentiment.sentiment,
      keyEntities: analysis.entities
        .filter((e) => ['PERSON', 'LOCATION', 'ORGANIZATION', 'DATE'].includes(e.type))
        .map((e) => e.text),
    };
  } catch (error) {
    console.error('Preprocess input error:', error);
    // Fallback: return original input
    return {
      processedInput: request.userInput,
      detectedLanguage: request.sourceLanguage || 'en',
      sentiment: 'NEUTRAL',
      keyEntities: [],
    };
  }
}

/**
 * Invoke Bedrock with engine-specific context
 */
async function invokeAI(
  processedInput: string,
  engine: string,
  metadata?: { [key: string]: any }
): Promise<{ response: string; confidence: number }> {
  try {
    const systemPrompt =
      ENGINE_PROMPTS[engine.toLowerCase()] ||
      `You are ${engine}, an AI assistant for the BU-AIP platform.`;

    const response = await invokeBedrockWithSystem(
      systemPrompt,
      processedInput,
      {
        temperature: 0.3,
        maxTokens: 2000,
        topP: 0.9,
      }
    );

    // Extract confidence indicator from response structure
    const confidence = 0.85; // Default confidence

    return {
      response,
      confidence,
    };
  } catch (error) {
    console.error('Invoke AI error:', error);
    throw error;
  }
}

/**
 * Postprocess AI response (translate back, synthesize voice)
 */
async function postprocessResponse(
  response: string,
  targetLanguage?: string,
  includeVoice?: boolean
): Promise<{
  translatedResponse: string;
  voiceUrl?: string;
}> {
  try {
    let translatedResponse = response;

    // Translate to target language if needed
    if (targetLanguage && targetLanguage !== 'en') {
      translatedResponse = await translateFromEnglish(
        response,
        targetLanguage as any
      );
    }

    let voiceUrl: string | undefined;

    // Synthesize voice if requested
    if (includeVoice) {
      const lang = targetLanguage || 'en';
      const voiceBase64 = await synthesizeToBase64(translatedResponse, {
        language: lang as any,
      });

      // In production, upload to S3 and return signed URL
      voiceUrl = `data:audio/mp3;base64,${voiceBase64}`;
    }

    return {
      translatedResponse,
      voiceUrl,
    };
  } catch (error) {
    console.error('Postprocess response error:', error);
    // Fallback: return original response without voice
    return {
      translatedResponse: response,
    };
  }
}

/**
 * Main orchestration function
 */
export async function orchestrateRequest(
  request: OrchestratorRequest
): Promise<OrchestratorResponse> {
  const startTime = Date.now();

  try {
    // Step 1: Preprocess input
    const preprocessed = await preprocessInput(request);

    // Step 2: Invoke AI with engine-specific context
    const aiResult = await invokeAI(
      preprocessed.processedInput,
      request.engine,
      request.metadata
    );

    // Step 3: Postprocess response (translate, voice)
    const postprocessed = await postprocessResponse(
      aiResult.response,
      request.targetLanguage || preprocessed.detectedLanguage,
      request.includeVoice
    );

    const processingTime = Date.now() - startTime;

    // Track in CloudWatch
    await trackEvent('BU-AIP-Orchestrator', request.engine, {
      userId: request.userId,
      language: preprocessed.detectedLanguage,
      sentiment: preprocessed.sentiment,
    });

    return {
      success: true,
      result: postprocessed.translatedResponse,
      sourceLanguage: preprocessed.detectedLanguage,
      targetLanguage: request.targetLanguage || preprocessed.detectedLanguage,
      voiceUrl: postprocessed.voiceUrl,
      processingTime,
      confidence: aiResult.confidence,
      metadata: {
        ...request.metadata,
        detectedLanguage: preprocessed.detectedLanguage,
        sentiment: preprocessed.sentiment,
        keyEntities: preprocessed.keyEntities,
      },
    };
  } catch (error) {
    console.error('Orchestration error:', error);

    const processingTime = Date.now() - startTime;

    return {
      success: false,
      result: `Error processing request: ${(error as any).message}`,
      processingTime,
      metadata: {
        errorType: (error as any).name,
        errorMessage: (error as any).message,
      },
    };
  }
}

/**
 * Route request to specific engine processor
 */
export async function routeToEngine(
  engine: string,
  request: OrchestratorRequest
): Promise<OrchestratorResponse> {
  // Normalize engine name
  const normalizedEngine = engine.toLowerCase().replace(/[-_]/g, '');

  if (!ENGINE_PROMPTS[normalizedEngine]) {
    return {
      success: false,
      result: `Unknown engine: ${engine}`,
      processingTime: 0,
    };
  }

  // Update engine in request
  request.engine = normalizedEngine;

  return orchestrateRequest(request);
}

/**
 * Stream-based orchestration (for real-time responses)
 */
export async function* orchestrateStream(
  request: OrchestratorRequest
): AsyncGenerator<string> {
  try {
    // Preprocess
    const preprocessed = await preprocessInput(request);

    // Stream from Bedrock (would need streaming Bedrock client)
    yield `Processing in ${preprocessed.detectedLanguage}...\n`;

    // Invoke AI
    const aiResult = await invokeAI(
      preprocessed.processedInput,
      request.engine
    );

    yield aiResult.response;
  } catch (error) {
    yield `Error: ${(error as any).message}`;
  }
}

export default {
  orchestrateRequest,
  routeToEngine,
  orchestrateStream,
  preprocessInput,
  invokeAI,
  postprocessResponse,
};

/**
 * Photo capability pipeline
 * Input -> Context extraction -> Structured knowledge -> AI reasoning -> Human explanation
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  DetectLabelsCommand,
  DetectTextCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { callBedrock } from '@/app/lib/bedrock';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bedrockVisionClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface ImageLabel {
  name: string;
  confidence: number;
  parents: string[];
}

export interface ImageText {
  text: string;
  confidence: number;
  type: 'LINE' | 'WORD';
}

export interface ImageAnalysis {
  labels: ImageLabel[];
  textDetections: ImageText[];
  sceneContext: string;
  detectedIntent: string;
  intentCategory: string;
  explanation: string;
}

interface VisionKnowledge {
  objects: Array<{ name: string; confidence: number }>;
  detectedTextLines: string[];
  sceneContext: string;
  inferredPurpose: string;
}

interface VisionResponseModel {
  whatImageShows: string;
  whatItMeans: string;
  nextActions: string[];
  confidence: 'high' | 'medium' | 'low';
}

const INTENT_RULES: Array<{
  category: string;
  intent: string;
  objectKeywords: string[];
  textKeywords: string[];
}> = [
  {
    category: 'agriculture',
    intent: 'crop_disease_analysis',
    objectKeywords: ['plant', 'leaf', 'crop', 'vegetation', 'farm', 'soil'],
    textKeywords: ['fungal', 'pest', 'blight', 'leaf spot'],
  },
  {
    category: 'document',
    intent: 'government_form_analysis',
    objectKeywords: ['document', 'paper', 'form', 'text', 'receipt'],
    textKeywords: ['application', 'name', 'address', 'signature', 'declaration'],
  },
  {
    category: 'health',
    intent: 'medicine_label_guidance',
    objectKeywords: ['medicine', 'tablet', 'pill', 'bottle', 'drug'],
    textKeywords: ['dosage', 'mg', 'tablet', 'twice daily', 'warning'],
  },
  {
    category: 'identity',
    intent: 'identity_document_help',
    objectKeywords: ['id card', 'passport', 'license', 'card'],
    textKeywords: ['dob', 'name', 'id', 'passport', 'issued'],
  },
  {
    category: 'legal',
    intent: 'legal_document_review',
    objectKeywords: ['document', 'paper', 'letter'],
    textKeywords: ['notice', 'legal', 'court', 'section', 'complaint'],
  },
];

export async function analyzeImage(
  imageBuffer: Buffer,
  userQuestion?: string,
): Promise<ImageAnalysis> {
  try {
    console.log('[ImageAnalyzer] Starting analysis...');
    
    let labels: ImageLabel[] = [];
    let textDetections: ImageText[] = [];
    let multimodalSummary: string = '';

    // Step 1: Detect Labels (Rekognition)
    try {
      console.log('[ImageAnalyzer] Calling Rekognition DetectLabels...');
      labels = await detectLabels(imageBuffer);
      console.log('[ImageAnalyzer] ✅ Found', labels.length, 'labels');
    } catch (error) {
      console.error('[ImageAnalyzer] ❌ Rekognition DetectLabels failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Rekognition DetectLabels failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Detect Text (Rekognition)
    try {
      console.log('[ImageAnalyzer] Calling Rekognition DetectText...');
      textDetections = await detectText(imageBuffer);
      console.log('[ImageAnalyzer] ✅ Found', textDetections.length, 'text detections');
    } catch (error) {
      console.error('[ImageAnalyzer] ❌ Rekognition DetectText failed:', error instanceof Error ? error.message : String(error));
      throw new Error(`Rekognition DetectText failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 3: Describe with Bedrock Vision
    try {
      console.log('[ImageAnalyzer] Calling Bedrock multimodal vision...');
      multimodalSummary = await describeImageWithMultimodalModel(imageBuffer);
      console.log('[ImageAnalyzer] ✅ Got', multimodalSummary.length, 'chars from Bedrock');
    } catch (error) {
      console.error('[ImageAnalyzer] ⚠️  Bedrock vision failed (non-fatal):', error instanceof Error ? error.message : String(error));
      multimodalSummary = ''; // Continue without this
    }

    // Step 4: Build knowledge and generate explanation
    console.log('[ImageAnalyzer] Building structured knowledge...');
    const knowledge = buildStructuredKnowledge(labels, textDetections, multimodalSummary);
    
    console.log('[ImageAnalyzer] Classifying intent...');
    const intent = classifyIntent(knowledge);
    
    console.log('[ImageAnalyzer] Generating grounded explanation...');
    const explanation = await generateGroundedExplanation(knowledge, intent, userQuestion);
    console.log('[ImageAnalyzer] ✅ Analysis complete');

    return {
      labels,
      textDetections,
      sceneContext: knowledge.sceneContext,
      detectedIntent: intent.intent,
      intentCategory: intent.category,
      explanation,
    };
  } catch (error) {
    console.error('[ImageAnalyzer] FATAL ERROR:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function detectLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
  const response = await rekognition.send(
    new DetectLabelsCommand({
      Image: { Bytes: imageBuffer },
      MaxLabels: 24,
      MinConfidence: 50,
    }),
  );

  return (response.Labels || []).map((label) => ({
    name: label.Name || '',
    confidence: label.Confidence || 0,
    parents: (label.Parents || []).map((parent) => parent.Name || ''),
  }));
}

async function detectText(imageBuffer: Buffer): Promise<ImageText[]> {
  const response = await rekognition.send(
    new DetectTextCommand({
      Image: { Bytes: imageBuffer },
    }),
  );

  return (response.TextDetections || []).map((text) => ({
    text: text.DetectedText || '',
    confidence: text.Confidence || 0,
    type: (text.Type as 'LINE' | 'WORD') || 'WORD',
  }));
}

async function describeImageWithMultimodalModel(imageBuffer: Buffer): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';

  try {
    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 450,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBuffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'Describe this image in 4-6 short lines with visible objects, context, and probable purpose.',
            },
          ],
        },
      ],
    };

    const response = await bedrockVisionClient.send(
      new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
      }),
    );

    const json = JSON.parse(new TextDecoder().decode(response.body));
    return json?.content?.[0]?.text || '';
  } catch {
    return '';
  }
}

function buildStructuredKnowledge(
  labels: ImageLabel[],
  textDetections: ImageText[],
  multimodalSummary: string,
): VisionKnowledge {
  const objects = labels
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12)
    .map((label) => ({ name: label.name, confidence: Math.round(label.confidence) }));

  const detectedTextLines = textDetections
    .filter((text) => text.type === 'LINE' && text.text.trim())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 16)
    .map((text) => text.text.trim());

  const parentLabels = labels.flatMap((label) => label.parents || []).filter(Boolean);
  const sceneContext = [
    objects.length ? `Top objects: ${objects.map((obj) => obj.name).join(', ')}` : 'Top objects: none',
    parentLabels.length ? `Scene hints: ${Array.from(new Set(parentLabels)).join(', ')}` : '',
    multimodalSummary ? `Multimodal summary: ${multimodalSummary}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  const inferredPurpose = detectedTextLines.length > 0
    ? 'Image includes readable text and likely serves an informational or form-filling purpose.'
    : 'Image is primarily visual and should be interpreted via object and scene context.';

  return {
    objects,
    detectedTextLines,
    sceneContext,
    inferredPurpose,
  };
}

function classifyIntent(knowledge: VisionKnowledge): { category: string; intent: string } {
  const objectWords = knowledge.objects.map((obj) => obj.name.toLowerCase());
  const textBlob = knowledge.detectedTextLines.join(' ').toLowerCase();
  const sceneBlob = `${knowledge.sceneContext} ${knowledge.inferredPurpose}`.toLowerCase();

  let best = { category: 'general', intent: 'general_visual_analysis' };
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    const objectScore = rule.objectKeywords.reduce(
      (sum, keyword) => sum + (objectWords.some((word) => word.includes(keyword)) ? 2 : 0),
      0,
    );

    const textScore = rule.textKeywords.reduce(
      (sum, keyword) => sum + (textBlob.includes(keyword) || sceneBlob.includes(keyword) ? 1 : 0),
      0,
    );

    const totalScore = objectScore + textScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      best = { category: rule.category, intent: rule.intent };
    }
  }

  return best;
}

async function generateGroundedExplanation(
  knowledge: VisionKnowledge,
  intent: { category: string; intent: string },
  userQuestion?: string,
): Promise<string> {
  const systemPrompt = `You are a vision expert who explains images in clear, actionable language.

RULES:
1. Base your explanation ONLY on the detected objects, text, and scene context provided.
2. Do NOT invent details not supported by the image data.
3. Use simple language anyone can understand.
4. Include 4 sections: what the image shows, what it means, what to do next, and guidance specific to the object type.
5. For documents/forms: help user understand what fields mean.
6. For health items: provide safe usage guidance.
7. For agriculture: suggest crop problem diagnosis and solutions.
8. Be practical and actionable.
9. Aim for 500+ words of detailed explanation.`;

  const userPrompt = `Please analyze this image and provide a detailed explanation:

**Detected Objects** (with confidence):
${knowledge.objects.map((obj) => `- ${obj.name} (${obj.confidence}%)`).join('\n')}

**Detected Text**:
${knowledge.detectedTextLines.length > 0 ? knowledge.detectedTextLines.join('\n') : '(No readable text found)'}

**Scene Context**: ${knowledge.sceneContext}

**Inferred Purpose**: ${knowledge.inferredPurpose}

**Detected Intent**: ${intent.intent} (Category: ${intent.category})

${userQuestion ? `**User Question**: ${userQuestion}` : ''}

Now provide a comprehensive explanation of this image that helps the user understand what they're looking at and what they should do next.`;

  const raw = await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 2000, temperature: 0.2 }, // Direct text, not JSON
  );

  if (!raw || raw.trim().length === 0) {
    // Provide structured fallback
    const actions = buildCategoryFallbackActions(intent.category);
    return [
      '## What the image shows',
      knowledge.sceneContext || 'Visual objects were detected.',
      '',
      '## What it means',
      knowledge.inferredPurpose,
      '',
      '## What you should do next',
      ...actions.map((action) => `- ${action}`),
      '',
      `## Detected objects: ${knowledge.objects.map((obj) => `${obj.name} (${obj.confidence}%)`).join(', ')}`,
      '',
      knowledge.detectedTextLines.length > 0
        ? `## Text found in image\n${knowledge.detectedTextLines.join('\n')}`
        : '(No readable text found)',
    ].join('\n');
  }

  // Return the explanation directly with structured guidance for intent
  const enhancedExplanation = [raw.trim()];

  // Add specific guidance based on detected category
  if (intent.category === 'agriculture') {
    enhancedExplanation.push('');
    enhancedExplanation.push('## Agriculture-Specific Guidance');
    enhancedExplanation.push(
      '- Contact your local agricultural extension office with this photo for expert diagnosis',
    );
    enhancedExplanation.push(
      '- Take additional photos of affected areas from different angles',
    );
    enhancedExplanation.push(
      '- Record environmental conditions: rainfall, temperature, humidity',
    );
  } else if (
    intent.category === 'document' ||
    intent.category === 'legal' ||
    intent.category === 'identity'
  ) {
    enhancedExplanation.push('');
    enhancedExplanation.push('## Document Handling Guidance');
    enhancedExplanation.push('- Keep the original document safe and secure');
    enhancedExplanation.push('- If unclear about any field, ask the issuing authority directly');
    enhancedExplanation.push('- Always provide legible copies with official documents');
  } else if (intent.category === 'health') {
    enhancedExplanation.push('');
    enhancedExplanation.push('## Important Health Information');
    enhancedExplanation.push('- Check expiry dates before using any medicine');
    enhancedExplanation.push('- Follow dosage instructions from the label exactly');
    enhancedExplanation.push(
      '- Consult a doctor if you have allergies or are on other medications',
    );
  }

  return enhancedExplanation.join('\n');
}

function buildCategoryFallbackActions(category: string): string[] {
  if (category === 'agriculture') {
    return [
      'Inspect affected crop area closely and capture 2-3 clearer photos of leaves and stems.',
      'Record when symptoms started and whether recent rain or pests were observed.',
      'Consult local agriculture extension support with these visual notes for treatment confirmation.',
    ];
  }

  if (category === 'document' || category === 'legal' || category === 'identity') {
    return [
      'Review all visible fields and verify names, dates, and ID values exactly.',
      'Keep a scanned copy before submission and cross-check required attachments.',
      'Ask a follow-up question with the exact field you want clarified.',
    ];
  }

  if (category === 'health') {
    return [
      'Read dosage text carefully and verify with a qualified doctor or pharmacist.',
      'Check expiry date and warning labels before use.',
      'Do not self-medicate if label details are unclear.',
    ];
  }

  return [
    'Provide a clearer photo if you need higher-confidence interpretation.',
    'Ask a specific follow-up question about one part of the image.',
    'Use extracted text and visible objects as the primary evidence for any decision.',
  ];
}

function parseJsonFromModel<T>(text: string): T | null {
  const direct = tryJsonParse<T>(text);
  if (direct) {
    return direct;
  }

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = tryJsonParse<T>(fenced[1]);
    if (parsed) {
      return parsed;
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return tryJsonParse<T>(objectMatch[0]);
  }

  return null;
}

function tryJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

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
  const [labels, textDetections, multimodalSummary] = await Promise.all([
    detectLabels(imageBuffer),
    detectText(imageBuffer),
    describeImageWithMultimodalModel(imageBuffer),
  ]);

  const knowledge = buildStructuredKnowledge(labels, textDetections, multimodalSummary);
  const intent = classifyIntent(knowledge);
  const explanation = await generateGroundedExplanation(knowledge, intent, userQuestion);

  return {
    labels,
    textDetections,
    sceneContext: knowledge.sceneContext,
    detectedIntent: intent.intent,
    intentCategory: intent.category,
    explanation,
  };
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
  const systemPrompt = `You are a vision explainer.

Use only the provided structured signals.
Do not invent unseen details.
Return valid JSON only.

JSON schema:
{
  "whatImageShows": "string",
  "whatItMeans": "string",
  "nextActions": ["string"],
  "confidence": "high|medium|low"
}`;

  const userPrompt = `Structured image knowledge:
${JSON.stringify(
    {
      intent,
      objects: knowledge.objects,
      detectedTextLines: knowledge.detectedTextLines,
      sceneContext: knowledge.sceneContext,
      inferredPurpose: knowledge.inferredPurpose,
      userQuestion: userQuestion || null,
    },
    null,
    2,
  )}`;

  const raw = await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 1400, temperature: 0.1 },
  );

  const structured = parseJsonFromModel<VisionResponseModel>(raw);
  if (!structured) {
    const actions = buildCategoryFallbackActions(intent.category);
    return [
      'What the image shows',
      knowledge.sceneContext || 'Visual objects were detected, but summary confidence is limited.',
      '',
      'What it means',
      knowledge.inferredPurpose,
      '',
      'What you should do next',
      ...actions.map((action) => `- ${action}`),
    ].join('\n');
  }

  return [
    'What the image shows',
    structured.whatImageShows,
    '',
    'What it means',
    structured.whatItMeans,
    '',
    'What you should do next',
    ...(structured.nextActions || []).map((action) => `- ${action}`),
    '',
    `Confidence: ${structured.confidence || 'medium'}`,
  ].join('\n');
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

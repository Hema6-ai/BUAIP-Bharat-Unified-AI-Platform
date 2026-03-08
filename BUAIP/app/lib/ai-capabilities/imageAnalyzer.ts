/**
 * Image / Vision Analysis Pipeline
 * Uses AWS Rekognition for object/text detection,
 * then Bedrock Claude for intelligent reasoning about the image.
 */

import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectTextCommand,
} from '@aws-sdk/client-rekognition';
import { callBedrock } from '@/app/lib/bedrock';

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── Types ──

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
  detectedIntent: string;
  intentCategory: string;
  explanation: string;
}

// ── Step 1: Run Rekognition ──

async function detectLabels(imageBuffer: Buffer): Promise<ImageLabel[]> {
  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MaxLabels: 20,
    MinConfidence: 55,
  });
  const response = await rekognition.send(command);

  return (response.Labels || []).map((l) => ({
    name: l.Name || '',
    confidence: l.Confidence || 0,
    parents: (l.Parents || []).map((p) => p.Name || ''),
  }));
}

async function detectText(imageBuffer: Buffer): Promise<ImageText[]> {
  const command = new DetectTextCommand({
    Image: { Bytes: imageBuffer },
  });
  const response = await rekognition.send(command);

  return (response.TextDetections || []).map((t) => ({
    text: t.DetectedText || '',
    confidence: t.Confidence || 0,
    type: (t.Type as 'LINE' | 'WORD') || 'WORD',
  }));
}

// ── Step 2: Detect intent from labels ──

const INTENT_RULES: Array<{
  keywords: string[];
  intent: string;
  category: string;
}> = [
  {
    keywords: ['plant', 'crop', 'leaf', 'vegetation', 'farm', 'agriculture', 'flower', 'weed', 'soil', 'seed'],
    intent: 'crop_disease_analysis',
    category: 'agriculture',
  },
  {
    keywords: ['document', 'paper', 'form', 'text', 'letter', 'certificate', 'receipt', 'invoice'],
    intent: 'document_analysis',
    category: 'document',
  },
  {
    keywords: ['pill', 'medicine', 'tablet', 'bottle', 'pharmaceutical', 'capsule', 'drug'],
    intent: 'medicine_identification',
    category: 'health',
  },
  {
    keywords: ['id card', 'passport', 'license', 'aadhaar', 'identification', 'pan card'],
    intent: 'id_document_analysis',
    category: 'identity',
  },
  {
    keywords: ['food', 'meal', 'dish', 'plate', 'fruit', 'vegetable', 'cooking'],
    intent: 'food_identification',
    category: 'food',
  },
  {
    keywords: ['building', 'house', 'road', 'bridge', 'infrastructure', 'construction'],
    intent: 'infrastructure_analysis',
    category: 'infrastructure',
  },
  {
    keywords: ['animal', 'pet', 'dog', 'cat', 'cow', 'cattle', 'livestock'],
    intent: 'animal_identification',
    category: 'animal',
  },
];

function classifyIntent(
  labels: ImageLabel[],
  textDetections: ImageText[],
): { intent: string; category: string } {
  const labelNames = labels.map((l) => l.name.toLowerCase());
  const hasText = textDetections.filter((t) => t.type === 'LINE').length > 3;

  // Score each intent rule
  let bestScore = 0;
  let bestIntent = 'general_image';
  let bestCategory = 'general';

  for (const rule of INTENT_RULES) {
    const score = rule.keywords.reduce(
      (acc, kw) => acc + (labelNames.some((l) => l.includes(kw)) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.intent;
      bestCategory = rule.category;
    }
  }

  // If substantial text detected, lean toward document
  if (hasText && bestScore < 2) {
    return { intent: 'document_analysis', category: 'document' };
  }

  return { intent: bestIntent, category: bestCategory };
}

// ── Step 3: AI reasoning ──

async function generateImageExplanation(
  labels: ImageLabel[],
  textDetections: ImageText[],
  intent: string,
  category: string,
  userQuestion?: string,
): Promise<string> {
  const labelSummary = labels
    .slice(0, 12)
    .map((l) => `${l.name} (${l.confidence.toFixed(0)}%)`)
    .join(', ');

  const detectedLines = textDetections
    .filter((t) => t.type === 'LINE')
    .map((t) => t.text)
    .join('\n');

  const systemPrompt = `You are BUAIP Photo Analyzer — an AI that understands images through detected objects and text.

You receive:
- Object labels detected in the image (with confidence %)
- Text extracted from the image (OCR)
- The classified intent category

Your task:
1. Describe what the image contains based on the detected objects and text.
2. Identify what it means in context.
3. Provide actionable advice on what the user should do next.

Be specific and helpful. If it's a crop disease, give treatment advice.
If it's a government form, explain how to fill it. If it's medicine, explain dosage.
If text is detected, use it in your explanation.

IMPORTANT: Only use the detected objects and text provided. Do not invent details not supported by the detections.`;

  const userPrompt = `## Image Analysis Results

**Detected Objects:** ${labelSummary || 'None detected'}
**Detected Category:** ${category}
**Intent:** ${intent}

${detectedLines ? `**Text Found in Image:**\n${detectedLines}` : '**Text Found:** None'}

${userQuestion ? `**User Question:** ${userQuestion}` : '**No specific question — provide full explanation.**'}

Explain what this image shows, what it means, and what the user should do next.`;

  return await callBedrock(
    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    { maxTokens: 2000, temperature: 0.3 },
  );
}

// ── Public API ──

export async function analyzeImage(
  imageBuffer: Buffer,
  userQuestion?: string,
): Promise<ImageAnalysis> {
  // Run Rekognition in parallel
  const [labels, textDetections] = await Promise.all([
    detectLabels(imageBuffer),
    detectText(imageBuffer),
  ]);

  // Classify intent
  const { intent, category } = classifyIntent(labels, textDetections);

  // AI reasoning
  const explanation = await generateImageExplanation(
    labels,
    textDetections,
    intent,
    category,
    userQuestion,
  );

  return {
    labels,
    textDetections,
    detectedIntent: intent,
    intentCategory: category,
    explanation,
  };
}

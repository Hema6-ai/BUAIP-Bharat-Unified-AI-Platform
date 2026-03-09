/**
 * AI Capabilities API Route
 * Single endpoint for all AI capabilities:
 *  - document-explain: parse & explain uploaded documents
 *  - photo-answer: analyze uploaded images
 *  - upload-file: smart router (document vs image)
 *  - learning-mode: adaptive teaching loop
 *  - document-question: follow-up Q&A on uploaded document
 *
 * Accepts multipart/form-data for file uploads, application/json for text queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractTextFromBuffer,
  chunkDocument,
  generateDocumentExplanation,
  answerDocumentQuestion,
  type ProcessedDocument,
} from '@/app/lib/ai-capabilities/documentProcessor';
import { analyzeImage } from '@/app/lib/ai-capabilities/imageAnalyzer';
import {
  startLearning,
  continueLearning,
} from '@/app/lib/ai-capabilities/learningMode';
import {
  storeDocument,
  storeImageAnalysis,
  getLastDocument,
  getLearningState,
  setLearningState,
  clearLearningState,
  getContextSummary,
} from '@/app/lib/ai-capabilities/sessionMemory';

export const runtime = 'nodejs';
// Allow larger uploads (10 MB)
export const maxDuration = 60;

// ── IMAGE MIME TYPES ──
const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/webp',
  'image/tiff',
]);

// ── POST handler ──

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // ── JSON requests (learning mode, document question, etc.) ──
    if (contentType.includes('application/json')) {
      const body = await request.json();
      return await handleJsonRequest(body);
    }

    // ── Multipart file uploads ──
    if (contentType.includes('multipart/form-data')) {
      return await handleFileUpload(request);
    }

    return NextResponse.json(
      { error: 'Unsupported content type. Use multipart/form-data or application/json.' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[AI Capabilities] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// ── JSON request handler ──

async function handleJsonRequest(body: any): Promise<NextResponse> {
  const { capability, sessionId, question, topic, userAnswer } = body;

  if (!capability) {
    return NextResponse.json(
      { error: 'Missing "capability" field.' },
      { status: 400 },
    );
  }

  // ── Learning Mode ──
  if (capability === 'learning-start') {
    if (!topic) {
      return NextResponse.json(
        { error: 'Missing "topic" for learning mode.' },
        { status: 400 },
      );
    }

    const result = await startLearning(topic, []);
    if (sessionId) setLearningState(sessionId, result.state);

    return NextResponse.json({
      capability: 'learning-mode',
      response: result.response,
      isComplete: result.isComplete,
      state: {
        topic: result.state.topic,
        level: result.state.level,
        questionsAsked: result.state.questionsAsked,
        correctAnswers: result.state.correctAnswers,
      },
      engine: 'BUAIP Adaptive Learning Mode',
    });
  }

  if (capability === 'learning-continue') {
    if (!userAnswer) {
      return NextResponse.json(
        { error: 'Missing "userAnswer" for learning continuation.' },
        { status: 400 },
      );
    }

    const existingState = sessionId ? getLearningState(sessionId) : undefined;
    if (!existingState) {
      return NextResponse.json(
        { error: 'No active learning session. Start one first.' },
        { status: 400 },
      );
    }

    const result = await continueLearning(userAnswer, existingState);
    if (sessionId) setLearningState(sessionId, result.state);

    return NextResponse.json({
      capability: 'learning-mode',
      response: result.response,
      isComplete: result.isComplete,
      state: {
        topic: result.state.topic,
        level: result.state.level,
        questionsAsked: result.state.questionsAsked,
        correctAnswers: result.state.correctAnswers,
      },
      engine: 'BUAIP Adaptive Learning Mode',
    });
  }

  if (capability === 'learning-stop') {
    if (sessionId) clearLearningState(sessionId);
    return NextResponse.json({
      capability: 'learning-mode',
      response: 'Learning session ended. Feel free to start a new topic anytime!',
      isComplete: true,
      engine: 'BUAIP Adaptive Learning Mode',
    });
  }

  // ── Document Q&A (follow-up question on uploaded document) ──
  if (capability === 'document-question') {
    if (!question) {
      return NextResponse.json(
        { error: 'Missing "question" for document Q&A.' },
        { status: 400 },
      );
    }

    const doc = sessionId ? getLastDocument(sessionId) : undefined;
    if (!doc) {
      return NextResponse.json(
        { error: 'No document found in session. Upload a document first.' },
        { status: 400 },
      );
    }

    const answer = await answerDocumentQuestion(doc, question);
    return NextResponse.json({
      capability: 'document-question',
      response: answer,
      documentName: doc.fileName,
      pipeline: [
        'Input',
        'Context Extraction',
        'Structured Knowledge Retrieval',
        'AI Reasoning',
        'Human-friendly explanation',
      ],
      engine: 'BUAIP Document Q&A',
    });
  }

  // ── Context summary ──
  if (capability === 'context-summary') {
    const summary = sessionId ? getContextSummary(sessionId) : '';
    return NextResponse.json({
      capability: 'context-summary',
      summary: summary || 'No content uploaded in this session yet.',
    });
  }

  return NextResponse.json(
    { error: `Unknown capability: "${capability}"` },
    { status: 400 },
  );
}

// ── File upload handler ──

async function handleFileUpload(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const capability = (formData.get('capability') as string) || 'upload-file';
  const sessionId = (formData.get('sessionId') as string) || '';
  const question = (formData.get('question') as string) || '';

  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded.' },
      { status: 400 },
    );
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name || 'unknown';
  const mimeType = file.type || '';

  // Route: image or document?
  const isImage =
    IMAGE_MIMES.has(mimeType) ||
    /\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i.test(fileName);

  const isTextDocument =
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.(pdf|docx|txt)$/i.test(fileName);

  if (!isImage && !isTextDocument) {
    return NextResponse.json(
      {
        error:
          'Unsupported file format. Please upload PDF, DOCX, TXT, image, or scanned document.',
      },
      { status: 400 },
    );
  }

  if (
    capability === 'photo-answer' ||
    (capability === 'upload-file' && isImage)
  ) {
    return await handleImageAnalysis(buffer, fileName, sessionId, question);
  }

  // Default: document pipeline
  return await handleDocumentAnalysis(buffer, fileName, mimeType, sessionId, question);
}

// ── Document analysis ──

async function handleDocumentAnalysis(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  sessionId: string,
  question: string,
): Promise<NextResponse> {
  const progressStages = [
    'Parsing document',
    'Analyzing sections',
    'Generating explanation',
  ];

  // Step 1: Extract text
  const extraction = await extractTextFromBuffer(buffer, fileName, mimeType);
  const text = extraction.text || '';
  const pageCount = extraction.pageCount || 1;

  // Step 2: Chunk
  const chunks = chunkDocument(text, pageCount);

  // Step 3: Create processed document
  const doc: ProcessedDocument = {
    documentId: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName,
    fileType: mimeType,
    fullText: text,
    chunks,
    pageCount,
    extractedAt: Date.now(),
    metadata: {
      extractionMethod: extraction.method,
      usedOcr: extraction.usedOcr,
      warnings: extraction.warnings,
    },
  };

  // Step 4: Store in session memory
  if (sessionId) storeDocument(sessionId, doc);

  // Step 5: Generate explanation or answer question
  if (question && question.trim()) {
    const answer = await answerDocumentQuestion(doc, question);
    return NextResponse.json({
      capability: 'document-question',
      response: answer,
      documentName: fileName,
      documentId: doc.documentId,
      pageCount,
      sections: chunks.length,
      textLength: text.length,
      progressStages,
      metadata: doc.metadata,
      pipeline: [
        'Input',
        'Context Extraction',
        'Structured Knowledge Creation',
        'AI Reasoning',
        'Human-friendly explanation',
      ],
      engine: 'BUAIP Document Q&A',
    });
  }

  const explanation = await generateDocumentExplanation(doc);

  const fallbackMessage =
    'The file was uploaded successfully, but only limited text could be extracted. Please ask a specific question about the visible content for a targeted answer.';

  return NextResponse.json({
    capability: 'document-explain',
    response: explanation.fullExplanation || fallbackMessage,
    documentName: fileName,
    documentId: doc.documentId,
    pageCount,
    sections: chunks.length,
    textLength: text.length,
    summary: explanation.summary,
    progressStages,
    metadata: doc.metadata,
    pipeline: [
      'Input',
      'Context Extraction',
      'Structured Knowledge Creation',
      'AI Reasoning',
      'Human-friendly explanation',
    ],
    engine: 'BUAIP Document Explainer',
  });
}

// ── Image analysis ──

async function handleImageAnalysis(
  buffer: Buffer,
  fileName: string,
  sessionId: string,
  question: string,
): Promise<NextResponse> {
  const progressStages = [
    'Extracting visual and OCR signals',
    'Identifying intent',
    'Generating explanation',
  ];

  const analysis = await analyzeImage(buffer, question || undefined);

  const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (sessionId) storeImageAnalysis(sessionId, imageId, analysis);

  return NextResponse.json({
    capability: 'photo-answer',
    response: analysis.explanation,
    imageName: fileName,
    imageId,
    labels: analysis.labels.slice(0, 10).map((l) => ({
      name: l.name,
      confidence: Math.round(l.confidence),
    })),
    textFound: analysis.textDetections
      .filter((t) => t.type === 'LINE')
      .map((t) => t.text)
      .slice(0, 20),
    detectedIntent: analysis.detectedIntent,
    intentCategory: analysis.intentCategory,
    sceneContext: analysis.sceneContext,
    progressStages,
    pipeline: [
      'Input',
      'Context Extraction',
      'Structured Knowledge Creation',
      'AI Reasoning',
      'Human-friendly explanation',
    ],
    engine: 'BUAIP Photo Analyzer',
  });
}

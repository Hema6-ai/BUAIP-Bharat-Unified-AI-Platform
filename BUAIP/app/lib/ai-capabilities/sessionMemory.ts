/**
 * Session Context Memory
 * Stores uploaded documents, images, and learning states in session memory
 * so follow-up questions can reference previously uploaded content.
 */

import type { ProcessedDocument } from './documentProcessor';
import type { ImageAnalysis } from './imageAnalyzer';
import type { LearningState } from './learningMode';

// ── Types ──

export interface SessionContext {
  sessionId: string;
  documents: Map<string, ProcessedDocument>;
  images: Map<string, ImageAnalysis>;
  learningState?: LearningState;
  lastUploadId?: string;
  lastUploadType?: 'document' | 'image';
  createdAt: number;
  updatedAt: number;
}

// ── In-memory store ──

const sessionStore = new Map<string, SessionContext>();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Clean expired sessions periodically
function cleanExpired() {
  const now = Date.now();
  for (const [key, ctx] of sessionStore) {
    if (now - ctx.updatedAt > SESSION_TTL_MS) {
      sessionStore.delete(key);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpired, 10 * 60 * 1000);
}

// ── Public API ──

export function getOrCreateContext(sessionId: string): SessionContext {
  let ctx = sessionStore.get(sessionId);
  if (!ctx) {
    ctx = {
      sessionId,
      documents: new Map(),
      images: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessionStore.set(sessionId, ctx);
  }
  ctx.updatedAt = Date.now();
  return ctx;
}

export function storeDocument(
  sessionId: string,
  doc: ProcessedDocument,
): void {
  const ctx = getOrCreateContext(sessionId);
  ctx.documents.set(doc.documentId, doc);
  ctx.lastUploadId = doc.documentId;
  ctx.lastUploadType = 'document';
  ctx.updatedAt = Date.now();
}

export function storeImageAnalysis(
  sessionId: string,
  imageId: string,
  analysis: ImageAnalysis,
): void {
  const ctx = getOrCreateContext(sessionId);
  ctx.images.set(imageId, analysis);
  ctx.lastUploadId = imageId;
  ctx.lastUploadType = 'image';
  ctx.updatedAt = Date.now();
}

export function getLastDocument(
  sessionId: string,
): ProcessedDocument | undefined {
  const ctx = sessionStore.get(sessionId);
  if (!ctx || ctx.lastUploadType !== 'document' || !ctx.lastUploadId) return undefined;
  return ctx.documents.get(ctx.lastUploadId);
}

export function getLastImageAnalysis(
  sessionId: string,
): ImageAnalysis | undefined {
  const ctx = sessionStore.get(sessionId);
  if (!ctx || ctx.lastUploadType !== 'image' || !ctx.lastUploadId) return undefined;
  return ctx.images.get(ctx.lastUploadId);
}

export function getDocument(
  sessionId: string,
  documentId: string,
): ProcessedDocument | undefined {
  const ctx = sessionStore.get(sessionId);
  return ctx?.documents.get(documentId);
}

export function getLearningState(
  sessionId: string,
): LearningState | undefined {
  return sessionStore.get(sessionId)?.learningState;
}

export function setLearningState(
  sessionId: string,
  state: LearningState,
): void {
  const ctx = getOrCreateContext(sessionId);
  ctx.learningState = state;
  ctx.updatedAt = Date.now();
}

export function clearLearningState(sessionId: string): void {
  const ctx = sessionStore.get(sessionId);
  if (ctx) {
    ctx.learningState = undefined;
    ctx.updatedAt = Date.now();
  }
}

export function hasUploadedContent(sessionId: string): boolean {
  const ctx = sessionStore.get(sessionId);
  if (!ctx) return false;
  return ctx.documents.size > 0 || ctx.images.size > 0;
}

export function getContextSummary(sessionId: string): string {
  const ctx = sessionStore.get(sessionId);
  if (!ctx) return '';

  const parts: string[] = [];

  if (ctx.documents.size > 0) {
    const docs = Array.from(ctx.documents.values());
    parts.push(
      `Uploaded documents: ${docs.map((d) => d.fileName).join(', ')}`,
    );
  }

  if (ctx.images.size > 0) {
    parts.push(`Uploaded images: ${ctx.images.size}`);
  }

  if (ctx.learningState) {
    parts.push(
      `Active learning topic: "${ctx.learningState.topic}" (level: ${ctx.learningState.level})`,
    );
  }

  return parts.join('. ');
}

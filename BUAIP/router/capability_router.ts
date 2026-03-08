/**
 * Capability Router — Layer 1
 *
 * Runs BEFORE the Domain Super Router.
 * Detects if the user's request is a capability action (document Q&A, image
 * follow-up, learning mode continuation) and routes to the right handler.
 *
 * If no capability is detected, returns { handled: false } so the caller
 * can fall through to Layer 2 (Domain Super Router).
 */

import {
  hasUploadedContent,
  getLastDocument,
  getLastImageAnalysis,
  getLearningState,
} from '@/app/lib/ai-capabilities/sessionMemory';
import { answerDocumentQuestion } from '@/app/lib/ai-capabilities/documentProcessor';
import { continueLearning } from '@/app/lib/ai-capabilities/learningMode';

// ── Types ──

export interface CapabilityResult {
  handled: boolean;
  response?: string;
  capability?: 'document_ai' | 'photo_ai' | 'learning_ai' | 'voice_ai';
  meta?: Record<string, unknown>;
}

// ── Keyword patterns ──

const DOC_KEYWORDS =
  /\b(document|file|uploaded|pdf|summary|section|page|paragraph|clause|benefits?|eligib|deadline|requirement|apply|attached|report)\b/i;

const IMAGE_KEYWORDS =
  /\b(image|photo|picture|uploaded|what is this|what does this|identify|recognize|show|crop disease|pest|insect|deficiency|plant|leaf)\b/i;

// ── Public API ──

/**
 * Check if the user's message should be handled by a capability handler
 * rather than the domain super router.
 *
 * Precedence:
 *   1. Active learning session → learning_ai
 *   2. Document in session + doc-related question → document_ai
 *   3. Image in session + image-related question → photo_ai
 *   4. Nothing matches → { handled: false }
 */
export async function routeCapability(
  userMessage: string,
  sessionId: string | undefined,
): Promise<CapabilityResult> {
  if (!sessionId) return { handled: false };

  // ── 1. Learning mode (highest priority — student is in a learning loop) ──
  const learningState = getLearningState(sessionId);
  if (learningState) {
    try {
      const result = await continueLearning(userMessage, learningState);
      // Session memory is already updated inside continueLearning — the
      // ai-capabilities route handles setLearningState; here we just return.
      return {
        handled: true,
        response: result.response,
        capability: 'learning_ai',
        meta: {
          topic: learningState.topic,
          level: result.state.level,
          questionsAsked: result.state.questionsAsked,
          isComplete: result.isComplete,
        },
      };
    } catch (err) {
      console.error('[CapabilityRouter] Learning mode error:', err);
      // Fall through to domain router on failure
    }
  }

  // Only check uploads if session has content
  if (!hasUploadedContent(sessionId)) return { handled: false };

  // ── 2. Document follow-up ──
  if (DOC_KEYWORDS.test(userMessage)) {
    const doc = getLastDocument(sessionId);
    if (doc) {
      try {
        const answer = await answerDocumentQuestion(doc, userMessage);
        return {
          handled: true,
          response: answer,
          capability: 'document_ai',
          meta: { documentName: doc.fileName },
        };
      } catch (err) {
        console.error('[CapabilityRouter] Document Q&A error:', err);
      }
    }
  }

  // ── 3. Image follow-up ──
  if (IMAGE_KEYWORDS.test(userMessage)) {
    const img = getLastImageAnalysis(sessionId);
    if (img) {
      // The image has already been analyzed — return a contextual summary.
      // Deeper image reasoning happens via the ai-capabilities multipart route.
      return {
        handled: true,
        response: img.explanation,
        capability: 'photo_ai',
        meta: {
          detectedIntent: img.detectedIntent,
          intentCategory: img.intentCategory,
          labels: img.labels.map((l) => l.name).join(', '),
        },
      };
    }
  }

  return { handled: false };
}

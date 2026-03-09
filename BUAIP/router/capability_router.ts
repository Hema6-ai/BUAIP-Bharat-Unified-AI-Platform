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
} from '@/app/lib/ai-capabilities/sessionMemory';
import { handleDocumentCapability } from '@/capabilities/document_ai';
import { handlePhotoCapability } from '@/capabilities/photo_ai';
import { handleLearningCapability } from '@/capabilities/learning_ai';
import { handleVoiceCapability } from '@/capabilities/voice_ai';
import { handleFileUploadCapability } from '@/capabilities/file_upload_ai';
import { handleNormalChatCapability } from '@/capabilities/normal_chat';

// ── Types ──

export interface CapabilityResult {
  handled: boolean;
  response?: string;
  capability?: 'document_ai' | 'photo_ai' | 'learning_ai' | 'voice_ai' | 'file_upload_ai' | 'normal_chat';
  meta?: Record<string, unknown>;
}

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
  const hasSessionUpload = sessionId ? hasUploadedContent(sessionId) : false;

  if (sessionId) {
    // 1. Active learning session (highest priority)
    const learningResult = await handleLearningCapability(userMessage, sessionId);
    if (learningResult.handled) {
      return learningResult;
    }

    // Check upload-dependent capabilities only when there is uploaded session content.
    if (hasSessionUpload) {
      const documentResult = await handleDocumentCapability(userMessage, sessionId);
      if (documentResult.handled) {
        return documentResult;
      }

      const photoResult = await handlePhotoCapability(userMessage, sessionId);
      if (photoResult.handled) {
        return photoResult;
      }
    }

  }

  // Ask user to upload a file when relevant keywords appear but session has no uploads.
  const fileUploadResult = await handleFileUploadCapability(userMessage, hasSessionUpload);
  if (fileUploadResult.handled) {
    return fileUploadResult;
  }

  const voiceResult = await handleVoiceCapability(userMessage);
  if (voiceResult.handled) {
    return voiceResult;
  }

  return handleNormalChatCapability();
}

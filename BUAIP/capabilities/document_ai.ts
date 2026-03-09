import { answerDocumentQuestion } from '@/app/lib/ai-capabilities/documentProcessor';
import { getLastDocument } from '@/app/lib/ai-capabilities/sessionMemory';
import type { CapabilityHandlerResult } from '@/capabilities/types';

const DOC_KEYWORDS =
  /\b(document|file|uploaded|pdf|summary|section|page|paragraph|clause|benefits?|eligib|deadline|requirement|apply|attached|report)\b/i;

export async function handleDocumentCapability(
  userMessage: string,
  sessionId: string,
): Promise<CapabilityHandlerResult> {
  if (!DOC_KEYWORDS.test(userMessage)) {
    return { handled: false, capability: 'document_ai' };
  }

  const doc = getLastDocument(sessionId);
  if (!doc) {
    return { handled: false, capability: 'document_ai' };
  }

  try {
    const answer = await answerDocumentQuestion(doc, userMessage);
    return {
      handled: true,
      capability: 'document_ai',
      response: answer,
      meta: { documentName: doc.fileName },
    };
  } catch (error) {
    console.error('[DocumentCapability] Error:', error);
    return { handled: false, capability: 'document_ai' };
  }
}

import { LEGAL_ENGINE_PROMPT } from '@/prompts/legal_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runLegalEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
    context.extractedEntities?.legalCategory
      ? `Legal category detected: ${context.extractedEntities.legalCategory}`
      : '',
    context.extractedEntities?.urgency
      ? `Urgency level: ${context.extractedEntities.urgency}`
      : '',
  ].filter(Boolean).join('\n\n') || 'No additional legal context available. Identify the legal category and jurisdiction from the question.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: LEGAL_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
  });

  return {
    engineId: 'legal',
    domainSummary: 'Rights explanation, legal steps, and evidence preparation',
    reasoningText,
  };
}

import { TOURISM_ENGINE_PROMPT } from '@/prompts/tourism_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runTourismEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
  ].filter(Boolean).join('\n\n') || 'No additional travel context available. Infer destination, duration, budget, and interests from the question.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: TOURISM_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
  });

  return {
    engineId: 'tourism',
    domainSummary: 'India-specific travel planning, safety, and logistics',
    reasoningText,
  };
}

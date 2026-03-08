import { AGRICULTURE_ENGINE_PROMPT } from '@/prompts/agriculture_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runAgricultureEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
  ].filter(Boolean).join('\n\n') || 'No additional farming context available. Infer region, season, and crop from the question when possible.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: AGRICULTURE_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
  });

  return {
    engineId: 'agriculture',
    domainSummary: 'Farming analysis and actionable crop/soil/irrigation guidance',
    reasoningText,
  };
}

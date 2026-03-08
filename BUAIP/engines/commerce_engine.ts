import { COMMERCE_ENGINE_PROMPT } from '@/prompts/commerce_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runCommerceEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
  ].filter(Boolean).join('\n\n') || 'No additional business context available. Infer product category, target market, and business stage from the question.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: COMMERCE_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
  });

  return {
    engineId: 'commerce',
    domainSummary: 'Business strategy, platform, pricing, and launch planning',
    reasoningText,
  };
}

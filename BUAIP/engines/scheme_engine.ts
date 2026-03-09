import { SCHEME_ENGINE_PROMPT } from '@/prompts/scheme_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runSchemeEngine(context: EngineRunContext): Promise<EngineOutput> {
  const profileContext = context.profileSummary
    ? `Known citizen profile details:\n${context.profileSummary}`
    : 'No profile details available yet. Infer what you can from the question and ask clarifying questions in Section 5 to improve scheme matching.';

  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    profileContext,
    entityContext ? `Extracted entities: ${entityContext}` : '',
  ].filter(Boolean).join('\n\n');

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: SCHEME_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
    languageContext: context.languageContext,
  });

  return {
    engineId: 'scheme',
    domainSummary: 'Government schemes, eligibility, and application guidance',
    reasoningText,
  };
}

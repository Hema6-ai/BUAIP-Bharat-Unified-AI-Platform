import { CAREER_ENGINE_PROMPT } from '@/prompts/career_prompt';
import { invokeReasoningLLM } from '@/llm/llm_client';
import type { EngineOutput, EngineRunContext } from '@/engines/types';

export async function runCareerEngine(context: EngineRunContext): Promise<EngineOutput> {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const supportingContext = [
    context.profileSummary || '',
    entityContext ? `Extracted entities: ${entityContext}` : '',
  ].filter(Boolean).join('\n\n') || 'No additional career context available. Infer education level, age group, interests, and constraints from the question.';

  const reasoningText = await invokeReasoningLLM({
    domainPrompt: CAREER_ENGINE_PROMPT,
    userMessage: context.userMessage,
    conversationHistory: context.conversationHistory,
    supportingContext,
    languageContext: context.languageContext,
  });

  return {
    engineId: 'career',
    domainSummary: 'Career options, salary reality, skills, and roadmap',
    reasoningText,
  };
}

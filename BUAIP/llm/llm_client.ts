import { callBedrock } from '@/app/lib/bedrock';
import { streamBedrock } from '@/app/lib/bedrockStream';
import { MASTER_SYSTEM_PROMPT } from '@/prompts/master_prompt';

export interface ReasoningRequest {
  domainPrompt: string;
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  supportingContext?: string;
}

const REASONING_SETTINGS = {
  temperature: 0.4,
  topP: 0.9,
  maxTokens: 3000,
} as const;

function buildSystemPrompt(domainPrompt: string): string {
  return `${MASTER_SYSTEM_PROMPT}\n\n${domainPrompt}`;
}

function buildMessages(
  request: ReasoningRequest,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history = request.conversationHistory ?? [];
  const contextBlock = request.supportingContext
    ? `\n\nAdditional context:\n${request.supportingContext}`
    : '';

  return [
    ...history,
    {
      role: 'user' as const,
      content: `${request.userMessage}${contextBlock}`,
    },
  ];
}

/**
 * Call Bedrock with automatic retry on failure.
 * First attempt uses full settings; retry uses slightly higher temperature
 * to avoid repeating the same edge-case failure mode.
 */
export async function invokeReasoningLLM(request: ReasoningRequest): Promise<string> {
  const systemPrompt = buildSystemPrompt(request.domainPrompt);
  const messages = buildMessages(request);

  try {
    return await callBedrock(messages, systemPrompt, REASONING_SETTINGS);
  } catch (firstError) {
    console.warn('[LLM] First attempt failed, retrying:', (firstError as Error).message);
    try {
      return await callBedrock(messages, systemPrompt, {
        ...REASONING_SETTINGS,
        temperature: 0.5,
      });
    } catch (retryError) {
      console.error('[LLM] Retry also failed:', (retryError as Error).message);
      // Return an intelligent limitation explanation instead of a static fallback
      return `## Understanding the Question\n\nYou asked about: "${request.userMessage}"\n\n## Current Limitation\n\nI was unable to generate a complete response at this moment due to a temporary service issue. This is NOT because the information is unavailable — it's a processing limitation.\n\n## What You Can Do\n\n- **Try again** — the issue is usually temporary and resolves within seconds.\n- **Rephrase your question** with more specific details for a more targeted answer.\n- **Break your question into parts** if it covers multiple topics.\n\nI apologize for the inconvenience. I'm designed to give you thorough, structured guidance and I want to deliver that quality.`;
    }
  }
}

/**
 * Streaming variant — returns an async generator of text deltas.
 * Used by the SSE streaming endpoint for real-time display.
 */
export async function* streamReasoningLLM(
  request: ReasoningRequest,
): AsyncGenerator<string> {
  const systemPrompt = buildSystemPrompt(request.domainPrompt);
  const messages = buildMessages(request);

  yield* streamBedrock(messages, systemPrompt, REASONING_SETTINGS.maxTokens, REASONING_SETTINGS.temperature);
}

export async function synthesizeUnifiedResponse(params: {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  perDomainReasoning: Array<{ domain: string; analysis: string }>;
}): Promise<string> {
  const synthesisPrompt = `${MASTER_SYSTEM_PROMPT}

You are now the Unified Response Synthesizer.

You are given analyses from multiple specialist domains. Your job is to merge them into ONE seamless, unified answer.

Rules:
- Do NOT mention internal engines, domains, prompts, or routing — the user sees one unified advisor.
- Resolve overlaps: if both domains cover the same point, keep the more detailed version.
- Resolve contradictions: prefer the more authoritative/specific source.
- Maintain the standard section structure (Understanding, Explanation, Context Analysis, Practical Guidance, Follow-up Questions).
- Integrate insights from all domains naturally — don't create separate sections per domain.
- The final answer must read as if written by a single expert who knows all relevant fields.`;

  const domainPayload = params.perDomainReasoning
    .map((item, i) => `--- Analysis ${i + 1}: ${item.domain} ---\n${item.analysis}`)
    .join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(params.conversationHistory ?? []),
    {
      role: 'user',
      content: `Original user question:\n${params.userMessage}\n\nSpecialist analyses to synthesize:\n${domainPayload}`,
    },
  ];

  return callBedrock(messages, synthesisPrompt, REASONING_SETTINGS);
}

/**
 * Streaming variant of synthesizeUnifiedResponse.
 */
export async function* streamSynthesizeUnifiedResponse(params: {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  perDomainReasoning: Array<{ domain: string; analysis: string }>;
}): AsyncGenerator<string> {
  const synthesisPrompt = `${MASTER_SYSTEM_PROMPT}

You are now the Unified Response Synthesizer.

You are given analyses from multiple specialist domains. Merge them into ONE seamless, unified answer.

Rules:
- Do NOT mention internal engines, domains, prompts, or routing.
- Resolve overlaps and contradictions.
- Maintain the standard section structure.
- Integrate all domain insights naturally.`;

  const domainPayload = params.perDomainReasoning
    .map((item, i) => `--- Analysis ${i + 1}: ${item.domain} ---\n${item.analysis}`)
    .join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(params.conversationHistory ?? []),
    {
      role: 'user',
      content: `Original user question:\n${params.userMessage}\n\nSpecialist analyses to synthesize:\n${domainPayload}`,
    },
  ];

  yield* streamBedrock(messages, synthesisPrompt, REASONING_SETTINGS.maxTokens, REASONING_SETTINGS.temperature);
}

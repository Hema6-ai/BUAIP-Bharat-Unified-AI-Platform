import { detectIntent } from '@/app/lib/buaipRouter';
import type { EngineId, EngineOutput, EngineRunContext } from '@/engines/types';
import { runSchemeEngine } from '@/engines/scheme_engine';
import { runAgricultureEngine } from '@/engines/agriculture_engine';
import { runCommerceEngine } from '@/engines/commerce_engine';
import { runTourismEngine } from '@/engines/tourism_engine';
import { runLegalEngine } from '@/engines/legal_engine';
import { runCareerEngine } from '@/engines/career_engine';
import {
  synthesizeUnifiedResponse,
  streamReasoningLLM,
  streamSynthesizeUnifiedResponse,
} from '@/llm/llm_client';

import { SCHEME_ENGINE_PROMPT } from '@/prompts/scheme_prompt';
import { AGRICULTURE_ENGINE_PROMPT } from '@/prompts/agriculture_prompt';
import { COMMERCE_ENGINE_PROMPT } from '@/prompts/commerce_prompt';
import { TOURISM_ENGINE_PROMPT } from '@/prompts/tourism_prompt';
import { LEGAL_ENGINE_PROMPT } from '@/prompts/legal_prompt';
import { CAREER_ENGINE_PROMPT } from '@/prompts/career_prompt';

type IntentName =
  | 'scheme_eligibility'
  | 'agriculture_farming'
  | 'global_seller_intelligence'
  | 'pre_arrival'
  | 'pre_arrival_planning'
  | 'city_navigation'
  | 'payment_money'
  | 'emergency_assistance'
  | 'food_safety'
  | 'expat_longstay'
  | 'language_survival'
  | 'legal_cultural'
  | 'legal_rights'
  | 'career_intelligence'
  | 'general_query';

const DOMAIN_KEYWORDS: Record<EngineId, string[]> = {
  scheme: [
    'scheme', 'schemes', 'subsidy', 'subsidies', 'eligibility', 'benefit', 'benefits', 
    'yojana', 'apply', 'documents', 'government help', 'sarkari', 'pradhan mantri',
    'application', 'form', 'registration', 'enrollment', 'financial aid', 'assistance',
    'welfare', 'pension', 'allowance', 'grant', 'scholarship'
  ],
  agriculture: [
    'crop', 'farming', 'farmer', 'soil', 'irrigation', 'fertilizer', 'pest', 'mandi',
    'kisan', 'agriculture', 'harvest', 'seeds', 'pesticide', 'cultivation', 'land',
    'field', 'produce', 'yield', 'monsoon', 'drought', 'rain', 'water', 'borewell'
  ],
  commerce: [
    'business', 'sell', 'marketplace', 'amazon', 'export', 'pricing', 'logistics', 'supply chain',
    'flipkart', 'ecommerce', 'online business', 'shop', 'vendor', 'supplier', 'merchant',
    'import', 'customs', 'shipping', 'delivery', 'product', 'inventory', 'profit', 'revenue'
  ],
  tourism: [
    'travel', 'trip', 'tour', 'visa', 'city', 'transport', 'hotel', 'itinerary', 'safety',
    'tourist', 'vacation', 'destination', 'flight', 'train', 'taxi', 'guide', 'sightseeing',
    'accommodation', 'booking', 'tourism', 'visit', 'explore', 'heritage', 'culture'
  ],
  legal: [
    'legal', 'rights', 'complaint', 'landlord', 'fir', 'police', 'fraud', 'court', 'law',
    'advocate', 'lawyer', 'case', 'dispute', 'tenant', 'property', 'eviction', 'harassment',
    'consumer', 'refund', 'cheating', 'contract', 'agreement', 'notice', 'justice'
  ],
  career: [
    'career', 'after 12th', 'course', 'job', 'skills', 'college', 'roadmap', 'salary',
    'education', 'degree', 'diploma', 'training', 'placement', 'interview', 'resume',
    'engineering', 'medicine', 'entrance', 'exam', 'university', 'institute', 'profession'
  ],
};

const INTENT_TO_DOMAIN: Record<IntentName, EngineId | null> = {
  scheme_eligibility: 'scheme',
  agriculture_farming: 'agriculture',
  global_seller_intelligence: 'commerce',
  pre_arrival: 'tourism',
  pre_arrival_planning: 'tourism',
  city_navigation: 'tourism',
  payment_money: 'tourism',
  emergency_assistance: 'tourism',
  food_safety: 'tourism',
  expat_longstay: 'tourism',
  language_survival: 'tourism',
  legal_cultural: 'tourism',
  legal_rights: 'legal',
  career_intelligence: 'career',
  general_query: null,
};

const DOMAIN_LABEL: Record<EngineId, string> = {
  scheme: 'Government Scheme Intelligence',
  agriculture: 'Agriculture Intelligence',
  commerce: 'Commerce Intelligence',
  tourism: 'Tourism Intelligence',
  legal: 'Legal Intelligence',
  career: 'Career Intelligence',
};

const DOMAIN_PROMPT: Record<EngineId, string> = {
  scheme: SCHEME_ENGINE_PROMPT,
  agriculture: AGRICULTURE_ENGINE_PROMPT,
  commerce: COMMERCE_ENGINE_PROMPT,
  tourism: TOURISM_ENGINE_PROMPT,
  legal: LEGAL_ENGINE_PROMPT,
  career: CAREER_ENGINE_PROMPT,
};

function countKeywordHits(query: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    return count + (query.includes(keyword) ? 1 : 0);
  }, 0);
}

function classifyDomains(userMessage: string, intent: IntentName, alternateIntents: IntentName[]): EngineId[] {
  const lower = userMessage.toLowerCase();
  const isAgriSchemeCoupledQuery =
    (
      lower.includes('subsidy') ||
      lower.includes('subsidies') ||
      lower.includes('scheme') ||
      lower.includes('schemes') ||
      lower.includes('yojana') ||
      lower.includes('benefit') ||
      lower.includes('benefits')
    ) &&
    (lower.includes('irrigation') || lower.includes('crop') || lower.includes('farmer') || lower.includes('farming') || lower.includes('soil'));

  const scores: Record<EngineId, number> = {
    scheme: 0,
    agriculture: 0,
    commerce: 0,
    tourism: 0,
    legal: 0,
    career: 0,
  };

  for (const domain of Object.keys(DOMAIN_KEYWORDS) as EngineId[]) {
    scores[domain] += countKeywordHits(lower, DOMAIN_KEYWORDS[domain]);
  }

  const primaryDomain = INTENT_TO_DOMAIN[intent];
  if (primaryDomain) {
    scores[primaryDomain] += 4;
  }

  for (const altIntent of alternateIntents) {
    const altDomain = INTENT_TO_DOMAIN[altIntent];
    if (altDomain) {
      scores[altDomain] += 2;
    }
  }

  if (isAgriSchemeCoupledQuery) {
    scores.scheme += 2;
    scores.agriculture += 2;
  }

  const ranked = (Object.keys(scores) as EngineId[])
    .map((domain) => ({ domain, score: scores[domain] }))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0);

  if (ranked.length === 0) {
    return ['scheme'];
  }

  if (isAgriSchemeCoupledQuery) {
    const prioritized: EngineId[] = [];
    const first = ranked[0]?.domain;
    if (first === 'agriculture' || first === 'scheme') {
      prioritized.push(first);
    }
    if (!prioritized.includes('agriculture')) prioritized.push('agriculture');
    if (!prioritized.includes('scheme')) prioritized.push('scheme');
    return prioritized;
  }

  const selected: EngineId[] = [ranked[0].domain];

  if (ranked[1] && ranked[1].score >= ranked[0].score - 1 && ranked[1].score >= 3) {
    selected.push(ranked[1].domain);
  }

  return selected;
}

async function runEngine(domain: EngineId, context: EngineRunContext): Promise<EngineOutput> {
  switch (domain) {
    case 'scheme':
      return runSchemeEngine(context);
    case 'agriculture':
      return runAgricultureEngine(context);
    case 'commerce':
      return runCommerceEngine(context);
    case 'tourism':
      return runTourismEngine(context);
    case 'legal':
      return runLegalEngine(context);
    case 'career':
      return runCareerEngine(context);
    default:
      return runSchemeEngine(context);
  }
}

/** Build supporting context string for a domain — mirrors what each engine does internally. */
function buildSupportingContext(domain: EngineId, context: EngineRunContext): string {
  const entityContext = context.extractedEntities
    ? Object.entries(context.extractedEntities)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : '';

  const parts: string[] = [];

  if (domain === 'scheme') {
    parts.push(
      context.profileSummary
        ? `Known citizen profile details:\n${context.profileSummary}`
        : 'No profile details available yet. Infer what you can from the question and ask clarifying questions to improve scheme matching.',
    );
  } else {
    if (context.profileSummary) parts.push(context.profileSummary);
  }

  if (context.languageContext) {
    parts.push(`Language requirement:\n${context.languageContext}`);
  }

  if (entityContext) parts.push(`Extracted entities: ${entityContext}`);

  if (domain === 'legal') {
    if (context.extractedEntities?.legalCategory)
      parts.push(`Legal category detected: ${context.extractedEntities.legalCategory}`);
    if (context.extractedEntities?.urgency)
      parts.push(`Urgency level: ${context.extractedEntities.urgency}`);
  }

  const fallbacks: Record<EngineId, string> = {
    scheme: 'No profile details. Ask clarifying questions in Section 5.',
    agriculture: 'No additional farming context. Infer region, season, and crop from the question.',
    commerce: 'No additional business context. Infer product category and business stage from the question.',
    tourism: 'No additional travel context. Infer destination, duration, budget from the question.',
    legal: 'No additional legal context. Identify the legal category and jurisdiction from the question.',
    career: 'No additional career context. Infer education level, interests, and constraints from the question.',
  };

  return parts.filter(Boolean).join('\n\n') || fallbacks[domain];
}

export interface SuperRouterInput {
  userMessage: string;
  origin: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  profileSummary?: string;
  selectedLanguage?: string;
  responseLanguage?: string;
  hasLanguageOverride?: boolean;
  languageContext?: string;
}

export interface SuperRouterOutput {
  response: string;
  intent: string;
  confidence: number;
  routedDomains: EngineId[];
  intentConfidence: number;
}

/** Metadata returned alongside the streaming generator. */
export interface StreamRouterMeta {
  intent: string;
  routedDomains: EngineId[];
  intentConfidence: number;
}

// ─── Shared helper ──────────────────────────────────────────────────────────

function analyzeAndClassify(userMessage: string) {
  const analysis = detectIntent(userMessage);
  const alt = (analysis.alternateIntents || []).map((item) => item.intent as IntentName);
  const domains = classifyDomains(userMessage, analysis.primaryIntent as IntentName, alt);
  return { analysis, domains };
}

function buildEngineContext(input: SuperRouterInput, analysis: ReturnType<typeof detectIntent>): EngineRunContext {
  return {
    userMessage: input.userMessage,
    conversationHistory: input.conversationHistory,
    selectedLanguage: input.selectedLanguage,
    responseLanguage: input.responseLanguage,
    hasLanguageOverride: input.hasLanguageOverride,
    languageContext: input.languageContext,
    origin: input.origin,
    intent: analysis.primaryIntent,
    profileSummary: input.profileSummary,
    extractedEntities: analysis.extractedEntities as Record<string, unknown>,
  };
}

// ─── Non-streaming path ─────────────────────────────────────────────────────

export async function runSuperRouter(input: SuperRouterInput): Promise<SuperRouterOutput> {
  const { analysis, domains } = analyzeAndClassify(input.userMessage);
  const engineContext = buildEngineContext(input, analysis);

  const outputs = await Promise.all(domains.map((domain) => runEngine(domain, engineContext)));

  let response: string;

  if (outputs.length === 1) {
    response = outputs[0].reasoningText;
  } else {
    response = await synthesizeUnifiedResponse({
      userMessage: input.userMessage,
      conversationHistory: input.conversationHistory,
      perDomainReasoning: outputs.map((out) => ({
        domain: DOMAIN_LABEL[out.engineId],
        analysis: out.reasoningText,
      })),
      languageContext: input.languageContext,
      responseLanguage: input.responseLanguage,
    });
  }

  return {
    response,
    intent: analysis.primaryIntent,
    confidence: 1,
    routedDomains: domains,
    intentConfidence: analysis.confidence,
  };
}

// ─── Streaming path ─────────────────────────────────────────────────────────

/**
 * SSE-friendly streaming super router.
 *
 * Single domain  → streams LLM tokens directly (instant first token).
 * Multi domain   → runs engines in parallel (non-streaming), then streams synthesis.
 *
 * Returns { stream, meta } so the caller can emit metadata alongside the SSE events.
 */
export async function streamSuperRouter(
  input: SuperRouterInput,
): Promise<{ stream: AsyncGenerator<string>; meta: StreamRouterMeta }> {
  const { analysis, domains } = analyzeAndClassify(input.userMessage);
  const engineContext = buildEngineContext(input, analysis);

  const meta: StreamRouterMeta = {
    intent: analysis.primaryIntent,
    routedDomains: domains,
    intentConfidence: analysis.confidence,
  };

  if (domains.length === 1) {
    // Stream single-domain directly — fastest time-to-first-token.
    const domain = domains[0];
    const supportingContext = buildSupportingContext(domain, engineContext);

    const stream = streamReasoningLLM({
      domainPrompt: DOMAIN_PROMPT[domain],
      userMessage: input.userMessage,
      conversationHistory: input.conversationHistory,
      supportingContext,
      languageContext: input.languageContext,
    });

    return { stream, meta };
  }

  // Multi-domain: run engines in parallel (fast, no HTTP calls),
  // then stream the unified synthesis.
  const outputs = await Promise.all(domains.map((domain) => runEngine(domain, engineContext)));

  const stream = streamSynthesizeUnifiedResponse({
    userMessage: input.userMessage,
    conversationHistory: input.conversationHistory,
    perDomainReasoning: outputs.map((out) => ({
      domain: DOMAIN_LABEL[out.engineId],
      analysis: out.reasoningText,
    })),
    languageContext: input.languageContext,
    responseLanguage: input.responseLanguage,
  });

  return { stream, meta };
}

import { callBedrock } from '@/lib/bedrock';

type UdyogLanguage = 'en' | 'te' | 'hi' | 'ta';

interface UdyogRequest {
  state: string;
  workType: string;
  monthlyIncomeRange?: string;
  goal: string;
  description: string;
  language?: string;
  followUpMessage?: string;
  journeyHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface UdyogResponse {
  explanation: string;
  stepsToTake: string[];
  governmentOptions: string[];
  documentsNeeded: string[];
  nextMilestone: string;
  voiceReadyText: string;
}

function normalizeLanguage(language?: string): UdyogLanguage {
  if (language === 'te' || language === 'hi' || language === 'ta' || language === 'en') {
    return language;
  }
  return 'en';
}

function languageName(language: UdyogLanguage): string {
  if (language === 'hi') return 'Hindi';
  if (language === 'te') return 'Telugu';
  if (language === 'ta') return 'Tamil';
  return 'English';
}

function detectIntent(text: string): 'credit' | 'formalization' | 'digital' | 'accounting' | 'growth' | 'guidance' {
  const value = text.toLowerCase();

  if (value.includes('loan') || value.includes('mudra') || value.includes('finance')) return 'credit';
  if (value.includes('register') || value.includes('udyam') || value.includes('license')) return 'formalization';
  if (value.includes('upi') || value.includes('payment') || value.includes('qr')) return 'digital';
  if (value.includes('profit') || value.includes('manage money')) return 'accounting';
  if (value.includes('grow') || value.includes('expand')) return 'growth';

  return 'guidance';
}

function recommendedGovernmentOptions(intent: string): string[] {
  if (intent === 'credit') {
    return ['Pradhan Mantri MUDRA Yojana (Shishu/Kishore/Tarun)', 'Jan-Dhan account linkage for formal banking history', 'District Industries Centre guidance desk'];
  }
  if (intent === 'formalization') {
    return ['Udyam Registration portal', 'District Industries Centre (DIC)', 'State MSME facilitation desk'];
  }
  if (intent === 'digital') {
    return ['UPI QR onboarding through bank', 'Jan-Dhan + RuPay + UPI linkage', 'Common Service Centre digital onboarding'];
  }
  if (intent === 'accounting') {
    return ['MSME facilitation center bookkeeping support', 'Common Service Centre record-keeping help', 'State livelihood mission enterprise training'];
  }
  if (intent === 'growth') {
    return ['MSME Development Institute mentorship', 'State MSME subsidy and support cells', 'District Industries Centre scale-up support'];
  }

  return ['Udyam Registration portal', 'District Industries Centre', 'Common Service Centre for assisted onboarding'];
}

function defaultDocuments(intent: string): string[] {
  if (intent === 'credit') {
    return ['Aadhaar', 'PAN (if available)', 'Basic business activity proof', 'Recent bank passbook/statement', 'Simple income estimate'];
  }
  if (intent === 'formalization') {
    return ['Aadhaar number', 'PAN number', 'Mobile linked with Aadhaar', 'Business activity details', 'Bank account details'];
  }
  if (intent === 'digital') {
    return ['Active bank account', 'Mobile number linked to bank account', 'Identity proof', 'Shop/business name for QR display'];
  }
  if (intent === 'accounting' || intent === 'growth') {
    return ['Daily sales notebook', 'Expense list (rent, stock, travel)', 'Bank transaction list', 'Any existing registration details'];
  }

  return ['Aadhaar', 'Bank account details', 'Basic work/business description'];
}

function buildPrompt(input: UdyogRequest, intent: string, language: UdyogLanguage): string {
  const history = (input.journeyHistory ?? []).slice(-6);
  const historyText = history.length
    ? history.map((item, idx) => `${idx + 1}. ${item.role.toUpperCase()}: ${item.content}`).join('\n')
    : 'No prior history yet.';

  const followUpText = input.followUpMessage ? `Follow-up from user: ${input.followUpMessage}` : 'No follow-up yet. Start journey from current context.';

  const options = recommendedGovernmentOptions(intent).join('; ');
  const docs = defaultDocuments(intent).join('; ');

  return `You are UDYOG, acting as both:
1) A Government MSME facilitation officer
2) A practical small-business mentor for first-time entrepreneurs

Citizen profile:
- State: ${input.state}
- Type of Work: ${input.workType}
- Monthly Income Range: ${input.monthlyIncomeRange || 'Not shared'}
- Goal: ${input.goal}
- Detected Intent: ${intent}
- Situation in user words: ${input.description}
- ${followUpText}

Journey history (continue journey, do not restart if follow-up is present):
${historyText}

Instruction priorities:
- Give step-by-step business formalization guidance in plain language.
- Assume user has never done paperwork before.
- Explain WHY each step matters.
- Use Indian government-supported pathways like Udyam, MUDRA, Jan-Dhan, UPI where relevant.
- Be practical and action-focused for what user can do now.
- Adapt guidance to state context where possible.

Guardrails (must follow):
- Do not give tax/legal certification advice.
- Do not promise loan approval.
- Do not recommend private lenders.
- Do not provide financial projections.
- Use wording like: "You can apply through this government-supported process..."

Response language:
- Respond fully in ${languageName(language)} only.
- No mixed-language output.

Return strict JSON only (no markdown):
{
  "explanation": "What this means for you",
  "stepsToTake": ["Step 1", "Step 2", "Step 3"],
  "governmentOptions": ["Relevant scheme or support"],
  "documentsNeeded": ["If applicable"],
  "nextMilestone": "What to do after this is completed",
  "voiceReadyText": "Simplified spoken guidance in short sentences without bullets or symbols"
}

Use these context anchors where relevant:
- Suggested government options: ${options}
- Typical documents: ${docs}
`;
}

function fallbackResponse(intent: string): UdyogResponse {
  return {
    explanation: 'You can start your business formalization journey step by step through government-supported channels.',
    stepsToTake: [
      'Step 1: Keep Aadhaar, bank details, and your business activity details ready.',
      'Step 2: Complete Udyam registration through official support channels if not already registered.',
      'Step 3: Based on your goal, proceed to MUDRA, UPI setup, or bookkeeping support.',
    ],
    governmentOptions: recommendedGovernmentOptions(intent),
    documentsNeeded: defaultDocuments(intent),
    nextMilestone: 'Complete one formal step this week and return with “Done — what next?” to continue the journey.',
    voiceReadyText: 'You can move step by step. First prepare your basic documents. Then complete one government-supported process. Come back after finishing it and I will guide your next step.',
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<UdyogRequest>;

    if (!body.state || !body.workType || !body.goal || !body.description) {
      return new Response(JSON.stringify({ error: 'Missing required fields: state, workType, goal, description' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const input: UdyogRequest = {
      state: body.state,
      workType: body.workType,
      monthlyIncomeRange: body.monthlyIncomeRange,
      goal: body.goal,
      description: body.description,
      language: body.language,
      followUpMessage: body.followUpMessage,
      journeyHistory: body.journeyHistory ?? [],
    };

    const combinedText = `${input.goal} ${input.description} ${input.followUpMessage ?? ''}`;
    const intent = detectIntent(combinedText);
    const language = normalizeLanguage(input.language);

    const prompt = buildPrompt(input, intent, language);
    const raw = await callBedrock(prompt, {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 1600,
      temperature: 0.25,
    });

    let parsed: UdyogResponse;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in model response');
      }

      const data = JSON.parse(jsonMatch[0]) as Partial<UdyogResponse>;
      parsed = {
        explanation: data.explanation || fallbackResponse(intent).explanation,
        stepsToTake: Array.isArray(data.stepsToTake) ? data.stepsToTake : fallbackResponse(intent).stepsToTake,
        governmentOptions: Array.isArray(data.governmentOptions) ? data.governmentOptions : recommendedGovernmentOptions(intent),
        documentsNeeded: Array.isArray(data.documentsNeeded) ? data.documentsNeeded : defaultDocuments(intent),
        nextMilestone: data.nextMilestone || fallbackResponse(intent).nextMilestone,
        voiceReadyText: data.voiceReadyText || fallbackResponse(intent).voiceReadyText,
      };
    } catch {
      parsed = fallbackResponse(intent);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to generate UDYOG guidance',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// UDYOG — Micro-Business & Financial Mentor Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText, synthesizeSpeech } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

const MODULES = [
  "credit",
  "formalization",
  "digital",
  "growth",
  "schemes",
  "general",
] as const;

type UdyogModule = (typeof MODULES)[number];

function detectModule(question: string): UdyogModule {
  const q = question.toLowerCase();
  if (/loan|credit|mudra|kcc|bank|finance|interest|emi/.test(q)) return "credit";
  if (/register|gst|msme|udyam|license|permit|fssai/.test(q)) return "formalization";
  if (/digital|upi|payment|website|online|app|social.?media|marketing/.test(q)) return "digital";
  if (/grow|expand|scale|hire|franchise|export|diversif/.test(q)) return "growth";
  if (/scheme|subsid|stand.?up|start.?up|pmegp/.test(q)) return "schemes";
  return "general";
}

const SYSTEM_PROMPTS: Record<UdyogModule, string> = {
  credit: `You are UDYOG, India's AI micro-business mentor. Focus on CREDIT & LOANS:
- MUDRA loans (Shishu ≤₹50K, Kishore ≤₹5L, Tarun ≤₹10L) — no collateral
- Stand Up India (₹10L–₹1Cr for SC/ST/Women)
- PMEGP (15-35% subsidy on project cost up to ₹50L manufacturing / ₹20L service)
- KCC for farmer-entrepreneurs
- PSB Loans in 59 Minutes portal
Guide through application process step-by-step.`,

  formalization: `You are UDYOG, India's AI micro-business mentor. Focus on BUSINESS REGISTRATION:
- Udyam Registration (free, udyamregistration.gov.in) — Micro/Small/Medium criteria
- GST registration (threshold: ₹20L services, ₹40L goods)
- FSSAI (food business: ₹100 registration, ₹2000-5000 license)
- Shop & Establishment Act (state-specific)
- Trade license from municipality
Give exact steps, documents needed, fees, and timelines.`,

  digital: `You are UDYOG, India's AI micro-business mentor. Focus on DIGITAL TRANSFORMATION:
- UPI & payment acceptance (PhonePe/GPay business)
- Google My Business listing (free)
- Social media marketing basics
- Simple website via Google Sites / WordPress
- GeM (Government e-Marketplace) registration for govt contracts
- ONDC (Open Network for Digital Commerce)
Give practical, low-cost action steps.`,

  growth: `You are UDYOG, India's AI micro-business mentor. Focus on BUSINESS GROWTH:
- Market expansion strategies
- Hiring first employees (ESIC, EPF registration thresholds)
- Supply chain optimization
- Product diversification
- Export readiness (IEC code, DGFT registration)
- Franchise model basics
Give stage-appropriate advice.`,

  schemes: `You are UDYOG, India's AI micro-business mentor. Focus on GOVERNMENT SCHEMES:
- PMEGP (Khadi & Village Industries Commission)
- MUDRA Yojana (via banks)
- Stand Up India
- NSIC subsidies
- State-specific schemes (DIC district industries centre)
- MSME Samadhan (delayed payment portal)
- GeM registration for govt procurement
Give eligibility, benefits, and application process.`,

  general: `You are UDYOG, India's AI micro-business mentor helping street vendors, home businesses, small shops, and aspiring entrepreneurs. Cover credit, registration, digital tools, and growth. Be practical and encouraging. Always start with the easiest, cheapest next step.`,
};

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    question,
    description,
    workType,
    state,
    monthlyIncomeRange,
    goal,
    module: requestedModule,
    language = "en",
    userId = "anonymous",
    journeyHistory = [],
  } = body;

  const userMessage = question || description || "";
  if (!userMessage) return err(400, "question or description is required");

  const module: UdyogModule =
    (requestedModule as UdyogModule) || detectModule(userMessage);

  try {
    const englishQ =
      language !== "en"
        ? await translateText(userMessage, "en", language)
        : userMessage;

    const contextParts = [
      `Business type: ${workType || "unknown"}`,
      state ? `State: ${state}` : "",
      monthlyIncomeRange ? `Monthly income range: ${monthlyIncomeRange}` : "",
      goal ? `Goal: ${goal}` : "",
      journeyHistory.length
        ? `Previous conversation:\n${journeyHistory
            .slice(-4)
            .map((h: any) => `${h.role}: ${h.content}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ai = await invokeBedrockClaude({
      systemPrompt: SYSTEM_PROMPTS[module],
      userMessage: `${contextParts}\n\nUser's question: ${englishQ}`,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    const voice = await synthesizeSpeech(
      responseText.replace(/[*#_`|]/g, "").slice(0, 2000),
      language
    );

    await logQuery({
      userId,
      engine: "udyog",
      query: { question: userMessage, module, workType, state },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "udyog",
      module,
      response: responseText,
      voiceAudioBase64: voice ? voice.toString("base64") : null,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[UDYOG] Error:", error);
    return err(500, `Udyog engine error: ${error.message}`);
  }
}

// NYAYA — Legal Rights Engine Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText, synthesizeSpeech } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

const LEGAL_CATEGORIES = [
  "labor",
  "consumer",
  "housing",
  "family",
  "property",
  "rti",
  "cyber",
  "criminal",
  "general",
] as const;

type LegalCategory = (typeof LEGAL_CATEGORIES)[number];

function detectCategory(question: string): LegalCategory {
  const q = question.toLowerCase();
  if (/wage|salary|worker|dismiss|factory|labour|overtime|pf|esi/.test(q)) return "labor";
  if (/product|refund|defective|warranty|consumer|billing|overcharg/.test(q)) return "consumer";
  if (/rent|landlord|tenant|evict|deposit|lease|housing|flat/.test(q)) return "housing";
  if (/divorce|custody|maintenance|dowry|domestic|alimony|marriage/.test(q)) return "family";
  if (/land|property|registr|mutation|encroach|boundary|will|inherit/.test(q)) return "property";
  if (/rti|right to information|transparency|public.*record/.test(q)) return "rti";
  if (/cyber|online|hack|fraud|phishing|identity.*theft|social.*media/.test(q)) return "cyber";
  if (/fir|police|bail|arrest|criminal|cheat|theft/.test(q)) return "criminal";
  return "general";
}

const SYSTEM_PROMPTS: Record<LegalCategory, string> = {
  labor: `You are NYAYA, India's AI legal rights advisor specializing in LABOR LAW. Cover: Payment of Wages Act, Minimum Wages Act, Industrial Disputes Act, Factories Act, Contract Labour Act, EPF, ESI, Gratuity. Cite specific sections. Mention Labour Commissioner complaint process.`,
  consumer: `You are NYAYA, India's AI legal rights advisor specializing in CONSUMER RIGHTS. Cover: Consumer Protection Act 2019, e-Commerce rules, CCPA, Consumer Forum filing (district/state/national), online complaint at consumerhelpline.gov.in. Cite timelines and fee structures.`,
  housing: `You are NYAYA, India's AI legal rights advisor specializing in HOUSING & TENANT LAW. Cover: State Rent Control Acts, RERA (Real Estate Regulation Act), Transfer of Property Act. Explain rights for both tenants and landlords. Mention Rent Authority process.`,
  family: `You are NYAYA, India's AI legal rights advisor specializing in FAMILY LAW. Cover: Hindu Marriage Act, Special Marriage Act, Domestic Violence Act 2005, Dowry Prohibition Act, Hindu Succession Act, Maintenance (CrPC 125). Mention family courts and legal aid.`,
  property: `You are NYAYA, India's AI legal rights advisor specializing in PROPERTY LAW. Cover: Transfer of Property Act, Registration Act, Indian Succession Act, mutation process, encumbrance certificates, land records digitization. Mention Sub-Registrar process.`,
  rti: `You are NYAYA, India's AI legal rights advisor specializing in RIGHT TO INFORMATION. Cover: RTI Act 2005, fee (₹10), 30-day response timeline, first appeal, second appeal to Information Commission. Provide RTI application template.`,
  cyber: `You are NYAYA, India's AI legal rights advisor specializing in CYBER LAW. Cover: IT Act 2000 (sections 43, 66, 66A-66F, 67), cybercrime.gov.in portal, reporting to Cyber Crime Cell. Mention Data Protection Act provisions.`,
  criminal: `You are NYAYA, India's AI legal rights advisor specializing in CRIMINAL LAW. Cover: CrPC (now BNSS), IPC (now BNS), FIR filing rights, bail provisions, Zero FIR, anticipatory bail. Mention free legal aid (NALSA, DLSA).`,
  general: `You are NYAYA, India's AI legal rights advisor. Identify the legal domain and provide practical guidance with specific law references, processes, and contact points. Always mention free legal aid (NALSA/DLSA) availability.`,
};

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    question,
    category: requestedCategory,
    state,
    language = "en",
    userId = "anonymous",
  } = body;

  if (!question) return err(400, "question is required");

  const category: LegalCategory =
    (requestedCategory as LegalCategory) || detectCategory(question);

  try {
    const englishQ =
      language !== "en"
        ? await translateText(question, "en", language)
        : question;

    const ai = await invokeBedrockClaude({
      systemPrompt: `${SYSTEM_PROMPTS[category]}\n\nIMPORTANT RULES:\n- Always suggest LEGAL AID (free) for economically weaker sections\n- Mention specific form numbers and websites\n- Give step-by-step process\n- Mention timelines and costs\n- Warn about limitation periods\n- State: ${state || "general (mention state-specific variations)"}`,
      userMessage: englishQ,
      temperature: 0.2,
      maxTokens: 1500,
    });

    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    const voiceText = responseText.replace(/[*#_`|]/g, "").slice(0, 2000);
    const voice = await synthesizeSpeech(voiceText, language);

    await logQuery({
      userId,
      engine: "nyaya",
      query: { question, category, state },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "nyaya",
      category,
      response: responseText,
      voiceReadyText: voiceText,
      voiceAudioBase64: voice ? voice.toString("base64") : null,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[NYAYA] Error:", error);
    return err(500, `Nyaya engine error: ${error.message}`);
  }
}

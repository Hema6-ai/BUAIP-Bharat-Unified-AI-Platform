// UNIFIED-AI — Super Router Lambda
// Routes to the correct engine based on user query, maintains session
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

// In production, use DynamoDB for sessions. This is a Lambda-level cache
// that works within a single warm instance.
const sessions = new Map<string, { profile: any; history: any[]; lastAccess: number }>();
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

function getSession(id: string) {
  const s = sessions.get(id);
  if (s && Date.now() - s.lastAccess < SESSION_TTL) {
    s.lastAccess = Date.now();
    return s;
  }
  const fresh = { profile: {}, history: [] as any[], lastAccess: Date.now() };
  sessions.set(id, fresh);
  return fresh;
}

// ─── Intent detection via pattern matching ──────────────────────────────────

type Engine =
  | "annadata"
  | "nyaya"
  | "udyog"
  | "pathai"
  | "atithi"
  | "globalseller"
  | "scheme"
  | "governance"
  | "india-insider"
  | "general";

function detectEngine(query: string): Engine {
  const q = query.toLowerCase();

  // Agriculture / Farming
  if (/farm|crop|mandi|harvest|soil|irrigat|kisan|खेत|किसान|పంట|వ్యవసాయం|seed|fertiliz|weather.*crop|rain.*farm/.test(q))
    return "annadata";

  // Legal
  if (/law|legal|right|court|fir|bail|divorce|consumer.*complaint|tenant|rti|wage.*disput|police|advocate|न्याय|చట్టం/.test(q))
    return "nyaya";

  // Business / Entrepreneurship
  if (/business|loan|mudra|gst|register.*shop|startup|entrepreneur|msme|udyam|व्यापार|వ్యాపారం/.test(q))
    return "udyog";

  // Career
  if (/career|college|exam|neet|jee|upsc|job|salary|course|stream|education.*path|करियर|కెరీర్/.test(q))
    return "pathai";

  // Travel
  if (/travel|tour|visit|destination|hotel|flight|temple|monument|trek|safari|यात्रा|ప్రయాణం/.test(q))
    return "atithi";

  // Export / E-commerce
  if (/export|import|amazon.*sell|cross.?border|iec|ecommerce|international.*sell|customs.*duty/.test(q))
    return "globalseller";

  // Government schemes
  if (/scheme|yojana|subsid|pension|scholarship|benefit|eligib|pm.?ay|pm.?kisan|bpl|योजना|పథకం/.test(q))
    return "scheme";

  // India Insider (travel + cultural)
  if (/india.*arriv|expat|visa|embassy|emergency.*india|food.*safe|payment.*india|city.*navigat/.test(q))
    return "india-insider";

  // Governance / Policy
  if (/governance|policy|budget|parliament|constitution|election|democracy/.test(q))
    return "governance";

  return "general";
}

// ─── Lambda Handler ─────────────────────────────────────────────────────────

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    message,
    question,
    sessionId = "default",
    language = "en",
    userId = "anonymous",
    capability,
  } = body;

  const userMessage = message || question || "";
  if (!userMessage) return err(400, "message is required");

  const session = getSession(sessionId);
  const detectedEngine: Engine = capability
    ? (capability as Engine)
    : detectEngine(userMessage);

  try {
    // Translate input if needed
    const englishMsg =
      language !== "en"
        ? await translateText(userMessage, "en", language)
        : userMessage;

    // Build conversation context
    const historyCtx = session.history
      .slice(-6)
      .map((h) => `${h.role}: ${h.content}`)
      .join("\n");

    const profileCtx = Object.keys(session.profile).length
      ? `User profile: ${JSON.stringify(session.profile)}`
      : "";

    const systemPrompt = `You are BUAIP (Bharat Unified AI Platform), India's comprehensive AI assistant.
You have 8 specialized engines:
1. ANNADATA — Farmer advisory (crops, prices, weather, schemes)
2. NYAYA — Legal rights (labor, consumer, housing, family, RTI)
3. UDYOG — Business mentorship (loans, registration, digital, growth)
4. PATHAI — Career guidance (matching, colleges, roadmaps)
5. ATITHI — Travel & tourism (destinations, safety, culture)
6. GLOBALSELLER — Export intelligence (marketplace, compliance, logistics)
7. SCHEME — Government scheme eligibility (70+ schemes across 7 domains)
8. INDIA INSIDER — Living in India guide (expats, payments, emergency)

Current engine: ${detectedEngine}
${profileCtx}

Respond helpfully in the context of the detected domain. If the query spans multiple domains, address the primary need first and mention other relevant engines.
Keep responses focused, practical, and actionable. Under 500 words.`;

    const ai = await invokeBedrockClaude({
      systemPrompt,
      userMessage: historyCtx
        ? `${historyCtx}\n\nuser: ${englishMsg}`
        : englishMsg,
      temperature: 0.3,
      maxTokens: 1500,
    });

    // Translate output
    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    // Update session
    session.history.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: responseText }
    );
    if (session.history.length > 20) {
      session.history = session.history.slice(-12);
    }

    await logQuery({
      userId,
      engine: "unified-ai",
      query: { message: userMessage, detectedEngine },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "unified-ai",
      routedTo: detectedEngine,
      response: responseText,
      sessionId,
      profile: session.profile,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[UNIFIED-AI] Error:", error);
    return err(500, `Unified AI error: ${error.message}`);
  }
}

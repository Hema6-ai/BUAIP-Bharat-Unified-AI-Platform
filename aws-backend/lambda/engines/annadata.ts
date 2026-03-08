// ANNADATA — Farmer Advisory Lambda
// Real mandi prices + weather + Bedrock AI + Polly voice
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import {
  getMandiPrice,
  getMandiPriceHistory,
  getWeather,
  logQuery,
} from "../shared/dynamodb";
import { synthesizeSpeech, translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

// ─── Advisory panels ────────────────────────────────────────────────────────

const PANELS = [
  "market",
  "weather",
  "scheme",
  "crop_advisor",
  "mandi_price",
  "weather_advisor",
  "disease_doctor",
  "seeds_fertilizer",
  "soil_health",
  "irrigation_planner",
  "loan_insurance",
  "smart_selling",
  "general",
] as const;

type Panel = (typeof PANELS)[number];

function detectPanel(question: string): Panel {
  const q = question.toLowerCase();
  if (/mandi|price|sell|market|rate|बाज़ार|ధర/.test(q)) return "mandi_price";
  if (/weather|rain|forecast|मौसम|వాతావరణం/.test(q)) return "weather_advisor";
  if (/scheme|subsid|pm.?kisan|योजना|పథకం/.test(q)) return "scheme";
  if (/disease|pest|rot|blight|wilt|कीट|తెగులు/.test(q)) return "disease_doctor";
  if (/seed|fertiliz|urea|dap|बीज|విత్తనం/.test(q)) return "seeds_fertilizer";
  if (/soil|pH|मिट्टी|నేల/.test(q)) return "soil_health";
  if (/irrigat|water|drip|सिंचाई|నీటిపారుదల/.test(q)) return "irrigation_planner";
  if (/loan|credit|insur|KCC|ऋण|రుణం/.test(q)) return "loan_insurance";
  if (/crop|sow|harvest|plant|फसल|పంట/.test(q)) return "crop_advisor";
  return "general";
}

// ─── Build market signals with REAL data from DynamoDB ──────────────────────

async function getMarketSignals(crop: string, state: string) {
  const [latestPrice, history, weather] = await Promise.all([
    getMandiPrice(crop, state),
    getMandiPriceHistory(crop, state, 30),
    getWeather(state),
  ]);

  // Compute trend from history
  let trend = "stable";
  if (history.length >= 5) {
    const recent = history.slice(-5).map((h) => h.modalPrice);
    const older = history.slice(-10, -5).map((h) => h.modalPrice);
    if (recent.length && older.length) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg > olderAvg * 1.05) trend = "rising";
      else if (recentAvg < olderAvg * 0.95) trend = "falling";
    }
  }

  return {
    price: latestPrice
      ? {
          crop: latestPrice.crop,
          state: latestPrice.state,
          market: latestPrice.market,
          modalPrice: latestPrice.modalPrice,
          minPrice: latestPrice.minPrice,
          maxPrice: latestPrice.maxPrice,
          unit: latestPrice.unit || "₹/quintal",
          date: latestPrice.date,
          trend,
          history7d: history.slice(-7).map((h) => ({
            date: h.date,
            price: h.modalPrice,
          })),
        }
      : null,
    weather: weather
      ? {
          temperature: weather.temperature,
          humidity: weather.humidity,
          rainfall: weather.rainfall,
          rainfallRisk: weather.rainfallRisk,
          forecast: weather.forecast7Day,
          condition: weather.condition,
        }
      : null,
  };
}

// ─── System prompts per panel ───────────────────────────────────────────────

function getSystemPrompt(panel: Panel, signals: any): string {
  const base = `You are ANNADATA, India's trusted AI farming advisor. You speak directly to the farmer in their language. Be practical, specific, and cite real numbers when available. Keep responses under 400 words.`;

  const priceCtx = signals.price
    ? `\n\nREAL MARKET DATA (today):\n- ${signals.price.crop} in ${signals.price.state}: ₹${signals.price.modalPrice}/${signals.price.unit}\n- Range: ₹${signals.price.minPrice}–₹${signals.price.maxPrice}\n- Market: ${signals.price.market}\n- Trend: ${signals.price.trend}\n- Last 7 days: ${JSON.stringify(signals.price.history7d)}`
    : "\n\nNo live market data available. Use general knowledge but mention that live prices should be checked at local mandi.";

  const weatherCtx = signals.weather
    ? `\n\nREAL WEATHER DATA:\n- Temperature: ${signals.weather.temperature}°C\n- Humidity: ${signals.weather.humidity}%\n- Rainfall: ${signals.weather.rainfall}mm\n- Rainfall Risk: ${signals.weather.rainfallRisk}\n- Condition: ${signals.weather.condition}\n- 7-day forecast: ${signals.weather.forecast}`
    : "";

  const panelPrompts: Record<Panel, string> = {
    mandi_price: `${base}${priceCtx}\n\nFocus: Mandi price analysis. Give buy/sell/hold recommendation based on real data. Mention nearby mandis if relevant.`,
    market: `${base}${priceCtx}\n\nFocus: Market overview. Analyze price trends, suggest best selling window.`,
    weather_advisor: `${base}${weatherCtx}\n\nFocus: Weather-based farming advice. How to protect crops, schedule irrigation, plan harvesting.`,
    weather: `${base}${weatherCtx}\n\nFocus: Weather impact on farming decisions.`,
    scheme: `${base}\n\nFocus: Government schemes for farmers. Cover PM-KISAN, PM Fasal Bima, KCC, MSP, soil health card, eNAM. Give eligibility, benefits, and how to apply.`,
    crop_advisor: `${base}${weatherCtx}${priceCtx}\n\nFocus: Crop selection and growing advice. Best crops for the season, region, and market demand.`,
    disease_doctor: `${base}\n\nFocus: Crop disease identification and treatment. Ask for symptoms, suggest organic and chemical remedies. Recommend state agriculture university helpline.`,
    seeds_fertilizer: `${base}\n\nFocus: Seed varieties and fertilizer recommendations. Suggest certified seeds, balanced NPK, organic alternatives. Mention government subsidized rates.`,
    soil_health: `${base}\n\nFocus: Soil health and testing. Recommend soil testing labs, interpret soil health card results, suggest amendments.`,
    irrigation_planner: `${base}${weatherCtx}\n\nFocus: Irrigation planning. Water scheduling, drip irrigation benefits, rainwater harvesting, bore well management.`,
    loan_insurance: `${base}\n\nFocus: Agricultural finance. KCC application process, PM Fasal Bima claims, NABARD schemes, interest subvention. Guide through paperwork.`,
    smart_selling: `${base}${priceCtx}\n\nFocus: Smart selling strategies. eNAM registration, direct-to-consumer, FPO formation, value-added processing, cold storage options.`,
    general: `${base}${priceCtx}${weatherCtx}\n\nProvide comprehensive farming guidance based on the question.`,
  };

  return panelPrompts[panel] || panelPrompts.general;
}

// ─── Lambda Handler ─────────────────────────────────────────────────────────

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    question,
    crop,
    state,
    language = "en",
    panel: requestedPanel,
    userId = "anonymous",
  } = body;

  if (!question) return err(400, "question is required");

  const panel: Panel = (requestedPanel as Panel) || detectPanel(question);
  const effectiveCrop = crop || "Rice";
  const effectiveState = state || "Punjab";

  try {
    // 1. Fetch real data signals
    const signals = await getMarketSignals(effectiveCrop, effectiveState);

    // 2. Translate to English if needed (for better AI reasoning)
    const englishQuestion =
      language !== "en"
        ? await translateText(question, "en", language)
        : question;

    // 3. Call Bedrock Claude
    const systemPrompt = getSystemPrompt(panel, signals);
    const ai = await invokeBedrockClaude({
      systemPrompt,
      userMessage: `Farmer's question (crop: ${effectiveCrop}, state: ${effectiveState}): ${englishQuestion}`,
      temperature: 0.25,
      maxTokens: 1500,
    });

    // 4. Translate response to user's language
    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    // 5. Generate voice (optional)
    const voiceReadyText = responseText.replace(/[*#_`|]/g, "").slice(0, 2000);
    const voiceAudio = await synthesizeSpeech(voiceReadyText, language);

    // 6. Log to DynamoDB
    await logQuery({
      userId,
      engine: "annadata",
      query: { question, crop: effectiveCrop, state: effectiveState, panel },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "annadata",
      panel,
      response: responseText,
      voiceReadyText,
      voiceAudioBase64: voiceAudio ? voiceAudio.toString("base64") : null,
      marketData: signals.price,
      weatherData: signals.weather,
      metadata: {
        model: ai.model,
        tokensUsed: ai.inputTokens + ai.outputTokens,
        language,
        crop: effectiveCrop,
        state: effectiveState,
      },
    });
  } catch (error: any) {
    console.error("[ANNADATA] Error:", error);
    return err(500, `Annadata engine error: ${error.message}`);
  }
}

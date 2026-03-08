// ATITHI — Travel & Tourism Engine Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    question,
    destination,
    duration,
    interests,
    budget,
    travelType,
    language = "en",
    userId = "anonymous",
  } = body;

  if (!question) return err(400, "question is required");

  try {
    const englishQ =
      language !== "en"
        ? await translateText(question, "en", language)
        : question;

    const context = [
      destination ? `Destination: ${destination}` : "",
      duration ? `Duration: ${duration}` : "",
      interests ? `Interests: ${interests}` : "",
      budget ? `Budget: ${budget}` : "",
      travelType ? `Travel type: ${travelType}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ai = await invokeBedrockClaude({
      systemPrompt: `You are ATITHI, India's AI travel & tourism guide. Provide:
- Destination recommendations with best seasons to visit
- Day-by-day itineraries with time estimates
- Budget breakdowns (accommodation, food, transport, activities)
- Safety tips (8 categories: scams, health, transport, women safety, monsoon, wildlife, food hygiene, emergency contacts)
- Cultural etiquette (8 areas: temples, greetings, dress code, food customs, photography, bargaining, tipping, local customs)
- Payment advice (UPI, cards, cash, forex)
- Transport: trains (IRCTC), buses, flights, local auto/taxi apps
- Hidden gems and offbeat experiences
- Accessibility information
Always cite real prices and practical tips. Mention government tourism helpline 1800-11-1363.`,
      userMessage: `${context}\n\nTraveler's question: ${englishQ}`,
      temperature: 0.4,
      maxTokens: 1500,
    });

    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    await logQuery({
      userId,
      engine: "atithi",
      query: { question, destination },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "atithi",
      response: responseText,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[ATITHI] Error:", error);
    return err(500, `Atithi engine error: ${error.message}`);
  }
}

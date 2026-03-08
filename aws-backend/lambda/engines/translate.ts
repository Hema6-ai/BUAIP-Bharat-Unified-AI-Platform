// TRANSLATE — Multi-language translation Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const { text, sourceLanguage = "auto", targetLanguage } = body;

  if (!text) return err(400, "text is required");
  if (!targetLanguage) return err(400, "targetLanguage is required");

  try {
    const translated = await translateText(text, targetLanguage, sourceLanguage);
    return ok({
      translatedText: translated,
      sourceLanguage,
      targetLanguage,
    });
  } catch (error: any) {
    console.error("[TRANSLATE] Error:", error);
    return err(500, `Translation error: ${error.message}`);
  }
}

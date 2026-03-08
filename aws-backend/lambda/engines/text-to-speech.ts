// TEXT-TO-SPEECH — Polly TTS Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { synthesizeSpeech } from "../shared/polly-translate";
import { err, parseBody } from "../shared/response";

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  const body = parseBody(event);
  const { text, languageCode = "en" } = body;

  if (!text) return err(400, "text is required");

  try {
    const audio = await synthesizeSpeech(text, languageCode);
    if (!audio) return err(500, "Speech synthesis failed");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(audio.length),
      },
      body: audio.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error("[TTS] Error:", error);
    return err(500, `TTS error: ${error.message}`);
  }
}

// Shared Polly TTS + Translate helpers
import {
  PollyClient,
  SynthesizeSpeechCommand,
} from "@aws-sdk/client-polly";
import {
  TranslateClient,
  TranslateTextCommand,
} from "@aws-sdk/client-translate";

const REGION = process.env.AWS_REGION || "ap-south-1";

// ─── Polly TTS ──────────────────────────────────────────────────────────────

const VOICE_MAP: Record<string, { voiceId: string; lang: string }> = {
  en: { voiceId: "Kajal", lang: "en-IN" },
  hi: { voiceId: "Kajal", lang: "hi-IN" },
  te: { voiceId: "Kajal", lang: "en-IN" }, // Fallback — native Telugu voice not in Polly
  ta: { voiceId: "Kajal", lang: "en-IN" },
  kn: { voiceId: "Kajal", lang: "en-IN" },
  ml: { voiceId: "Kajal", lang: "en-IN" },
  mr: { voiceId: "Kajal", lang: "hi-IN" },
  bn: { voiceId: "Kajal", lang: "hi-IN" },
  gu: { voiceId: "Kajal", lang: "hi-IN" },
  pa: { voiceId: "Kajal", lang: "hi-IN" },
};

let pollyClient: PollyClient | null = null;

function getPolly(): PollyClient {
  if (!pollyClient) pollyClient = new PollyClient({ region: REGION });
  return pollyClient;
}

export async function synthesizeSpeech(
  text: string,
  language = "en"
): Promise<Buffer | null> {
  const mapping = VOICE_MAP[language] || VOICE_MAP["en"];
  const truncated = text.slice(0, 3000); // Polly limit

  try {
    const res = await getPolly().send(
      new SynthesizeSpeechCommand({
        Text: truncated,
        OutputFormat: "mp3",
        VoiceId: mapping.voiceId as any,
        LanguageCode: mapping.lang as any,
        Engine: "neural",
      })
    );

    if (res.AudioStream) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of res.AudioStream as any) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (err) {
    console.error("[Polly] synthesizeSpeech error:", err);
    return null;
  }
}

// ─── AWS Translate ──────────────────────────────────────────────────────────

const TRANSLATE_CODE_MAP: Record<string, string> = {
  en: "en",
  hi: "hi",
  te: "te",
  ta: "ta",
  kn: "kn",
  ml: "ml",
  mr: "mr",
  bn: "bn",
  gu: "gu",
  pa: "pa",
  ur: "ur",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
  zh: "zh",
  ja: "ja",
  ko: "ko",
  ar: "ar",
  ru: "ru",
};

let translateClient: TranslateClient | null = null;

function getTranslate(): TranslateClient {
  if (!translateClient) translateClient = new TranslateClient({ region: REGION });
  return translateClient;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = "auto"
): Promise<string> {
  if (!text.trim()) return text;
  const targetCode = TRANSLATE_CODE_MAP[targetLang] || targetLang;
  const sourceCode = sourceLang === "auto" ? "auto" : (TRANSLATE_CODE_MAP[sourceLang] || sourceLang);

  if (targetCode === sourceCode) return text;

  try {
    const res = await getTranslate().send(
      new TranslateTextCommand({
        Text: text.slice(0, 5000),
        SourceLanguageCode: sourceCode,
        TargetLanguageCode: targetCode,
      })
    );
    return res.TranslatedText || text;
  } catch (err) {
    console.error("[Translate] error:", err);
    return text;
  }
}

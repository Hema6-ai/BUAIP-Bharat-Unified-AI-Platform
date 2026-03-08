/**
 * AWS Polly Client Wrapper
 * Text-to-speech synthesis for all languages
 */

import {
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  OutputFormat,
} from "@aws-sdk/client-polly";
import { awsConfig } from "./config";

export const pollyClient = new PollyClient({
  region: awsConfig.region,
});

export type Language = "en" | "hi" | "te" | "ta";

const voiceMap: Record<Language, VoiceId> = {
  en: VoiceId.Joanna,
  hi: VoiceId.Aditi,
  te: VoiceId.Aditi,
  ta: VoiceId.Aditi,
};

export interface SynthesizeSpeechOptions {
  language?: Language;
  engine?: "neural" | "standard";
  rate?: number;
}

/**
 * Synthesize text to MP3 speech
 */
export async function synthesizeToMp3(
  text: string,
  options?: SynthesizeSpeechOptions
): Promise<Buffer> {
  try {
    const language = options?.language || "en";

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceMap[language] as VoiceId,
      Engine: (options?.engine || "neural") as any,
    });

    const response = await pollyClient.send(command);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.AudioStream as any;
    const reader = stream?.getReader?.();

    if (!reader) {
      throw new Error("No audio stream from Polly");
    }

    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }

    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  } catch (error) {
    console.error("Polly synthesis error:", error);
    throw error;
  }
}

/**
 * Synthesize to MP3 and return Base64
 */
export async function synthesizeToBase64(
  text: string,
  options?: SynthesizeSpeechOptions
): Promise<string> {
  const mp3Buffer = await synthesizeToMp3(text, options);
  return mp3Buffer.toString("base64");
}

/**
 * Get available voices for a language
 */
export function getAvailableVoices(language: Language): string[] {
  const voice = voiceMap[language];
  return [voice];
}

export default pollyClient;

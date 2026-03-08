// AWS Polly Text-to-Speech Service
import { PollyClient, SynthesizeSpeechCommand, Voice } from "@aws-sdk/client-polly";

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Voice mapping by language code
 * Maps language code to AWS Polly voice IDs
 */
export const VOICE_MAP: Record<string, string> = {
  // English variants
  'en': 'Joanna',
  'en-US': 'Joanna',
  'en-GB': 'Amy',
  'en-AU': 'Nicole',
  'en-IN': 'Aditi',
  'en-intl': 'Joanna',
  
  // Indian languages
  'hi': 'Aditi',
  'te': 'Aditi', // Telugu - use Hindi voice
  'ta': 'Aditi', // Tamil - use Hindi voice
  'bn': 'Aditi', // Bengali - use Hindi voice
  'mr': 'Aditi', // Marathi - use Hindi voice
  'gu': 'Aditi', // Gujarati - use Hindi voice
  'kn': 'Aditi', // Kannada - use Hindi voice
  'ml': 'Aditi', // Malayalam - use Hindi voice
  'pa': 'Aditi', // Punjabi - use Hindi voice
  'ur': 'Aditi', // Urdu - use Hindi voice
  
  // European languages
  'es': 'Lucia', // Spanish
  'es-ES': 'Lucia',
  'es-MX': 'Mia',
  'fr': 'Lea', // French
  'fr-FR': 'Lea',
  'de': 'Vicki', // German
  'it': 'Carla', // Italian
  'pt': 'Ines', // Portuguese
  'pt-BR': 'Vitoria',
  'ru': 'Tatyana', // Russian
  'nl': 'Lotte', // Dutch
  'pl': 'Ewa', // Polish
  'ro': 'Carmen', // Romanian
  'sv': 'Astrid', // Swedish
  'da': 'Naja', // Danish
  'no': 'Liv', // Norwegian
  'fi': 'Suvi', // Finnish
  
  // Asian languages
  'ja': 'Mizuki', // Japanese
  'ko': 'Seoyeon', // Korean
  'zh': 'Zhiyu', // Chinese
  'zh-CN': 'Zhiyu',
  'zh-TW': 'Zhiyu',
  'cmn': 'Zhiyu', // Mandarin
  
  // Middle Eastern
  'ar': 'Zeina', // Arabic
  'tr': 'Filiz', // Turkish
  'he': 'Ayelet', // Hebrew (if available)
  
  // Other
  'cy': 'Gwyneth', // Welsh
  'is': 'Dora', // Icelandic
};

/**
 * Get appropriate voice for language code
 */
export function getVoiceForLanguage(languageCode: string): string {
  const normalized = languageCode.toLowerCase();
  return VOICE_MAP[normalized] || VOICE_MAP['en'] || 'Joanna';
}

/**
 * Voices that only support the "standard" engine — not "neural".
 * Polly throws InvalidParameterValue if you request neural for these.
 */
const STANDARD_ONLY_VOICES = new Set([
  'Aditi', 'Astrid', 'Carla', 'Carmen', 'Dora', 'Ewa',
  'Filiz', 'Gwyneth', 'Ines', 'Karl', 'Liv', 'Lotte',
  'Mads', 'Naja', 'Nicole', 'Tatyana', 'Zeina',
]);

/** Voices that support the generative engine (best quality, most natural) */
const GENERATIVE_VOICES = new Set([
  'Joanna', 'Matthew', 'Lupe', 'Ruth', 'Stephen',
]);

function getEngineForVoice(voiceId: string): 'generative' | 'neural' | 'standard' {
  if (GENERATIVE_VOICES.has(voiceId)) return 'generative';
  return STANDARD_ONLY_VOICES.has(voiceId) ? 'standard' : 'neural';
}

/**
 * Read the Polly AudioStream into a Uint8Array regardless of stream type.
 */
async function readAudioStream(audioStream: any): Promise<Uint8Array> {
  if (audioStream instanceof Buffer) {
    return new Uint8Array(audioStream);
  }

  const chunks: Uint8Array[] = [];

  if (audioStream[Symbol.asyncIterator]) {
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
  } else if (audioStream.read) {
    let chunk;
    while ((chunk = audioStream.read()) !== null) {
      chunks.push(chunk);
    }
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Synthesize speech from text using AWS Polly.
 * Tries neural engine first; falls back to standard if the voice doesn't support it.
 */
export async function synthesizeSpeech(
  text: string,
  languageCode: string = 'en'
): Promise<Uint8Array> {
  const voiceId = getVoiceForLanguage(languageCode);
  const engine = getEngineForVoice(voiceId);

  const makeCommand = (eng: 'generative' | 'neural' | 'standard') =>
    new SynthesizeSpeechCommand({
      OutputFormat: 'mp3',
      Text: text,
      VoiceId: voiceId as any,
      Engine: eng,
      TextType: 'text',
    });

  // Try engines in order: generative -> neural -> standard
  const fallbackOrder: ('generative' | 'neural' | 'standard')[] =
    engine === 'generative' ? ['generative', 'neural', 'standard'] :
    engine === 'neural' ? ['neural', 'standard'] :
    ['standard'];

  for (let i = 0; i < fallbackOrder.length; i++) {
    try {
      console.log(`[Polly] Trying ${fallbackOrder[i]} engine with voice ${voiceId}`);
      const response = await pollyClient.send(makeCommand(fallbackOrder[i]));
      if (!response.AudioStream) throw new Error('No audio stream from Polly');
      return readAudioStream(response.AudioStream);
    } catch (err: any) {
      const isEngineError = /InvalidParameterValue|ValidationException/i.test(err?.name ?? '');
      if (isEngineError && i < fallbackOrder.length - 1) {
        console.warn(`[Polly] ${fallbackOrder[i]} not supported for ${voiceId}, trying ${fallbackOrder[i + 1]}`);
        continue;
      }
      console.error('[Polly] Speech synthesis failed:', err);
      throw new Error(`Failed to synthesize speech: ${err?.message || 'Unknown error'}`);
    }
  }
  throw new Error('All Polly engine attempts failed');
}

/**
 * Check if a language is supported by Polly
 */
export function isLanguageSupported(languageCode: string): boolean {
  const normalized = languageCode.toLowerCase();
  return normalized in VOICE_MAP || 'en' in VOICE_MAP;
}

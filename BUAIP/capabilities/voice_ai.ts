import type { CapabilityHandlerResult } from '@/capabilities/types';

const VOICE_KEYWORDS =
  /\b(voice|speak|microphone|mic|audio|listen|transcribe|speech)\b/i;

export async function handleVoiceCapability(
  userMessage: string,
): Promise<CapabilityHandlerResult> {
  if (!VOICE_KEYWORDS.test(userMessage)) {
    return { handled: false, capability: 'voice_ai' };
  }

  return {
    handled: true,
    capability: 'voice_ai',
    response:
      'Voice mode is available. Use the microphone flow to upload audio, and I will transcribe and respond in your selected language.',
    meta: {
      nextAction: 'open_voice_input',
    },
  };
}

import { getLastImageAnalysis } from '@/app/lib/ai-capabilities/sessionMemory';
import type { CapabilityHandlerResult } from '@/capabilities/types';

const IMAGE_KEYWORDS =
  /\b(image|photo|picture|uploaded|what is this|what does this|identify|recognize|show|crop disease|pest|insect|deficiency|plant|leaf)\b/i;

export async function handlePhotoCapability(
  userMessage: string,
  sessionId: string,
): Promise<CapabilityHandlerResult> {
  if (!IMAGE_KEYWORDS.test(userMessage)) {
    return { handled: false, capability: 'photo_ai' };
  }

  const img = getLastImageAnalysis(sessionId);
  if (!img) {
    return { handled: false, capability: 'photo_ai' };
  }

  return {
    handled: true,
    capability: 'photo_ai',
    response: img.explanation,
    meta: {
      detectedIntent: img.detectedIntent,
      intentCategory: img.intentCategory,
      labels: img.labels.map((label) => label.name).join(', '),
    },
  };
}

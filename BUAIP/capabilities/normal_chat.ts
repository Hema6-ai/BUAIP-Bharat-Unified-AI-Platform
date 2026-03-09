import type { CapabilityHandlerResult } from '@/capabilities/types';

export async function handleNormalChatCapability(): Promise<CapabilityHandlerResult> {
  return {
    handled: false,
    capability: 'normal_chat',
  };
}

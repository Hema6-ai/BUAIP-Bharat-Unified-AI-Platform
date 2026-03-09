export type CapabilityId =
  | 'document_ai'
  | 'photo_ai'
  | 'learning_ai'
  | 'voice_ai'
  | 'file_upload_ai'
  | 'normal_chat';

export interface CapabilityHandlerResult {
  handled: boolean;
  capability: CapabilityId;
  response?: string;
  meta?: Record<string, unknown>;
}

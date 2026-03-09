import type { CapabilityHandlerResult } from '@/capabilities/types';

const FILE_UPLOAD_KEYWORDS =
  /\b(upload|attach|attachment|file|pdf|image|photo|document scan|docs)\b/i;

export async function handleFileUploadCapability(
  userMessage: string,
  hasSessionUpload: boolean,
): Promise<CapabilityHandlerResult> {
  if (!FILE_UPLOAD_KEYWORDS.test(userMessage)) {
    return { handled: false, capability: 'file_upload_ai' };
  }

  if (hasSessionUpload) {
    return { handled: false, capability: 'file_upload_ai' };
  }

  return {
    handled: true,
    capability: 'file_upload_ai',
    response:
      'Please upload your file first using the upload action. After upload, I can explain documents, answer follow-up questions, or analyze images.',
    meta: {
      nextAction: 'open_file_upload',
    },
  };
}

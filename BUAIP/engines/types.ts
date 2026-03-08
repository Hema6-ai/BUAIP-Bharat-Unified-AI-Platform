export type EngineId =
  | 'scheme'
  | 'agriculture'
  | 'commerce'
  | 'tourism'
  | 'legal'
  | 'career';

export interface EngineRunContext {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  origin: string;
  intent: string;
  profileSummary?: string;
  extractedEntities?: Record<string, unknown>;
  // Language-related fields (for multilingual support with override)
  selectedLanguage?: string; // The UI language selected by user (e.g., "hi", "te", "en")
  responseLanguage?: string; // The language for this response (may differ if user requested override)
  hasLanguageOverride?: boolean; // True if user explicitly requested a different language
  languageContext?: string; // System prompt instruction for language enforcement
}

export interface EngineOutput {
  engineId: EngineId;
  domainSummary: string;
  reasoningText: string;
}

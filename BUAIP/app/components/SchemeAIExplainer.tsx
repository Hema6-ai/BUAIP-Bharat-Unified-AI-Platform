// app/components/SchemeAIExplainer.tsx
"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/lib/languageContext";
import { useRegion } from "@/app/lib/regionContext";
import { useTranslation } from "@/app/lib/useTranslation";
import { useSpeechRecognition, useSpeechSynthesis } from "@/app/lib/useVoice";
import { AIBadge } from "./AIBadge";
import { askEngine, type EngineResponse } from "@/src/lib/engineApi";

interface SchemeExplanation {
  schemeName: string;
  language: string;
  region: string;
  eligibility: string;
  documentsNeeded: string[];
  howToApply: string;
  offlineProcess: string;
  importantDeadlines: string;
  commonRejectionReasons: string[];
  additionalNotes: string;
  timestamp: string;
}

interface Props {
  schemeName: string;
  schemeDescription?: string;
}

export function SchemeAIExplainer({
  schemeName,
  schemeDescription,
}: Props) {
  const { language } = useLanguage();
  const { region } = useRegion();
  const { t } = useTranslation();
  const [explanation, setExplanation] = useState<SchemeExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Voice features
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening,
    isSupported: isSpeechRecognitionSupported 
  } = useSpeechRecognition(language);
  
  const { 
    speak, 
    stop: stopSpeaking, 
    isSpeaking,
    isSupported: isSpeechSynthesisSupported 
  } = useSpeechSynthesis(language);

  // When transcript changes, fetch explanation
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      fetchExplanationWithQuery(transcript);
    }
  }, [transcript]);

  const fetchExplanation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Construct natural language query for AWS backend
      const query = `Explain the government scheme: ${schemeName}. Description: ${schemeDescription}. I am from ${region}. Provide eligibility criteria, application process, benefits, required documents, and deadlines.`;
      
      const response: EngineResponse = await askEngine('scheme', query);
      
      // Create explanation in expected format
      const data: SchemeExplanation = {
        schemeName: schemeName,
        language: language,
        region: region,
        eligibility: response.answer,
        documentsNeeded: [],
        howToApply: 'See explanation above',
        offlineProcess: '',
        importantDeadlines: 'Check with local authorities',
        commonRejectionReasons: [],
        additionalNotes: '',
        timestamp: new Date().toISOString()
      };
      setExplanation(data);
      setExpanded(true);

      // Auto-speak the eligibility section
      if (isSpeechSynthesisSupported && data.eligibility) {
        const summary = `${t("scheme_eligibility")}: ${data.eligibility}`;
        speak(summary);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanationWithQuery = async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      // Construct natural language query with specific question for AWS backend
      const fullQuery = `Explain the government scheme: ${schemeName}. Description: ${schemeDescription}. I am from ${region}. My specific question: ${query}`;
      
      const response: EngineResponse = await askEngine('scheme', fullQuery);
      
      // Create explanation in expected format
      const data: SchemeExplanation = {
        schemeName: schemeName,
        language: language,
        region: region,
        eligibility: response.answer,
        documentsNeeded: [],
        howToApply: 'See explanation above',
        offlineProcess: '',
        importantDeadlines: 'Check with local authorities',
        commonRejectionReasons: [],
        additionalNotes: '',
        timestamp: new Date().toISOString()
      };
      setExplanation(data);
      setExpanded(true);

      // Auto-speak the response
      if (isSpeechSynthesisSupported && data.eligibility) {
        speak(data.eligibility);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeakAll = () => {
    if (!explanation) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    // Create comprehensive text to speak
    const fullText = `
      ${t("scheme_eligibility")}: ${explanation.eligibility}.
      
      ${t("scheme_documents")}: ${explanation.documentsNeeded.join(", ")}.
      
      ${t("scheme_how_to_apply")}: ${explanation.howToApply}.
      
      ${t("scheme_offline")}: ${explanation.offlineProcess}.
      
      ${t("scheme_deadlines")}: ${explanation.importantDeadlines}.
    `;

    speak(fullText);
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow">
      {/* Trigger Button with Voice Controls */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200">
        <AIBadge variant="compact" />
        <button
          onClick={fetchExplanation}
          disabled={loading}
          className="flex-1 py-2 px-4 text-left hover:bg-gray-50 disabled:opacity-50 font-semibold text-blue-600 flex justify-between items-center rounded"
        >
          <span>
            {loading ? t("scheme_loading") : t("scheme_get_explanation")}
          </span>
          <span>{expanded ? "▼" : "▶"}</span>
        </button>

        {/* Microphone Button */}
        {isSpeechRecognitionSupported && (
          <button
            onClick={handleMicClick}
            disabled={loading}
            className={`p-3 rounded-full transition-all ${
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
            } disabled:opacity-50`}
            title={isListening ? "Stop listening" : "Ask with voice"}
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8v5.5a.5.5 0 001 0V8c0-.491.408-1.034 1.146-1.467A3.536 3.536 0 0110 6.092V5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {/* Speaker Button */}
        {isSpeechSynthesisSupported && explanation && (
          <button
            onClick={handleSpeakAll}
            disabled={loading}
            className={`p-3 rounded-full transition-all ${
              isSpeaking
                ? "bg-green-500 text-white"
                : "bg-green-100 text-green-600 hover:bg-green-200"
            } disabled:opacity-50`}
            title={isSpeaking ? "Stop speaking" : "Listen to explanation"}
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Voice Status */}
      {loading && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2 text-indigo-700 text-sm">
          <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Generating AI insight...</span>
        </div>
      )}

      {isListening && (
        <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Listening... Ask your question about the scheme</span>
        </div>
      )}

      {transcript && (
        <div className="px-4 py-2 bg-gray-50 text-gray-700 text-sm">
          <strong>You asked:</strong> {transcript}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 border-t border-gray-200 bg-red-50 text-red-700">
          <p className="font-semibold">{t("common_error")}: {error}</p>
          <p className="text-sm mt-1">
            {t("scheme_aws_error")}
          </p>
        </div>
      )}

      {/* Explanation Content */}
      {explanation && expanded && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* Eligibility */}
          <section>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {t("scheme_eligibility")}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {explanation.eligibility}
            </p>
          </section>

          {/* Documents */}
          <section>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {t("scheme_documents")}
            </h3>
            <ul className="space-y-1">
              {explanation.documentsNeeded.map((doc, idx) => (
                <li
                  key={idx}
                  className="flex items-start text-gray-700"
                >
                  <span className="text-blue-600 mr-2">•</span>
                  {doc}
                </li>
              ))}
            </ul>
          </section>

          {/* How to Apply */}
          <section>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {t("scheme_how_to_apply")}
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {explanation.howToApply}
            </p>
          </section>

          {/* Offline Process */}
          <section>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {t("scheme_offline")}
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {explanation.offlineProcess}
            </p>
          </section>

          {/* Deadlines */}
          <section>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              {t("scheme_deadlines")}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {explanation.importantDeadlines}
            </p>
          </section>

          {/* Rejection Reasons */}
          {explanation.commonRejectionReasons.length > 0 && (
            <section>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {t("scheme_rejection_reasons")}
              </h3>
              <ul className="space-y-1">
                {explanation.commonRejectionReasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start text-red-700"
                  >
                    <span className="text-red-600 mr-2">✗</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Additional Notes */}
          {explanation.additionalNotes && (
            <section>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {t("scheme_additional_info")}
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {explanation.additionalNotes}
              </p>
            </section>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
            <p>{t("header_language")}: {explanation.language}</p>
            <p>{t("common_generated_on")}: {new Date(explanation.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

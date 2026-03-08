"use client";

import { useState, useEffect } from "react";
import SchemeAssistancePanel from "@/app/components/SchemeAssistancePanel";
import { useLanguage } from "@/app/lib/languageContext";
import { useSpeechRecognition, useSpeechSynthesis } from "@/app/lib/useVoice";
import { trackCitizenEvent } from "@/app/lib/citizenTracker";
import { askEngine, type EngineResponse } from "@/src/lib/engineApi";

interface Scheme {
  scheme_name: string;
  domain: string;
  ministry: string;
  description: string;
  target_beneficiaries: string;
  eligibility_criteria: string;
  age_limit: string;
  income_limit: string;
  required_documents: string;
  benefits: string;
  application_mode: string;
  official_apply_link: string;
  state_applicability: string;
  timeline: string;
}

interface SchemeExplanation {
  whoCanApply: string;
  documentsRequired: string[];
  howToApply: string;
  offlineMethod: string;
  importantWarnings: string;
  deadlines: string;
  regionAvailability: string;
  confidence: "high" | "medium" | "low";
}

interface SchemeDetailModalProps {
  scheme: Scheme;
  region?: string;
  onClose: () => void;
}

export default function SchemeDetailModal({
  scheme,
  region,
  onClose,
}: SchemeDetailModalProps) {
  const [showAssistance, setShowAssistance] = useState(false);
  const { language } = useLanguage();
  const [aiExplanation, setAiExplanation] = useState<SchemeExplanation | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  // Voice interface
  const { isListening, transcript, startListening, stopListening, isSupported: isSpeechRecognitionSupported } = useSpeechRecognition(language);
  const { speak, stop: stopSpeaking, isSpeaking, isSupported: isSpeechSynthesisSupported } = useSpeechSynthesis(language);
  const [voiceQuestion, setVoiceQuestion] = useState("");
  const [voiceAnswer, setVoiceAnswer] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Load AI explanation when modal opens
  useEffect(() => {
    const loadAIExplanation = async () => {
      setIsLoadingAI(true);
      setAiError(null);

      try {
        // Construct natural language query for AWS backend
        const query = `Explain the government scheme: ${scheme.scheme_name}. Description: ${scheme.description}. I am from ${region || 'India'}. Provide eligibility criteria, application process, benefits, required documents, and deadlines.`;
        
        const response: EngineResponse = await askEngine('scheme', query);
        
        // Create explanation in expected format
        const data: SchemeExplanation = {
          whoCanApply: response.answer,
          documentsRequired: [],
          howToApply: 'See explanation above',
          offlineMethod: '',
          importantWarnings: '',
          deadlines: 'Check with local authorities',
          regionAvailability: region || 'India',
          confidence: 'medium'
        };
        setAiExplanation(data);
      } catch (error) {
        console.error("Error loading AI explanation:", error);
        setAiError("Failed to load AI guidance. Please try again.");
      } finally {
        setIsLoadingAI(false);
      }
    };

    loadAIExplanation();
  }, [scheme, language, region]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && !isListening) {
      setVoiceQuestion(transcript);
      handleVoiceQuery(transcript);
    }
  }, [transcript, isListening]);

  const handleVoiceQuery = async (question: string) => {
    setIsProcessingVoice(true);
    setVoiceAnswer("");

    try {
      const response = await fetch("/api/scheme-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schemeName: scheme.scheme_name,
          schemeDescription: scheme.description,
          selectedLanguage: language,
          selectedState: region || "India",
          spokenQuestion: question,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get voice response");
      }

      const data = await response.json();
      
      // Construct answer from all sections
      const answer = `${data.whoCanApply} ${data.howToApply}`;
      setVoiceAnswer(answer);
      
      // Speak the answer
      speak(answer);
    } catch (error) {
      console.error("Error processing voice query:", error);
      const errorByLanguage: Record<string, string> = {
        en: "Sorry, I couldn't process your question.",
        hi: "माफ़ कीजिए, मैं आपके प्रश्न को संसाधित नहीं कर सका।",
        te: "క్షమించండి, మీ ప్రశ్నను నేను ప్రాసెస్ చేయలేకపోయాను.",
        ta: "மன்னிக்கவும், உங்கள் கேள்வியை நான் செயலாக்க முடியவில்லை.",
      };
      const errorMsg = errorByLanguage[language] || errorByLanguage.en;
      setVoiceAnswer(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const getConfidenceColor = (confidence: "high" | "medium" | "low") => {
    switch (confidence) {
      case "high":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-orange-100 text-orange-800 border-orange-300";
    }
  };

  const getConfidenceLabel = (confidence: "high" | "medium" | "low") => {
    const labels: Record<string, Record<"high" | "medium" | "low", string>> = {
      en: { high: "High Confidence", medium: "Medium Confidence", low: "Low Confidence" },
      te: { high: "అధిక నమ్మకం", medium: "మధ్యస్థ నమ్మకం", low: "తక్కువ నమ్మకం" },
      hi: { high: "उच्च विश्वास", medium: "मध्यम विश्वास", low: "कम विश्वास" },
      ta: { high: "உயர் நம்பிக்கை", medium: "நடுத்தர நம்பிக்கை", low: "குறைந்த நம்பிக்கை" },
    };
    return (labels[language] || labels.en)[confidence];
  };

  const handleApplyClick = () => {
    trackCitizenEvent({
      region,
      categorySelected: scheme.domain,
      schemeShown: scheme.scheme_name,
      actionType: "apply",
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-indigo-100">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 border-b border-indigo-300">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h1 className="text-2xl font-bold mb-2">{scheme.scheme_name}</h1>
                <p className="text-indigo-100">{scheme.domain}</p>
                
                {/* AI Badge and Confidence */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-500 text-white shadow-lg">
                    ✨ AI Generated for {language === "en" ? "English" : language === "te" ? "తెలుగు" : language === "hi" ? "हिंदी" : "தமிழ்"}
                  </span>
                  {aiExplanation && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getConfidenceColor(aiExplanation.confidence)}`}>
                      {getConfidenceLabel(aiExplanation.confidence)}
                    </span>
                  )}
                  {!isLoadingAI && language !== "en" && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-lg">
                      🌐 Translated from Dataset
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="text-white hover:bg-indigo-700 rounded-lg p-2 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Voice Interface */}
            {(isSpeechRecognitionSupported || isSpeechSynthesisSupported) && (
              <div className="mt-4 pt-4 border-t border-indigo-400">
                <div className="flex items-center gap-3">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessingVoice || isLoadingAI}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                        : "bg-white text-indigo-600 hover:bg-indigo-50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {isListening ? "Listening..." : isProcessingVoice ? "Processing..." : "Ask a Question"}
                  </button>

                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-white text-red-600 hover:bg-red-50 transition-all"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Stop Speaking
                    </button>
                  )}
                </div>

                {voiceQuestion && (
                  <div className="mt-2 p-2 bg-indigo-500 bg-opacity-30 rounded text-sm">
                    <span className="font-semibold">You asked:</span> {voiceQuestion}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoadingAI ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ) : aiError ? (
              <div className="text-center py-8">
                <p className="text-red-600 font-semibold">{aiError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Reload
                </button>
              </div>
            ) : aiExplanation ? (
              <div className="space-y-6">
                {/* Who Can Apply */}
                <AISection
                  title="✓ Who Can Apply"
                  content={aiExplanation.whoCanApply}
                  icon="👥"
                />

                {/* Documents Required */}
                <AISection
                  title="✓ Documents Required"
                  content={aiExplanation.documentsRequired.length > 0 
                    ? aiExplanation.documentsRequired.map(doc => `• ${doc}`).join('\n')
                    : aiExplanation.documentsRequired.join(', ')
                  }
                  icon="📄"
                />

                {/* How to Apply */}
                <AISection
                  title="✓ How to Apply (Step-by-Step)"
                  content={aiExplanation.howToApply}
                  icon="📋"
                />

                {/* Offline Method */}
                <AISection
                  title="✓ Offline Method"
                  content={aiExplanation.offlineMethod}
                  icon="🏢"
                />

                {/* Important Warnings */}
                <AISection
                  title="✓ Important Warnings"
                  content={aiExplanation.importantWarnings}
                  icon="⚠️"
                  highlight
                />

                <AISection
                  title="✓ Deadlines"
                  content={aiExplanation.deadlines}
                  icon="⏳"
                />

                {/* Region Availability */}
                <AISection
                  title="✓ Region Availability"
                  content={aiExplanation.regionAvailability}
                  icon="📍"
                />
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              {scheme.official_apply_link && (
                <a
                  href={scheme.official_apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleApplyClick}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all text-center flex items-center justify-center group"
                >
                  <span className="mr-2">🔗</span>
                  Apply Now - Official Portal
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">↗</span>
                </a>
              )}
              <button
                onClick={() => setShowAssistance(!showAssistance)}
                className="flex-1 bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                {showAssistance ? "Hide" : "Get More AI Assistance"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistance Panel */}
      {showAssistance && (
        <SchemeAssistancePanel
          scheme={scheme}
          initialRegion={region}
          onClose={() => setShowAssistance(false)}
        />
      )}
    </>
  );
}

// AI Section Component
function AISection({
  title,
  content,
  icon,
  highlight = false,
}: {
  title: string;
  content: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <section className={`p-5 rounded-xl border-2 ${
      highlight 
        ? "bg-amber-50 border-amber-300" 
        : "bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
    }`}>
      <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${
        highlight ? "text-amber-900" : "text-indigo-900"
      }`}>
        <span className="text-2xl">{icon}</span>
        {title}
      </h3>
      <div className={`rounded-lg p-4 ${
        highlight ? "bg-white border border-amber-200" : "bg-white border border-indigo-100"
      }`}>
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </section>
  );
}

// app/lib/useVoice.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { Language } from "./languageContext";

// Language to voice locale mapping
const VOICE_LOCALES: Record<string, string> = {
  en: "en-IN",
  te: "te-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  ur: "ur-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  zh: "zh-CN",
  "zh-tw": "zh-TW",
  ja: "ja-JP",
  ko: "ko-KR",
  ar: "ar-SA",
  he: "he-IL",
  fa: "fa-IR",
  "en-intl": "en-US",
};

function getVoiceLocale(language: Language): string {
  const mappedLocale = VOICE_LOCALES[language];
  if (mappedLocale) {
    return mappedLocale;
  }

  const base = language.split("-")[0];
  return VOICE_LOCALES[base] || "en-IN";
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(language: Language): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check browser support
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = getVoiceLocale(language);

        recognitionInstance.onresult = (event: any) => {
          const speechResult = event.results[0][0].transcript;
          setTranscript(speechResult);
          setIsListening(false);
        };

        recognitionInstance.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setError(event.error);
          setIsListening(false);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      } else {
        setIsSupported(false);
      }
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (recognition) {
      setError(null);
      setTranscript("");
      recognition.lang = getVoiceLocale(language);
      recognition.start();
      setIsListening(true);
    }
  }, [recognition, language]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
  };
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export function useSpeechSynthesis(language: Language): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      setIsSupported(true);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = getVoiceLocale(language);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Find appropriate voice for the language
      const voices = window.speechSynthesis.getVoices();
      const langCode = getVoiceLocale(language);
      const matchingVoice = voices.find((voice) =>
        voice.lang.startsWith(langCode.split("-")[0])
      );

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}

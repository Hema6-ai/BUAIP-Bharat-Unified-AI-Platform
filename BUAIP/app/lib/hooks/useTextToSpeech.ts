// Client-side Text-to-Speech Hook — AWS Polly + Browser Fallback
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/lib/languageContext';

export interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  error: string | null;
}

/**
 * Strip markdown / symbols so the spoken text sounds natural.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[#*_~`|]/g, '')          // markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link
    .replace(/https?:\/\/\S+/g, '')    // bare URLs
    .replace(/₹/g, 'rupees ')
    .replace(/%/g, ' percent')
    .replace(/\n{2,}/g, '. ')          // paragraph breaks → pause
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * Pick the best female voice available in the browser.
 */
function pickFemaleVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const lowerLang = lang.toLowerCase();

  // Prefer: female keyword in name, matching language
  const female = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith(lowerLang.split('-')[0]) &&
      /female|woman|zira|hazel|susan|samantha|karen|moira|fiona|google.*female/i.test(v.name)
  );
  if (female.length) return female[0];

  // Fallback: any voice matching language
  const langMatch = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(lowerLang.split('-')[0])
  );
  if (langMatch.length) return langMatch[0];

  // Last resort: any voice
  return voices[0];
}

/**
 * Speak using the browser's built-in Web Speech API (fallback).
 */
function speakWithBrowser(
  text: string,
  lang: string,
  onEnd: () => void,
  onError: (msg: string) => void
): void {
  if (!window.speechSynthesis) {
    onError('Speech synthesis not supported in this browser');
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.95;
  utterance.pitch = 1.1; // slightly higher for feminine tone

  const voice = pickFemaleVoice(lang);
  if (voice) utterance.voice = voice;

  utterance.onend = onEnd;
  utterance.onerror = (e) => {
    if (e.error !== 'canceled') onError('Browser speech failed');
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Hook for text-to-speech: AWS Polly (female voice) with browser fallback
 */
export function useTextToSpeech(): UseTTSReturn {
  const { language, translate } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usingBrowserRef = useRef(false);

  // Pre-load browser voices (they load async in some browsers)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (usingBrowserRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      usingBrowserRef.current = false;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    stop();
    setError(null);
    setIsPlaying(true);
    usingBrowserRef.current = false;

    const cleanText = cleanTextForSpeech(text);

    try {
      // Try AWS Polly first
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText, languageCode: language }),
      });

      if (!response.ok) {
        throw new Error(`Polly API returned ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size < 100) {
        throw new Error('Polly returned empty audio');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        // If Polly audio fails to play, fallback to browser
        console.warn('[TTS] Polly audio playback failed, using browser fallback');
        usingBrowserRef.current = true;
        speakWithBrowser(cleanText, language, () => setIsPlaying(false), (msg) => {
          setError(msg);
          setIsPlaying(false);
        });
      };

      await audio.play();
    } catch (err) {
      console.warn('[TTS] AWS Polly failed, using browser speech fallback:', err);
      // Fallback to browser Web Speech API
      usingBrowserRef.current = true;
      speakWithBrowser(cleanText, language, () => setIsPlaying(false), (msg) => {
        setError(msg);
        setIsPlaying(false);
      });
    }
  }, [language, stop]);

  return { speak, stop, isPlaying, error };
}

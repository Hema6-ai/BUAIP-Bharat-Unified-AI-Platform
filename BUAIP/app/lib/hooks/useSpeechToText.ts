// Minimal, reliable Speech-to-Text hook using Web Speech API
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/app/lib/languageContext';

const LANG_MAP: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', bn: 'bn-IN',
  mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN',
  ur: 'ur-IN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-BR', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN',
  ar: 'ar-SA', tr: 'tr-TR', nl: 'nl-NL', pl: 'pl-PL',
};

export interface UseSTTReturn {
  transcript: string;
  interimText: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  error: string | null;
}

function normalizeWhitespace(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function mergeWithTokenOverlap(base: string, addition: string): string {
  const cleanBase = normalizeWhitespace(base);
  const cleanAddition = normalizeWhitespace(addition);

  if (!cleanBase) return cleanAddition;
  if (!cleanAddition) return cleanBase;

  const baseTokens = cleanBase.split(' ');
  const additionTokens = cleanAddition.split(' ');
  const maxOverlap = Math.min(baseTokens.length, additionTokens.length, 8);

  let overlap = 0;
  for (let size = maxOverlap; size >= 1; size--) {
    const baseTail = baseTokens.slice(baseTokens.length - size).join(' ').toLowerCase();
    const additionHead = additionTokens.slice(0, size).join(' ').toLowerCase();
    if (baseTail === additionHead) {
      overlap = size;
      break;
    }
  }

  const mergedTokens = baseTokens.concat(additionTokens.slice(overlap));
  return normalizeWhitespace(mergedTokens.join(' '));
}

export function useSpeechToText(): UseSTTReturn {
  const { language } = useLanguage();
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs — mutable state shared with event handlers (no stale closures)
  const recRef = useRef<any>(null);
  const activeRef = useRef(false);       // true = user wants listening
  const prevFinalsRef = useRef('');      // finals from previous auto-restart sessions
  const langRef = useRef(language);

  // Keep langRef current
  useEffect(() => { langRef.current = language; }, [language]);

  // Feature detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(
        !!(window as any).SpeechRecognition ||
        !!(window as any).webkitSpeechRecognition
      );
    }
  }, []);

  // Create and start a single recognition session.
  // Handlers read/write refs so they never go stale.
  const boot = useCallback(() => {
    if (typeof window === 'undefined' || !activeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Kill any lingering instance
    if (recRef.current) { try { recRef.current.abort(); } catch { /* */ } }

    const rec = new SR();
    recRef.current = rec;
    rec.lang = LANG_MAP[langRef.current] || 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Track this session's finals locally (not in a ref) — each session starts fresh
    let sessionFinals = '';

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (e: any) => {
      let finals = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const txt = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += txt + ' ';
        else interim += txt;
      }
      sessionFinals = finals.trim();
      const allFinals = mergeWithTokenOverlap(prevFinalsRef.current, sessionFinals);
      setTranscript(interim ? (allFinals + ' ' + interim).trim() : allFinals);
      setInterimText(interim);
    };

    rec.onerror = (e: any) => {
      const err = e.error;
      // 'no-speech' and 'aborted' are benign — Chrome fires these on silence / stop()
      if (err === 'no-speech' || err === 'aborted') return;
      activeRef.current = false;
      setIsListening(false);
      if (err === 'not-allowed') setError('Microphone permission denied. Please allow access.');
      else if (err === 'audio-capture') setError('No microphone found. Check your device.');
      else setError('Speech error: ' + err);
    };

    rec.onend = () => {
      // Accumulate this session's finals before restart
      if (sessionFinals) {
        prevFinalsRef.current = mergeWithTokenOverlap(prevFinalsRef.current, sessionFinals);
        sessionFinals = '';
      }
      if (activeRef.current) {
        // Chrome auto-stopped (silence / network hiccup). Restart after a short pause.
        setTimeout(() => { if (activeRef.current) boot(); }, 300);
      } else {
        setIsListening(false);
      }
    };

    try {
      rec.start();
    } catch {
      setError('Could not start speech recognition.');
      activeRef.current = false;
      setIsListening(false);
    }
  }, []); // boot reads everything from refs — no deps needed

  const startListening = useCallback(() => {
    activeRef.current = true;
    prevFinalsRef.current = '';
    setTranscript('');
    setInterimText('');
    setError(null);
    boot();
  }, [boot]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (recRef.current) {
      try { recRef.current.stop(); } catch { /* */ }
    }
    // Whatever transcript is in state right now is the final text.
    // Clear interim since recognition is done.
    setInterimText('');
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
    setError(null);
    prevFinalsRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (recRef.current) { try { recRef.current.abort(); } catch { /* */ } }
    };
  }, []);

  return { transcript, interimText, isListening, isSupported, startListening, stopListening, resetTranscript, error };
}

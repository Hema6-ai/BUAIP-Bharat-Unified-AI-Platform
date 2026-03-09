// Performance Optimization Layer
// - In-memory query result cache with 5-minute TTL
// - Local query answering for date/time/greetings (no LLM needed)

import { createHash } from 'crypto';

// ─── Query result cache ───────────────────────────────────────────────────────

interface CacheEntry {
  result: any;
  createdAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

const queryCache = new Map<string, CacheEntry>();

export function hashQuery(text: string, lang: string): string {
  const normalised = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(`${lang}:${normalised}`).digest('hex');
}

export function getCachedResult(queryHash: string): any | null {
  const entry = queryCache.get(queryHash);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    queryCache.delete(queryHash);
    return null;
  }
  return entry.result;
}

export function setCachedResult(queryHash: string, result: any): void {
  // Evict oldest entries when cache is full
  if (queryCache.size >= MAX_CACHE_SIZE) {
    const oldest = queryCache.keys().next().value;
    if (oldest !== undefined) queryCache.delete(oldest);
  }
  queryCache.set(queryHash, { result, createdAt: Date.now() });
}

// ─── Local query answering (skip LLM) ────────────────────────────────────────

interface LocalAnswer {
  handled: boolean;
  response?: string;
  engine?: string;
}

const GREETING_PATTERNS = [
  /^(hi|hello|hey|namaste|namaskar|hola|bonjour|guten tag|salaam|vanakkam|namaskaram)[\s!.]*$/i,
  /^(good\s+(morning|afternoon|evening|night))[\s!.]*$/i,
  /^(how\s+are\s+you|what's\s+up|sup|howdy)[\s!?]*$/i,
  /^(thanks?|thank\s+you|dhanyavaad|shukriya)[\s!.]*$/i,
];

const DEFAULT_GREETING_RESPONSE =
  "Hello! I'm BUAIP, your AI assistant for government schemes, agriculture, careers, legal rights, and more. How can I help you today?";

const TIME_PATTERNS = [
  /^what('s| is) the (current )?(time|clock)/i,
  /^(tell me the|what) time/i,
  /^time\??$/i,
  /^kitne baje/i,
  /^samay kya hai/i,
];

const DATE_PATTERNS = [
  /^what('s| is) (today'?s?|the|current) date/i,
  /^(tell me|what'?s?) today'?s? date/i,
  /^(today'?s? date|date today|today date)/i,
  /^date\??$/i,
  /^aaj ki date/i,
  /^aaj ki tarikh/i,
];

export function tryAnswerLocally(message: string, lang: string): LocalAnswer {
  const trimmed = message.trim();

  // ── Greetings ──
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        handled: true,
        response: DEFAULT_GREETING_RESPONSE,
        engine: 'Local Quick Response',
      };
    }
  }

  // ── Time ──
  for (const pattern of TIME_PATTERNS) {
    if (pattern.test(trimmed)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
      return {
        handled: true,
        response: `The current time in India is **${timeStr} IST**.`,
        engine: 'Local Quick Response',
      };
    }
  }

  // ── Date ──
  for (const pattern of DATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
      return {
        handled: true,
        response: `Today is **${dateStr}**.`,
        engine: 'Local Quick Response',
      };
    }
  }

  return { handled: false };
}

export interface FactResolutionResult {
  handled: boolean;
  response?: string;
  factType?: 'datetime' | 'unavailable_realtime';
}

const DATE_TIME_PATTERNS = [
  /\bdate\b/i,
  /\btoday'?s\s+date\b/i,
  /\bcurrent\s+date\b/i,
  /\btime\b/i,
  /\bcurrent\s+time\b/i,
  /\bwhat\s+day\s+is\s+it\b/i,
  /\bday\s+today\b/i,
];

// Weather and mandi prices are now handled by specialized engines (Annadata)
// Only block truly unavailable data like stock prices and exchange rates
const LIVE_DATA_PATTERNS = [
  /\bexchange\s+rate\b/i,
  /\bstock\s+price\b/i,
  /\bshare\s+price\b/i,
  /\bcrypto\s+price\b/i,
  /\bbitcoin\b/i,
];

export function getCurrentDateTimeIST(): string {
  const now = new Date();
  return now.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'long',
  });
}

export function isDeterministicFactQuery(query: string): boolean {
  return DATE_TIME_PATTERNS.some((pattern) => pattern.test(query));
}

export function isLiveFactQuery(query: string): boolean {
  return LIVE_DATA_PATTERNS.some((pattern) => pattern.test(query));
}

export async function resolveDeterministicFactQuery(
  query: string
): Promise<FactResolutionResult> {
  if (isDeterministicFactQuery(query)) {
    const now = getCurrentDateTimeIST();
    return {
      handled: true,
      factType: 'datetime',
      response: `Current date and time (IST): ${now}`,
    };
  }

  if (isLiveFactQuery(query)) {
    return {
      handled: true,
      factType: 'unavailable_realtime',
      response: 'Real-time data is currently unavailable.',
    };
  }

  return { handled: false };
}

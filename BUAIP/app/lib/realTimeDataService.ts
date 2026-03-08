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

const LIVE_DATA_PATTERNS = [
  /\bweather\b/i,
  /\btemperature\b/i,
  /\brain\b/i,
  /\bforecast\b/i,
  /\bmandi\s+price\b/i,
  /\blive\s+price\b/i,
  /\bcurrent\s+price\b/i,
  /\bmarket\s+price\b/i,
  /\bstatistics?\b/i,
  /\bstat\b/i,
  /\bexchange\s+rate\b/i,
  /\bstock\s+price\b/i,
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

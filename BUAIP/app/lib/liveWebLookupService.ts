import { formatWeatherForLLM, getWeatherData } from '@/app/lib/weatherService';

interface WebLookupResult {
  summary: string;
  sources: string[];
}

interface DataGovRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

const DATA_GOV_MANDI_URL =
  'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

const STATES = [
  'andhra pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'delhi',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya pradesh',
  'maharashtra',
  'odisha',
  'punjab',
  'rajasthan',
  'tamil nadu',
  'telangana',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
];

const CROP_ALIASES: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  paddy: 'Rice',
  cotton: 'Cotton',
  soybean: 'Soyabean',
  soyabean: 'Soyabean',
  maize: 'Maize',
  sugarcane: 'Sugarcane',
  potato: 'Potato',
  onion: 'Onion',
  tomato: 'Tomato',
  groundnut: 'Groundnut',
  arhar: 'Tur (Arhar)',
  tur: 'Tur (Arhar)',
  chana: 'Chana',
  mustard: 'Mustard',
  jowar: 'Jowar',
  bajra: 'Bajra',
  millet: 'Bajra',
};

function isWeatherQuery(query: string): boolean {
  return /\b(weather|temperature|rain|forecast|humidity|wind|climate)\b/i.test(query);
}

function isMandiQuery(query: string): boolean {
  return /\b(mandi|apmc|commodity\s+price|market\s+price|crop\s+price|modal\s+price|agmarknet)\b/i.test(
    query,
  );
}

function isLiveInfoQuery(query: string): boolean {
  return /\b(current|today|latest|live|now|real[-\s]?time|price|rate|weather|forecast)\b/i.test(query);
}

function extractState(query: string): string | null {
  const lower = query.toLowerCase();
  for (const state of STATES) {
    if (lower.includes(state)) {
      return state;
    }
  }
  if (/\bap\b/i.test(query)) return 'andhra pradesh';
  if (/\bmp\b/i.test(query)) return 'madhya pradesh';
  if (/\bup\b/i.test(query)) return 'uttar pradesh';
  if (/\btn\b/i.test(query)) return 'tamil nadu';
  if (/\bwb\b/i.test(query)) return 'west bengal';
  return null;
}

function extractCrop(query: string): string | null {
  const lower = query.toLowerCase();
  for (const [alias, canonical] of Object.entries(CROP_ALIASES)) {
    if (lower.includes(alias)) {
      return canonical;
    }
  }
  return null;
}

function extractWeatherLocation(query: string): string | null {
  const state = extractState(query);
  if (state) {
    return state;
  }

  const inMatch = query.match(/\b(?:in|at|for)\s+([a-zA-Z\s]{2,40})$/i);
  if (inMatch?.[1]) {
    return inMatch[1].trim();
  }

  return null;
}

async function fetchWeatherContext(query: string): Promise<WebLookupResult | null> {
  const location = extractWeatherLocation(query);
  if (!location) {
    return null;
  }

  const weather = await getWeatherData(location);
  if (!weather) {
    return null;
  }

  return {
    summary: formatWeatherForLLM(weather, location),
    sources: ['https://api.openweathermap.org/data/2.5/weather', 'https://api.openweathermap.org/data/2.5/forecast'],
  };
}

function buildMandiSummary(records: DataGovRecord[], crop: string | null, state: string | null): string {
  const lines: string[] = [];
  lines.push('LIVE MANDI MARKET SNAPSHOT (data.gov.in / Agmarknet):');

  const headerParts = [
    crop ? `Commodity: ${crop}` : 'Commodity: mixed',
    state ? `State: ${state}` : 'State: all India sample',
  ];
  lines.push(headerParts.join(' | '));

  const top = records.slice(0, 8);
  for (const record of top) {
    lines.push(
      `- ${record.state}, ${record.district}, ${record.market}: ${record.commodity} | modal Rs.${record.modal_price}/quintal | min-max Rs.${record.min_price}-${record.max_price} | date ${record.arrival_date}`,
    );
  }

  lines.push('Use this as web-verified market context; if data is sparse, advise user to verify with local mandi office.');
  return lines.join('\n');
}

async function fetchMandiContext(query: string): Promise<WebLookupResult | null> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) {
    return null;
  }

  const crop = extractCrop(query);
  const state = extractState(query);

  const url = new URL(DATA_GOV_MANDI_URL);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '10');
  if (crop) {
    url.searchParams.set('filters[commodity]', crop);
  }
  if (state) {
    url.searchParams.set('filters[state]', state);
  }

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { records?: DataGovRecord[] };
  const records = payload.records || [];
  if (records.length === 0) {
    return null;
  }

  return {
    summary: buildMandiSummary(records, crop, state),
    sources: [DATA_GOV_MANDI_URL],
  };
}

async function fetchGenericWebContext(query: string): Promise<WebLookupResult | null> {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', `${query} India latest`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(9000),
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    AbstractText?: string;
    RelatedTopics?: Array<{ Text?: string }>;
    Heading?: string;
  };

  const snippets: string[] = [];
  if (payload.AbstractText) {
    snippets.push(payload.AbstractText);
  }

  for (const topic of payload.RelatedTopics || []) {
    if (topic.Text) {
      snippets.push(topic.Text);
    }
    if (snippets.length >= 3) {
      break;
    }
  }

  if (snippets.length === 0) {
    return null;
  }

  const heading = payload.Heading ? `Topic: ${payload.Heading}\n` : '';
  return {
    summary: `LIVE WEB LOOKUP SUMMARY:\n${heading}${snippets.map((entry) => `- ${entry}`).join('\n')}`,
    sources: ['https://api.duckduckgo.com/'],
  };
}

export async function getLiveWebContextForQuery(query: string): Promise<WebLookupResult> {
  if (!isLiveInfoQuery(query)) {
    return { summary: '', sources: [] };
  }

  try {
    if (isWeatherQuery(query)) {
      const weather = await fetchWeatherContext(query);
      if (weather) {
        return weather;
      }
    }

    if (isMandiQuery(query)) {
      const mandi = await fetchMandiContext(query);
      if (mandi) {
        return mandi;
      }
    }

    const generic = await fetchGenericWebContext(query);
    if (generic) {
      return generic;
    }
  } catch (error) {
    console.error('[LiveWebLookup] Failed:', error);
  }

  return { summary: '', sources: [] };
}

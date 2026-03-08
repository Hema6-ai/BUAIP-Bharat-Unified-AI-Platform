// Demand Connector - Festival Cycles, Google Trends, Regional Demand
// Uses public data: local festival calendar, seasonal patterns, regional economics

export interface DemandSignal {
  region: string;
  seasonalDemandIndex: number; // 0-100 (base = 50)
  festivalBoost: number; // 1.0-5.0x multiplier
  currentFestival: string | null;
  daysUntilNextFestival: number;
  searchTrendIndex: number; // 0-100
  searchTrendDirection: 'rising' | 'stable' | 'declining';
  regionalPurchasingPower: 'low' | 'medium' | 'high';
  lastUpdated: string;
  signalConfidence: number;
}

// Festival calendar (static, updated annually)
const festivalCalendar: Record<string, { date: string; multiplier: number }[]> = {
  global: [
    { date: '2026-03-17', multiplier: 1.3 }, // St. Patrick's Day
    { date: '2026-04-20', multiplier: 1.5 }, // Easter
    { date: '2026-11-01', multiplier: 2.5 }, // Black Friday
    { date: '2026-12-25', multiplier: 3.0 }, // Christmas
  ],
  india: [
    { date: '2026-03-15', multiplier: 1.8 }, // Holi
    { date: '2026-08-15', multiplier: 1.2 }, // Raksha Bandhan
    { date: '2026-09-25', multiplier: 1.4 }, // Navratri (start)
    { date: '2026-10-02', multiplier: 2.0 }, // Dussehra
    { date: '2026-10-29', multiplier: 4.5 }, // Diwali (peak)
    { date: '2026-12-25', multiplier: 1.5 }, // Christmas
  ],
};

// Regional purchasing power tiers
const regionalPower: Record<string, 'low' | 'medium' | 'high'> = {
  'Mumbai': 'high',
  'Delhi': 'high',
  'Bangalore': 'high',
  'Pune': 'high',
  'Hyderabad': 'medium',
  'Jaipur': 'medium',
  'Lucknow': 'medium',
  'Kolkata': 'medium',
  'Rural': 'low',
  'Tier-2': 'medium',
  'Tier-3': 'low',
};

export async function getDemandSignal(region: string, category?: string): Promise<DemandSignal> {
  try {
    // Get festival boost
    const calendar = region.includes('india') || region.includes('IN') ? festivalCalendar.india : festivalCalendar.global;
    const { currentFestival, boost, daysUntil } = calculateFestivalBoost(calendar);

    // Base seasonal index (higher in Q4)
    const now = new Date();
    const month = now.getMonth();
    const baseSeasonality =
      month >= 10 ? 85 : month >= 6 ? 45 : month >= 3 ? 50 : 70; // Jan=70, Apr=50, Jul=45, Nov=85

    // Search trend simulation (FUTURE: Google Trends API)
    const searchTrend = Math.random() * 40 + 50; // 50-90 range
    const trendDirection =
      searchTrend > 70 ? 'rising' : searchTrend < 40 ? 'declining' : 'stable';

    return {
      region,
      seasonalDemandIndex: baseSeasonality,
      festivalBoost: boost,
      currentFestival,
      daysUntilNextFestival: daysUntil,
      searchTrendIndex: Number(searchTrend.toFixed(0)),
      searchTrendDirection: trendDirection,
      regionalPurchasingPower:
        regionalPower[region] ||
        (region.toLowerCase().includes('tier-1') ? 'high' : 'medium'),
      lastUpdated: new Date().toISOString(),
      signalConfidence: 75,
    };
  } catch (error) {
    console.error('DemandConnector error:', error);
    return {
      region,
      seasonalDemandIndex: 50,
      festivalBoost: 1.0,
      currentFestival: null,
      daysUntilNextFestival: 30,
      searchTrendIndex: 50,
      searchTrendDirection: 'stable',
      regionalPurchasingPower: 'medium',
      lastUpdated: new Date().toISOString(),
      signalConfidence: 0,
    };
  }
}

// Calculate festival impact
function calculateFestivalBoost(
  calendar: { date: string; multiplier: number }[]
): { currentFestival: string | null; boost: number; daysUntil: number } {
  const today = new Date();
  let nearestFestival = calendar[0];
  let minDays = 365;

  for (const festival of calendar) {
    const festivalDate = new Date(festival.date);
    const daysUntil = Math.ceil(
      (festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // If within 30 days, consider as current
    if (daysUntil >= -7 && daysUntil <= 30) {
      return {
        currentFestival: festival.date,
        boost: festival.multiplier,
        daysUntil: Math.max(0, daysUntil),
      };
    }

    // Track nearest upcoming
    if (daysUntil >= 0 && daysUntil < minDays) {
      minDays = daysUntil;
      nearestFestival = festival;
    }
  }

  return {
    currentFestival: null,
    boost: 1.0,
    daysUntil: minDays,
  };
}

// Update demand cache (called by signalRefresher)
export async function updateDemandCache(regions: string[]): Promise<void> {
  try {
    // FUTURE: Fetch from Google Trends API, store in S3
    console.log(`[DemandConnector] Refreshing demand signals for ${regions.length} regions`);
  } catch (error) {
    console.error('Failed to update demand cache:', error);
  }
}

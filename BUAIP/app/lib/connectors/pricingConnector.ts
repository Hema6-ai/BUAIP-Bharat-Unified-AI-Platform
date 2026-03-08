// Pricing Connector - Amazon Price History & Volatility Detection
// Hybrid mock/live: simulates Keepa-style data for demo, ready for API swap

export interface PricingSignal {
  asin: string;
  marketplace: string;
  currentPrice: number;
  avg30DayPrice: number;
  avg180DayPrice: number;
  priceVolatility: 'low' | 'medium' | 'high';
  lowestPrice30Days: number;
  highestPrice30Days: number;
  priceDropCount: number;
  detectedPattern: string;
  lastUpdated: string;
  signalConfidence: number; // 0-100
}

// Mock price history database (simulates S3 + DynamoDB later)
const mockPriceHistory: Record<string, number[]> = {
  'B08ABC123': [299, 295, 290, 285, 280, 282, 280, 278, 275, 272, 270, 268], // Last 12 weeks
  'B08XYZ456': [1499, 1495, 1500, 1520, 1500, 1480, 1490, 1500, 1505, 1510, 1515, 1525],
  'B08QRS789': [79.99, 79.99, 79.99, 74.99, 74.99, 79.99, 79.99, 74.99, 69.99, 69.99, 74.99, 79.99],
};

export async function getPricingSignal(
  asin: string,
  marketplace: string = 'US'
): Promise<PricingSignal | null> {
  try {
    // FUTURE: Replace with Keepa API or sp-api call
    // const response = await fetch(`https://api.keepa.com/product?asin=${asin}&...`);

    // Current: Mock data based on ASIN
    const history = mockPriceHistory[asin] || generateMockHistory();
    const current = history[history.length - 1];
    const avg30 = history.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, history.length);
    const avg180 = history.reduce((a, b) => a + b, 0) / history.length;

    // Calculate volatility
    const variance = history.reduce((sum, price) => sum + Math.pow(price - avg30, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    const volatility =
      stdDev / avg30 > 0.15 ? 'high' : stdDev / avg30 > 0.08 ? 'medium' : 'low';

    // Detect patterns
    const recentDrops = history
      .slice(-4)
      .reduce((count, price, i) => (i > 0 && price < history[history.length - 5 + i] ? count + 1 : count), 0);
    const pattern =
      recentDrops >= 2
        ? 'aggressive_price_cutting'
        : current < avg180 * 0.9
          ? 'below_average_pricing'
          : current > avg180 * 1.1
            ? 'premium_pricing'
            : 'stable_pricing';

    return {
      asin,
      marketplace,
      currentPrice: current,
      avg30DayPrice: Number(avg30.toFixed(2)),
      avg180DayPrice: Number(avg180.toFixed(2)),
      priceVolatility: volatility,
      lowestPrice30Days: Math.min(...history.slice(-4)),
      highestPrice30Days: Math.max(...history.slice(-4)),
      priceDropCount: recentDrops,
      detectedPattern: pattern,
      lastUpdated: new Date().toISOString(),
      signalConfidence: 85, // Mock data confidence
    };
  } catch (error) {
    console.error('PricingConnector error:', error);
    return null;
  }
}

// Helper: Generate realistic mock price history
function generateMockHistory(): number[] {
  const prices: number[] = [];
  let price = Math.random() * 300 + 50;
  for (let i = 0; i < 12; i++) {
    price += (Math.random() - 0.5) * 20; // Random walk
    prices.push(Number(Math.max(price, 20).toFixed(2)));
  }
  return prices;
}

// Update price cache (called by signalRefresher)
export async function updatePricingCache(asins: string[]): Promise<void> {
  try {
    // FUTURE: Batch fetch from API, store in S3
    // For now: just validate ASINs
    console.log(`[PricingConnector] Updating price cache for ${asins.length} products`);
    // In production: update DynamoDB or S3
  } catch (error) {
    console.error('Failed to update pricing cache:', error);
  }
}

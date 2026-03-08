// Seller Signal Connector - Amazon Seller Central Metrics
// Simulates SP-API data: inventories, buy box, fulfillment, category ranks

export interface SellerSignal {
  asin: string;
  marketplace: string;
  buyBoxOwner: string; // 'self' | 'competitor_name'
  buyBoxWinPercentage: number; // 0-100
  inventoryLevel: number; // units
  inventoryDaysLeft: number;
  fulfillmentType: 'FBA' | 'FBM' | 'mixed';
  fulfillmentSpeed: '1-2 days' | '2-3 days' | '3-5 days' | 'slow';
  feedbackRating: number; // 0-5
  accountHealth: 'excellent' | 'good' | 'at-risk' | 'warning';
  categoryRank: number; // Best Seller rank or category position
  categoryRankTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  signalConfidence: number;
}

// Mock Seller Central data
const mockSellerMetrics: Record<string, Partial<SellerSignal>> = {
  'B08ABC123': {
    buyBoxOwner: 'self',
    buyBoxWinPercentage: 95,
    inventoryLevel: 325,
    fulfillmentType: 'FBA',
    feedbackRating: 4.8,
    accountHealth: 'excellent',
    categoryRank: 15,
    categoryRankTrend: 'improving',
  },
  'B08XYZ456': {
    buyBoxOwner: 'competitor: ElectroHub',
    buyBoxWinPercentage: 35,
    inventoryLevel: 78,
    fulfillmentType: 'FBM',
    feedbackRating: 4.6,
    accountHealth: 'at-risk',
    categoryRank: 142,
    categoryRankTrend: 'declining',
  },
  'B08QRS789': {
    buyBoxOwner: 'self',
    buyBoxWinPercentage: 88,
    inventoryLevel: 1200,
    fulfillmentType: 'FBA',
    feedbackRating: 4.9,
    accountHealth: 'excellent',
    categoryRank: 3,
    categoryRankTrend: 'stable',
  },
};

export async function getSellerSignal(
  asin: string,
  marketplace: string = 'US'
): Promise<SellerSignal | null> {
  try {
    // FUTURE: Call Amazon SP-API /orders, /inventory, /catalog endpoints
    // const response = await fetch(`https://sellingpartnerapi-${marketplace}.amazon.com/...`);

    const metrics = mockSellerMetrics[asin] || generateMockSellerMetrics();

    // Calculate days of inventory
    const dailySalesEstimate = Math.random() * 50 + 10; // Mock: 10-60 units/day
    const inventoryDaysLeft = Math.floor((metrics.inventoryLevel || 100) / dailySalesEstimate);

    return {
      asin,
      marketplace,
      buyBoxOwner: metrics.buyBoxOwner || 'self',
      buyBoxWinPercentage: metrics.buyBoxWinPercentage || Math.random() * 100,
      inventoryLevel: metrics.inventoryLevel || Math.floor(Math.random() * 1000 + 50),
      inventoryDaysLeft,
      fulfillmentType: (metrics.fulfillmentType as 'FBA' | 'FBM' | 'mixed') || 'FBA',
      fulfillmentSpeed: inventoryDaysLeft < 7 ? 'slow' : '1-2 days',
      feedbackRating: metrics.feedbackRating || Math.random() * (5 - 4) + 4,
      accountHealth: metrics.accountHealth || 'good',
      categoryRank: metrics.categoryRank || Math.floor(Math.random() * 500 + 1),
      categoryRankTrend: metrics.categoryRankTrend || 'stable',
      lastUpdated: new Date().toISOString(),
      signalConfidence: 90,
    };
  } catch (error) {
    console.error('SellerSignalConnector error:', error);
    return null;
  }
}

// Helper: Generate mock seller metrics
function generateMockSellerMetrics(): Partial<SellerSignal> {
  return {
    buyBoxOwner: Math.random() > 0.7 ? 'competitor' : 'self',
    buyBoxWinPercentage: Math.random() * 100,
    inventoryLevel: Math.floor(Math.random() * 1000 + 50),
    fulfillmentType: Math.random() > 0.3 ? 'FBA' : 'FBM',
    feedbackRating: Math.random() * (5 - 4) + 4,
    accountHealth: ['excellent', 'good', 'at-risk'][Math.floor(Math.random() * 3)] as any,
    categoryRank: Math.floor(Math.random() * 500 + 1),
    categoryRankTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)] as any,
  };
}

// Update seller metrics (called by signalRefresher)
export async function updateSellerMetrics(asins: string[]): Promise<void> {
  try {
    // FUTURE: Batch fetch from SP-API
    console.log(`[SellerSignalConnector] Syncing metrics for ${asins.length} products`);
    // In production: update DynamoDB
  } catch (error) {
    console.error('Failed to update seller metrics:', error);
  }
}

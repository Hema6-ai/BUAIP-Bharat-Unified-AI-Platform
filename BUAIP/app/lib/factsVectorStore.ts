import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

interface FactVectorItem {
  id: string;
  category: string;
  keywords: string[];
  content: string;
  updatedAt?: string;
}

interface FactContextResult {
  summary: string;
  items: FactVectorItem[];
  source: 'dynamodb' | 'seed' | 'none';
}

const FACT_VECTOR_TABLE = process.env.DYNAMODB_FACTS_VECTOR_TABLE || 'buaip-facts-vector';

const SEED_FACTS: FactVectorItem[] = [
  {
    id: 'scheme-list-source',
    category: 'government_scheme_lists',
    keywords: ['scheme', 'yojana', 'eligibility', 'benefit', 'subsidy'],
    content: 'Scheme recommendations should reference official portals such as myscheme.gov.in and relevant ministry websites.',
  },
  {
    id: 'agri-market-source',
    category: 'mandi_prices',
    keywords: ['mandi', 'crop price', 'market demand', 'sell', 'storage'],
    content: 'For mandi or commodity prices, avoid assumptions and rely on live Agmarknet or state mandi feeds before issuing numeric guidance.',
  },
  {
    id: 'weather-source',
    category: 'weather',
    keywords: ['weather', 'rain', 'forecast', 'temperature', 'humidity'],
    content: 'Weather-sensitive recommendations should be tied to IMD or verified weather APIs; do not fabricate climate values.',
  },
  {
    id: 'legal-acts-source',
    category: 'legal_acts',
    keywords: ['legal', 'rights', 'act', 'tenant', 'eviction', 'consumer'],
    content: 'Legal guidance should cite applicable Indian acts and procedural next steps without inventing section numbers.',
  },
  {
    id: 'export-rules-source',
    category: 'export_rules',
    keywords: ['export', 'global selling', 'compliance', 'customs', 'gst'],
    content: 'Export compliance should be aligned to DGFT, GST, and destination-country import rules; uncertain rules must be flagged as requiring verification.',
  },
];

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

function scoreFact(query: string, keywords: string[]): number {
  const lower = query.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }

  return score;
}

async function fetchFactsFromDynamoDB(): Promise<FactVectorItem[]> {
  try {
    const command = new ScanCommand({
      TableName: FACT_VECTOR_TABLE,
      Limit: 100,
    });

    const response = await docClient.send(command);
    const items = (response.Items || []) as FactVectorItem[];
    return items.filter((item) => Array.isArray(item.keywords) && !!item.content);
  } catch (error) {
    console.error('[FactsVectorStore] DynamoDB scan failed, using seed facts:', error);
    return [];
  }
}

function rankFacts(query: string, facts: FactVectorItem[], maxResults: number): FactVectorItem[] {
  return facts
    .map((fact) => ({
      fact,
      score: scoreFact(query, fact.keywords || []),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => entry.fact);
}

export async function getFactsContextForQuery(
  query: string,
  maxResults = 3
): Promise<FactContextResult> {
  const dynamoFacts = await fetchFactsFromDynamoDB();
  const rankedDynamo = rankFacts(query, dynamoFacts, maxResults);

  if (rankedDynamo.length > 0) {
    return {
      summary: rankedDynamo.map((item) => `- ${item.content}`).join('\n'),
      items: rankedDynamo,
      source: 'dynamodb',
    };
  }

  const rankedSeed = rankFacts(query, SEED_FACTS, maxResults);
  if (rankedSeed.length > 0) {
    return {
      summary: rankedSeed.map((item) => `- ${item.content}`).join('\n'),
      items: rankedSeed,
      source: 'seed',
    };
  }

  return {
    summary: '',
    items: [],
    source: 'none',
  };
}

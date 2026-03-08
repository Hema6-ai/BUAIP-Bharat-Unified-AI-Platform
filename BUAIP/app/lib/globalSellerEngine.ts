import { callBedrock } from '@/app/lib/bedrock';
import { KendraClient, QueryCommand } from '@aws-sdk/client-kendra';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ComprehendClient, DetectSentimentCommand } from '@aws-sdk/client-comprehend';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { TranscribeClient, StartTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { readFileSync } from 'fs';
import { join } from 'path';

export type GlobalSellerMode = 'GLOBAL' | 'INDIA';

export interface GlobalSellerRequest {
  query: string;
  mode?: GlobalSellerMode;
  language?: string;
  voiceResponse?: boolean;
  voiceS3Uri?: string;
  reviewText?: string;
}

export interface GlobalSellerResponse {
  engine: 'GlobalSellerEngine';
  mode: GlobalSellerMode;
  activeModules: string[];
  response: string;
  structuredOutput?: {
    analysis: string;
    recommendations: string[];
    supportingData: Record<string, any>;
    confidenceScore: number; // 0-100
  };
  dataContext: {
    assumptions: string[];
    kendraFindings: Array<{ title: string; uri: string; score: string }>;
    s3Datasets: Array<{ key: string; lastModified: string | null; size: number }>;
    dynamoSignals: Array<Record<string, unknown>>;
    rdsSignals: Array<Record<string, unknown>>;
    comprehendSignals: Record<string, unknown> | null;
    transcribeStatus: string | null;
  };
  voiceResponseBase64?: string | null;
  timestamp: string;
}

const REGION = process.env.AWS_REGION || 'ap-south-1';

const clients = {
  kendra: new KendraClient({ region: REGION }),
  s3: new S3Client({ region: REGION }),
  dynamodb: new DynamoDBClient({ region: REGION }),
  comprehend: new ComprehendClient({ region: REGION }),
  sns: new SNSClient({ region: REGION }),
  cloudwatch: new CloudWatchClient({ region: REGION }),
  polly: new PollyClient({ region: REGION }),
  transcribe: new TranscribeClient({ region: REGION }),
};

const GLOBAL_MODULES = [
  'M1 Market Expansion',
  'M2 Supply Chain Risk',
  'M3 Cultural Listing Adaptation',
  'M4 Compliance Navigation',
  'M5 Pricing Intelligence',
  'M6 Manufacturer Trust Scoring',
  'M7 Launch Intelligence',
];

const INDIA_MODULES = [
  'I1 Multi-Platform Expansion',
  'I2 Indian Sourcing Hub Finder',
  'I3 GST and Compliance',
  'I4 Regional Pricing',
  'I5 B2B Wholesale Connect',
  'I6 Logistics Optimizer',
  'I7 Bharat Voice Shopping',
  'I8 Fake Review Detector',
  'I9 Festival Demand Forecast',
  'I10 Seller Policy Shield',
];

const KEYWORDS = [
  'selling products',
  'amazon marketplaces',
  'amazon seller',
  'sourcing manufacturers',
  'pricing strategy',
  'supply chain',
  'e-commerce platforms',
  'logistics',
  'compliance',
  'seller policies',
  'flipkart',
  'meesho',
  'jiomart',
  'indiamart',
  'tradeindia',
  'gst',
  'hsn',
  'festival demand',
];

export function isGlobalSellerIntent(query: string): boolean {
  const text = query.toLowerCase();
  return KEYWORDS.some((kw) => text.includes(kw));
}

export function detectGlobalSellerMode(query: string): GlobalSellerMode {
  const text = query.toLowerCase();
  const indiaSignals = [
    'india',
    'amazon.in',
    'flipkart',
    'meesho',
    'jiomart',
    'snapdeal',
    'gst',
    'hsn',
    'fssai',
    'bis',
    'isi',
    'delhivery',
    'shiprocket',
    'ekart',
    'india post',
    'diwali',
    'onam',
    'pongal',
    'durga puja',
    'holi',
    'raksha bandhan',
  ];
  return indiaSignals.some((k) => text.includes(k)) ? 'INDIA' : 'GLOBAL';
}

// ============================================================================
// DATA LOADING & CACHING
// ============================================================================

const DATA_CACHE: Record<string, { data: any; timestamp: number; ttl: number }> = {};

const CACHE_TTL = {
  manufacturing_hubs: 7 * 24 * 60 * 60 * 1000, // 7 days
  festival_demand: 7 * 24 * 60 * 60 * 1000, // 7 days
  marketplace_policies: 24 * 60 * 60 * 1000, // 24 hours
  logistics_costs: 12 * 60 * 60 * 1000, // 12 hours
  multi_platform: 24 * 60 * 60 * 1000, // 24 hours
};

function loadDataFile(filename: string): any {
  const cacheKey = filename;
  const now = Date.now();

  // Check memory cache first
  if (DATA_CACHE[cacheKey] && now < DATA_CACHE[cacheKey].timestamp + DATA_CACHE[cacheKey].ttl) {
    return DATA_CACHE[cacheKey].data;
  }

  // Load from file
  try {
    const dataPath = join(process.cwd(), 'data', filename);
    const fileContent = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Store in cache
    const ttl = CACHE_TTL[filename.replace('.json', '') as keyof typeof CACHE_TTL] || 24 * 60 * 60 * 1000;
    DATA_CACHE[cacheKey] = { data, timestamp: now, ttl };
    
    return data;
  } catch (error) {
    console.error(`[GlobalSeller] Failed to load ${filename}:`, error);
    return null;
  }
}

async function cacheInDynamoDB(key: string, data: any, ttlDays: number): Promise<void> {
  const cacheTable = process.env.GLOBALSELLER_CACHE_TABLE;
  if (!cacheTable) return;

  try {
    const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
    await clients.dynamodb.send(
      new PutItemCommand({
        TableName: cacheTable,
        Item: {
          cacheKey: { S: key },
          data: { S: JSON.stringify(data) },
          expiresAt: { N: expiryTimestamp.toString() },
          lastUpdated: { S: new Date().toISOString() },
        },
      })
    );
  } catch (error) {
    console.log('[GlobalSeller] DynamoDB cache write failed (non-blocking):', error);
  }
}

async function fetchFromDynamoDBCache(key: string): Promise<any | null> {
  const cacheTable = process.env.GLOBALSELLER_CACHE_TABLE;
  if (!cacheTable) return null;

  try {
    const result = await clients.dynamodb.send(
      new GetItemCommand({
        TableName: cacheTable,
        Key: { cacheKey: { S: key } },
      })
    );

    if (result.Item && result.Item.data && result.Item.data.S) {
      const expiresAt = parseInt(result.Item.expiresAt?.N || '0');
      const now = Math.floor(Date.now() / 1000);
      
      if (expiresAt > now) {
        return JSON.parse(result.Item.data.S);
      }
    }
  } catch (error) {
    console.log('[GlobalSeller] DynamoDB cache read failed (non-blocking):', error);
  }
  return null;
}

function getManufacturingHubs() {
  return loadDataFile('india_manufacturing_hubs.json');
}

function getFestivalDemand() {
  return loadDataFile('india_festival_demand.json');
}

function getMarketplacePolicies() {
  return loadDataFile('marketplace_policies.json');
}

function getLogisticsCosts() {
  return loadDataFile('india_logistics_costs.json');
}

function getMultiPlatformData() {
  return loadDataFile('multi_platform_data.json');
}

export async function runGlobalSellerEngine(input: GlobalSellerRequest): Promise<GlobalSellerResponse> {
  const startedAt = Date.now();
  const query = input.query.trim();
  if (!query) {
    throw new Error('GlobalSellerEngine query is required');
  }

  const mode = input.mode || detectGlobalSellerMode(query);
  const activeModules = mode === 'INDIA' ? INDIA_MODULES : GLOBAL_MODULES;

  const assumptions: string[] = [];
  
  // Load real data sources
  const [ 
    kendraFindings, 
    s3Datasets, 
    dynamoSignals, 
    rdsSignals, 
    comprehendSignals, 
    transcribeStatus,
    manufacturingHubs,
    festivalDemand,
    marketplacePolicies,
    logisticsCosts,
    multiPlatformData
  ] = await Promise.all([
    fetchKendraFindings(query, assumptions),
    fetchS3Datasets(assumptions),
    fetchDynamoSignals(assumptions),
    fetchRdsSignals(assumptions),
    input.reviewText ? fetchComprehendSignals(input.reviewText, assumptions) : Promise.resolve(null),
    input.voiceS3Uri ? startTranscribeJob(input.voiceS3Uri, assumptions) : Promise.resolve(null),
    Promise.resolve(getManufacturingHubs()),
    Promise.resolve(getFestivalDemand()),
    Promise.resolve(getMarketplacePolicies()),
    Promise.resolve(getLogisticsCosts()),
    Promise.resolve(getMultiPlatformData())
  ]);

  const systemPrompt = buildGlobalSellerSystemPrompt({
    mode,
    activeModules,
    assumptions,
    kendraFindings,
    s3Datasets,
    dynamoSignals,
    rdsSignals,
    comprehendSignals,
    language: input.language || 'English',
    manufacturingHubs,
    festivalDemand,
    marketplacePolicies,
    logisticsCosts,
    multiPlatformData
  });

  // Load-bearing AI rule: if Bedrock fails, we fail the request instead of returning static logic.
  const response = await callBedrock(
    [{ role: 'user', content: query }],
    systemPrompt,
    { temperature: 0.2, maxTokens: 2500 }
  );

  // Parse structured output from AI response
  const structuredOutput = parseStructuredOutput(response, assumptions);

  const severity = deriveSeverity(response);
  if (severity === 'HIGH') {
    await publishAlert(query, response);
  }

  const voiceResponseBase64 = input.voiceResponse
    ? await synthesizeVoiceResponse(response)
    : null;

  await publishMetric('InvocationCount', 1);
  await publishMetric('LatencyMs', Date.now() - startedAt);

  return {
    engine: 'GlobalSellerEngine',
    mode,
    activeModules,
    response,
    structuredOutput,
    dataContext: {
      assumptions,
      kendraFindings,
      s3Datasets,
      dynamoSignals,
      rdsSignals,
      comprehendSignals,
      transcribeStatus,
    },
    voiceResponseBase64,
    timestamp: new Date().toISOString(),
  };
}

function buildGlobalSellerSystemPrompt(input: {
  mode: GlobalSellerMode;
  activeModules: string[];
  assumptions: string[];
  kendraFindings: Array<{ title: string; uri: string; score: string }>;
  s3Datasets: Array<{ key: string; lastModified: string | null; size: number }>;
  dynamoSignals: Array<Record<string, unknown>>;
  rdsSignals: Array<Record<string, unknown>>;
  comprehendSignals: Record<string, unknown> | null;
  language: string;
  manufacturingHubs: any;
  festivalDemand: any;
  marketplacePolicies: any;
  logisticsCosts: any;
  multiPlatformData: any;
}): string {
  const moduleList = input.activeModules.map((m, i) => `${i + 1}. ${m}`).join('\n');
  
  // Build production data context with safe array checking
  const hubList = Array.isArray(input.manufacturingHubs?.hubs) ? input.manufacturingHubs.hubs.map((h: any) => h.hub_name).join(', ') : 'Loading...';
  const hubCount = Array.isArray(input.manufacturingHubs?.hubs) ? input.manufacturingHubs.hubs.length : 0;
  const festivalList = Array.isArray(input.festivalDemand?.festivals) ? input.festivalDemand.festivals.map((f: any) => f.festival_name).join(', ') : 'Loading...';
  const festivalCount = Array.isArray(input.festivalDemand?.festivals) ? input.festivalDemand.festivals.length : 0;
  const platformList = Array.isArray(input.multiPlatformData?.platforms) ? input.multiPlatformData.platforms.map((p: any) => p.platform_name).join(', ') : 'Loading...';
  const platformCount = Array.isArray(input.multiPlatformData?.platforms) ? input.multiPlatformData.platforms.length : 0;
  const providerList = Array.isArray(input.logisticsCosts?.providers) ? input.logisticsCosts.providers.map((p: any) => p.provider_name).join(', ') : 'Loading...';
  const providerCount = Array.isArray(input.logisticsCosts?.providers) ? input.logisticsCosts.providers.length : 0;
  const policyPlatforms = Array.isArray(input.marketplacePolicies?.platforms) ? input.marketplacePolicies.platforms.map((p: any) => p.platform_name).join(', ') : 'Loading...';
  const policyCount = Array.isArray(input.marketplacePolicies?.platforms) ? input.marketplacePolicies.platforms.length : 0;
  
  const modulePlaybook = `GLOBAL MODULE PLAYBOOK:
- M1 Market Expansion: score all Amazon marketplaces 0-100, explain demand/competition, pick best market, provide 90-day entry plan.
- M2 Supply Chain Risk: evaluate supplier geography risk, inventory runway, alternate suppliers, contingency triggers.
- M3 Cultural Listing Adaptation: rewrite listing tone by market culture and buyer psychology.
- M4 Compliance Navigation: include CE, FCC, REACH, CPSC with cost and timeline ranges.
- M5 Pricing Intelligence: provide competitor ranges, recommended price bands, seasonal price calendar.
- M6 Manufacturer Trust Scoring: score financial stability, delivery reliability, compliance history.
- M7 Launch Intelligence: week-by-week launch plan from Week -4 to Month 3 including keyword strategy, review velocity, ad spend and pivot triggers.

INDIA MODULE PLAYBOOK WITH PRODUCTION DATA:
- I1 Multi-Platform Expansion: Compare ${platformCount} platforms (${platformList}). Use real commission structures, demographics, and category demand data. Provide opportunity scores 0-100 with GMV context.
- I2 Indian Sourcing Hub Finder: Map categories to ${hubCount} production hubs (${hubList}). Include actual MOQ ranges, cost tiers, quality levels, lead times, and logistics costs from hub database.
- I3 GST and Compliance: include GST slab, HSN code path, FSSAI, BIS, ISI, MSME registration with costs and timelines.
- I4 Regional Pricing: model North/South/East/West and Tier1/Tier2/Tier3 differences plus festival pricing.
- I5 B2B Wholesale Connect: include IndiaMART, TradeIndia, Udaan and wholesale pricing formulas.
- I6 Logistics Optimizer: Compare ${providerCount} providers (${providerList}). Use real zone-based pricing, delivery times, COD charges, and RTO rates from logistics database.
- I7 Bharat Voice Shopping: if user asks in Hindi/Telugu/Tamil/Bengali/Marathi/Kannada/Malayalam/Gujarati, respond in same language.
- I8 Fake Review Detector: evaluate review bursts, templates, incentives and price manipulation with authenticity verdict.
- I9 Festival Demand Forecast: Analyze ${festivalCount} major festivals (${festivalList}). Use real demand multipliers, preparation lead times, top categories, and inventory recommendations.
- I10 Seller Policy Shield: Interpret policies for ${policyCount} platforms (${policyPlatforms}). Include actual violation triggers, severity levels, consequences, remedies, and appeals guidance.`;

  return `You are GlobalSeller AI - a world-class Amazon global selling strategist with expertise in global marketplaces and Indian e-commerce.

You provide highly tactical advice about market expansion, pricing, compliance, logistics, and supply chains.
Always produce structured analysis with numbers, costs, and timelines.

LOAD-BEARING AI RULE:
- Perform market scoring, demand analysis, supply chain risk evaluation, regulatory interpretation, logistics optimization, fraud detection, pricing modeling, and demand forecasting.
- No static checklist-only responses.

ACTIVE LAYER: ${input.mode}
ACTIVE MODULES:
${moduleList}

${modulePlaybook}

REAL DATA CONTEXT (DO NOT FABRICATE):
AWS Data Sources:
- Kendra findings: ${JSON.stringify(input.kendraFindings)}
- S3 datasets: ${JSON.stringify(input.s3Datasets)}
- DynamoDB metadata: ${JSON.stringify(input.dynamoSignals)}
- RDS manufacturer/logistics signals: ${JSON.stringify(input.rdsSignals)}
- Comprehend review signals: ${JSON.stringify(input.comprehendSignals)}

Production Datasets Loaded:
- Manufacturing Hubs: ${hubCount} hubs with MOQ, costs, lead times, quality tiers
- Festival Demand: ${festivalCount} festivals with demand multipliers and inventory guidance
- Marketplace Policies: ${policyCount} platforms with violation rules and appeals process
- Logistics Costs: ${providerCount} providers with zone-based pricing and RTO rates
- Multi-Platform Data: ${platformCount} platforms with commission structures and demographics

USE PRODUCTION DATA:
- For I1 (Multi-Platform): Query multiPlatformData for commission rates, demographics, GMV, category demand
- For I2 (Sourcing Hubs): Query manufacturingHubs for MOQ ranges, costs, lead times by category
- For I6 (Logistics): Query logisticsCosts for per-kg pricing by zone, delivery times, RTO rates
- For I9 (Festival Demand): Query festivalDemand for demand multipliers, inventory recommendations, peak windows
- For I10 (Policy Shield): Query marketplacePolicies for violation triggers, consequences, appeals guidance

REAL DATA RULE:
- If data is missing, explicitly list assumptions and confidence impact.
- Never fabricate policy clauses or pricing values.

RESPONSE FORMAT:
1) Intent and market scope
2) Numeric market/platform scoring (0-100)
3) Demand and pricing model with ranges
4) Compliance interpretation (certifications, GST/HSN where relevant)
5) Logistics optimization (carrier comparison + risk)
6) Fraud and policy risk checks
7) 90-day action plan (week-by-week)
8) Assumptions and data confidence

ASSUMPTIONS TO INCLUDE IF NEEDED:
${input.assumptions.length ? input.assumptions.map((a) => `- ${a}`).join('\n') : '- None'}

LANGUAGE:
- Respond in ${input.language}.`;
}

async function fetchKendraFindings(query: string, assumptions: string[]) {
  const indexId = process.env.AWS_KENDRA_INDEX_ID;
  if (!indexId) {
    assumptions.push('AWS_KENDRA_INDEX_ID missing; policy retrieval skipped.');
    return [] as Array<{ title: string; uri: string; score: string }>;
  }

  try {
    const result = await clients.kendra.send(new QueryCommand({ IndexId: indexId, QueryText: query, PageSize: 5 }));
    return (result.ResultItems || []).map((item) => ({
      title: item.DocumentTitle?.Text || 'Untitled',
      uri: item.DocumentURI || '',
      score: item.ScoreAttributes?.ScoreConfidence || 'UNKNOWN',
    }));
  } catch {
    assumptions.push('Kendra query failed; compliance/policy retrieval unavailable.');
    return [];
  }
}

async function fetchS3Datasets(assumptions: string[]) {
  const bucket = process.env.GLOBALSELLER_DATA_BUCKET;
  if (!bucket) {
    assumptions.push('GLOBALSELLER_DATA_BUCKET missing; S3 dataset scan skipped.');
    return [] as Array<{ key: string; lastModified: string | null; size: number }>;
  }

  try {
    const result = await clients.s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 20 }));
    return (result.Contents || []).map((item) => ({
      key: item.Key || '',
      lastModified: item.LastModified ? item.LastModified.toISOString() : null,
      size: item.Size || 0,
    }));
  } catch {
    assumptions.push('S3 listing failed; dataset recency unknown.');
    return [];
  }
}

async function fetchDynamoSignals(assumptions: string[]) {
  const tableName = process.env.GLOBALSELLER_METADATA_TABLE;
  if (!tableName) {
    assumptions.push('GLOBALSELLER_METADATA_TABLE missing; metadata scan skipped.');
    return [] as Array<Record<string, unknown>>;
  }

  try {
    const result = await clients.dynamodb.send(new ScanCommand({ TableName: tableName, Limit: 15 }));
    return ((result.Items || []) as Array<Record<string, unknown>>).slice(0, 10);
  } catch {
    assumptions.push('DynamoDB scan failed; metadata signals unavailable.');
    return [];
  }
}

async function fetchRdsSignals(assumptions: string[]) {
  try {
    // Optional dependency path to avoid hard failure if package is not installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rdsPkg = require('@aws-sdk/client-rds-data') as {
      RDSDataClient: new (args: { region: string }) => { send: (cmd: unknown) => Promise<{ records?: Array<Record<string, unknown>> }> };
      ExecuteStatementCommand: new (args: {
        resourceArn: string;
        secretArn: string;
        database: string;
        sql: string;
        includeResultMetadata: boolean;
      }) => unknown;
    };

    const resourceArn = process.env.RDS_CLUSTER_ARN;
    const secretArn = process.env.RDS_SECRET_ARN;
    const database = process.env.RDS_DATABASE;

    if (!resourceArn || !secretArn || !database) {
      assumptions.push('RDS env vars missing; manufacturer/logistics DB lookup skipped.');
      return [] as Array<Record<string, unknown>>;
    }

    const client = new rdsPkg.RDSDataClient({ region: REGION });
    const command = new rdsPkg.ExecuteStatementCommand({
      resourceArn,
      secretArn,
      database,
      sql: 'SELECT manufacturer_name, risk_score, lead_time_days, region FROM manufacturer_risk_view ORDER BY risk_score DESC LIMIT 10',
      includeResultMetadata: true,
    });

    const result = await client.send(command);
    return result.records || [];
  } catch {
    assumptions.push('RDS Data API unavailable or query failed; supplier DB insights skipped.');
    return [];
  }
}

async function fetchComprehendSignals(reviewText: string, assumptions: string[]) {
  try {
    const result = await clients.comprehend.send(
      new DetectSentimentCommand({ Text: reviewText.slice(0, 4500), LanguageCode: 'en' })
    );
    return {
      sentiment: result.Sentiment || 'UNKNOWN',
      score: result.SentimentScore || {},
    };
  } catch {
    assumptions.push('Comprehend sentiment analysis failed; fraud confidence reduced.');
    return null;
  }
}

async function startTranscribeJob(voiceS3Uri: string, assumptions: string[]) {
  try {
    const jobName = `globalseller-${Date.now()}`;
    await clients.transcribe.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: 'en-IN',
        Media: { MediaFileUri: voiceS3Uri },
      })
    );
    assumptions.push('Transcribe job is asynchronous; final transcript must be fetched from transcript output.');
    return `Transcribe job started: ${jobName}`;
  } catch {
    assumptions.push('Transcribe job failed; text query used instead.');
    return null;
  }
}

/**
 * Parse AI response into structured output format
 * Extracts analysis, recommendations, supporting data, and confidence score
 */
function parseStructuredOutput(aiResponse: string, assumptions: string[]): {
  analysis: string;
  recommendations: string[];
  supportingData: Record<string, any>;
  confidenceScore: number;
} {
  const lines = aiResponse.split('\n');
  let analysis = '';
  const recommendations: string[] = [];
  const supportingData: Record<string, any> = {};
  let confidenceScore = 100;

  // Extract analysis (first substantial paragraph)
  const analysisStart = lines.findIndex(l => l.trim().length > 50);
  if (analysisStart >= 0) {
    let analysisEnd = analysisStart + 1;
    while (analysisEnd < lines.length && lines[analysisEnd].trim().length > 0) {
      analysisEnd++;
    }
    analysis = lines.slice(analysisStart, analysisEnd).join('\n').trim();
  }

  // Extract recommendations (look for numbered lists or action items)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.match(/^\d+\.\s+/) || // numbered list
      line.match(/^-\s+/) || // bullet point
      line.toLowerCase().includes('recommendation') ||
      line.toLowerCase().includes('action') ||
      line.toLowerCase().includes('next step')
    ) {
      const cleanedLine = line.replace(/^\d+\.\s+/, '').replace(/^-\s+/, '').trim();
      if (cleanedLine.length > 10) {
        recommendations.push(cleanedLine);
      }
    }
  }

  // Extract supporting data (look for numbers, percentages, costs, dates)
  const numberMatches = aiResponse.match(/[\d,]+(?:\.\d+)?(?:%|₹|\$|INR|USD|kg|days|weeks)/g);
  if (numberMatches && numberMatches.length > 0) {
    supportingData.numericData = numberMatches.slice(0, 10);
  }

  // Calculate confidence score based on data availability and assumptions
  if (assumptions.length === 0) {
    confidenceScore = 95; // High confidence with all data available
  } else if (assumptions.length <= 2) {
    confidenceScore = 80; // Good confidence with minor assumptions
  } else if (assumptions.length <= 4) {
    confidenceScore = 65; // Medium confidence with several assumptions
  } else {
    confidenceScore = 45; // Low confidence with many assumptions
  }

  return {
    analysis: analysis || aiResponse.slice(0, 500),
    recommendations: recommendations.length > 0 ? recommendations.slice(0, 10) : ['Review full response for detailed guidance'],
    supportingData: {
      ...supportingData,
      assumptionCount: assumptions.length,
      responseLength: aiResponse.length
    },
    confidenceScore
  };
}

async function synthesizeVoiceResponse(text: string) {
  try {
    const result = await clients.polly.send(
      new SynthesizeSpeechCommand({
        Text: text.slice(0, 3000),
        OutputFormat: 'mp3',
        VoiceId: 'Aditi',
        LanguageCode: 'en-IN',
      })
    );

    if (!result.AudioStream) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of result.AudioStream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('base64');
  } catch {
    return null;
  }
}

async function publishAlert(query: string, response: string) {
  const topicArn = process.env.GLOBALSELLER_SNS_TOPIC_ARN;
  if (!topicArn) return;

  try {
    await clients.sns.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: '[GlobalSellerEngine] High risk signal',
        Message: JSON.stringify({ query, responseSnippet: response.slice(0, 1200) }),
      })
    );
  } catch {
    // Non-blocking alert path
  }
}

async function publishMetric(metricName: string, value: number) {
  try {
    await clients.cloudwatch.send(
      new PutMetricDataCommand({
        Namespace: 'BUAIP/GlobalSellerEngine',
        MetricData: [
          {
            MetricName: metricName,
            Unit: 'Count',
            Value: value,
            Timestamp: new Date(),
          },
        ],
      })
    );
  } catch {
    // Non-blocking metric path
  }
}

function deriveSeverity(response: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const lower = response.toLowerCase();
  if (lower.includes('high risk') || lower.includes('critical')) return 'HIGH';
  if (lower.includes('medium risk')) return 'MEDIUM';
  return 'LOW';
}

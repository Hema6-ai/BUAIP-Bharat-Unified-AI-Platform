// Shared DynamoDB helpers — query logging + data retrieval
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "ap-south-1";

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const ddb = new DynamoDBClient({ region: REGION });
    docClient = DynamoDBDocumentClient.from(ddb as any, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

// ─── Query Logging ──────────────────────────────────────────────────────────

const QUERIES_TABLE = process.env.QUERIES_TABLE || "BUAIP_Queries";

export async function logQuery(params: {
  userId: string;
  engine: string;
  query: Record<string, unknown>;
  response: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDocClient().send(
      new PutCommand({
        TableName: QUERIES_TABLE,
        Item: {
          userId: params.userId,
          timestamp: Date.now(),
          engine: params.engine,
          query: params.query,
          response: params.response,
          ttl: Math.floor(Date.now() / 1000) + 90 * 86400, // 90-day TTL
        },
      })
    );
  } catch (err) {
    console.error("[DDB] logQuery failed:", err);
  }
}

export async function getUserHistory(
  userId: string,
  limit = 10
): Promise<any[]> {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: QUERIES_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return res.Items || [];
}

// ─── Mandi Prices Table ─────────────────────────────────────────────────────

const MANDI_TABLE = process.env.MANDI_TABLE || "BUAIP_MandiPrices";

export interface MandiPrice {
  cropState: string; // PK — "Rice#Punjab"
  date: string; // SK — "2026-03-08"
  crop: string;
  state: string;
  market: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
}

export async function getMandiPrice(
  crop: string,
  state: string
): Promise<MandiPrice | null> {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: MANDI_TABLE,
      KeyConditionExpression: "cropState = :cs",
      ExpressionAttributeValues: { ":cs": `${crop}#${state}` },
      ScanIndexForward: false,
      Limit: 1,
    })
  );
  return (res.Items?.[0] as MandiPrice) || null;
}

export async function getMandiPriceHistory(
  crop: string,
  state: string,
  days = 30
): Promise<MandiPrice[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: MANDI_TABLE,
      KeyConditionExpression: "cropState = :cs AND #d >= :cutoff",
      ExpressionAttributeNames: { "#d": "date" },
      ExpressionAttributeValues: {
        ":cs": `${crop}#${state}`,
        ":cutoff": cutoff.toISOString().split("T")[0],
      },
      ScanIndexForward: true,
    })
  );
  return (res.Items as MandiPrice[]) || [];
}

export async function putMandiPrices(prices: MandiPrice[]): Promise<void> {
  const dc = getDocClient();
  // DynamoDB batch write in groups of 25
  for (let i = 0; i < prices.length; i += 25) {
    const batch = prices.slice(i, i + 25);
    await dc.send(
      new BatchWriteCommand({
        RequestItems: {
          [MANDI_TABLE]: batch.map((p) => ({
            PutRequest: {
              Item: {
                ...p,
                ttl: Math.floor(Date.now() / 1000) + 30 * 86400,
              },
            },
          })),
        },
      })
    );
  }
}

// ─── Weather Cache Table ────────────────────────────────────────────────────

const WEATHER_TABLE = process.env.WEATHER_TABLE || "BUAIP_Weather";

export interface WeatherData {
  stateDistrict: string; // PK — "Punjab#Ludhiana"
  fetchedAt: string; // SK — ISO timestamp
  temperature: number;
  humidity: number;
  rainfall: number;
  rainfallRisk: string;
  forecast7Day: string;
  windSpeed: number;
  condition: string;
}

export async function getWeather(
  state: string,
  district?: string
): Promise<WeatherData | null> {
  const pk = district ? `${state}#${district}` : state;
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: WEATHER_TABLE,
      KeyConditionExpression: "stateDistrict = :sd",
      ExpressionAttributeValues: { ":sd": pk },
      ScanIndexForward: false,
      Limit: 1,
    })
  );
  return (res.Items?.[0] as WeatherData) || null;
}

export async function putWeather(data: WeatherData): Promise<void> {
  await getDocClient().send(
    new PutCommand({
      TableName: WEATHER_TABLE,
      Item: {
        ...data,
        ttl: Math.floor(Date.now() / 1000) + 6 * 3600, // 6-hour TTL
      },
    })
  );
}

// ─── Schemes Table ──────────────────────────────────────────────────────────

const SCHEMES_TABLE = process.env.SCHEMES_TABLE || "BUAIP_Schemes";

export interface SchemeRecord {
  domain: string; // PK — "agriculture" | "education" | "health" …
  schemeId: string; // SK — unique identifier
  name: string;
  description: string;
  eligibility: Record<string, any>;
  benefits: string;
  applicationUrl?: string;
  documents: string[];
  states: string[]; // empty = all-India
  lastUpdated: string;
}

export async function getSchemesByDomain(
  domain: string
): Promise<SchemeRecord[]> {
  const res = await getDocClient().send(
    new QueryCommand({
      TableName: SCHEMES_TABLE,
      KeyConditionExpression: "domain = :d",
      ExpressionAttributeValues: { ":d": domain },
    })
  );
  return (res.Items as SchemeRecord[]) || [];
}

export async function putScheme(scheme: SchemeRecord): Promise<void> {
  await getDocClient().send(
    new PutCommand({ TableName: SCHEMES_TABLE, Item: scheme })
  );
}

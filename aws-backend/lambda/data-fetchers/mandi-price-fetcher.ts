// Mandi Price Fetcher — EventBridge scheduled Lambda
// Fetches real-time mandi prices from Agmarknet / data.gov.in and writes to DynamoDB
import { putMandiPrices, MandiPrice } from "../shared/dynamodb";

// ─── Public API for Indian agricultural commodity prices ─────────────────────
// Primary: data.gov.in API (free, requires API key)
// Fallback: Agmarknet web scraping

const DATA_GOV_API_KEY = process.env.DATA_GOV_IN_API_KEY || "";
const DATA_GOV_MANDI_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

// Crops and states we track
const TRACKED_CROPS = [
  "Rice", "Wheat", "Cotton", "Soyabean", "Maize",
  "Sugarcane", "Potato", "Onion", "Tomato", "Groundnut",
  "Tur (Arhar)", "Chana", "Mustard", "Jowar", "Bajra",
];

const TRACKED_STATES = [
  "Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh",
  "Maharashtra", "Rajasthan", "Gujarat", "Karnataka",
  "Andhra Pradesh", "Telangana", "Tamil Nadu", "West Bengal",
  "Bihar", "Odisha", "Assam", "Kerala",
];

interface DataGovRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  arrival_date: string;
  min_price: string;
  max_price: string;
  modal_price: string;
}

async function fetchFromDataGov(
  commodity: string,
  state: string
): Promise<MandiPrice[]> {
  if (!DATA_GOV_API_KEY) return [];

  const url = new URL(DATA_GOV_MANDI_URL);
  url.searchParams.set("api-key", DATA_GOV_API_KEY);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");
  url.searchParams.set("filters[commodity]", commodity);
  url.searchParams.set("filters[state]", state);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const records: DataGovRecord[] = data.records || [];

    return records.map((r) => ({
      cropState: `${commodity}#${state}`,
      date: formatDate(r.arrival_date),
      crop: commodity,
      state,
      market: `${r.district} - ${r.market}`,
      minPrice: parseInt(r.min_price) || 0,
      maxPrice: parseInt(r.max_price) || 0,
      modalPrice: parseInt(r.modal_price) || 0,
      unit: "₹/quintal",
    }));
  } catch (err) {
    console.error(`[MandiPriceFetcher] data.gov.in error for ${commodity}/${state}:`, err);
    return [];
  }
}

function formatDate(raw: string): string {
  // data.gov.in returns "dd/mm/yyyy" — convert to "yyyy-mm-dd"
  const parts = raw.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

// ─── Lambda Handler (EventBridge scheduled) ─────────────────────────────────

export async function handler() {
  console.log("[MandiPriceFetcher] Starting scheduled fetch...");

  let totalFetched = 0;
  let errors = 0;

  for (const crop of TRACKED_CROPS) {
    for (const state of TRACKED_STATES) {
      try {
        const prices = await fetchFromDataGov(crop, state);
        if (prices.length > 0) {
          await putMandiPrices(prices);
          totalFetched += prices.length;
        }
      } catch (err) {
        errors++;
        console.error(`[MandiPriceFetcher] Error for ${crop}/${state}:`, err);
      }

      // Rate limiting — 100ms between requests
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(
    `[MandiPriceFetcher] Done. Fetched: ${totalFetched}, Errors: ${errors}`
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      fetched: totalFetched,
      errors,
      crops: TRACKED_CROPS.length,
      states: TRACKED_STATES.length,
    }),
  };
}

// GLOBALSELLER — Cross-Border E-Commerce Intelligence Lambda
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { logQuery } from "../shared/dynamodb";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

const MODES = [
  "marketplace",
  "supply_chain",
  "compliance",
  "pricing",
  "logistics",
  "marketing",
  "general",
] as const;

type GSMode = (typeof MODES)[number];

function detectMode(query: string): GSMode {
  const q = query.toLowerCase();
  if (/amazon|flipkart|ebay|etsy|shopify|marketplace|list/.test(q)) return "marketplace";
  if (/supplier|manufacturer|source|supply|procur/.test(q)) return "supply_chain";
  if (/compliance|export|import|customs|duty|gst|iec|dgft|certif/.test(q)) return "compliance";
  if (/price|pricing|margin|cost|compet/.test(q)) return "pricing";
  if (/ship|logistics|freight|courier|warehouse|fulfil/.test(q)) return "logistics";
  if (/market|brand|advertis|seo|social|customer/.test(q)) return "marketing";
  return "general";
}

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const {
    query: userQuery,
    question,
    mode: requestedMode,
    productCategory,
    targetMarkets,
    budget,
    language = "en",
    userId = "anonymous",
  } = body;

  const q = userQuery || question || "";
  if (!q) return err(400, "query is required");

  const mode: GSMode = (requestedMode as GSMode) || detectMode(q);

  try {
    const englishQ =
      language !== "en" ? await translateText(q, "en", language) : q;

    const context = [
      productCategory ? `Product category: ${productCategory}` : "",
      targetMarkets ? `Target markets: ${Array.isArray(targetMarkets) ? targetMarkets.join(", ") : targetMarkets}` : "",
      budget ? `Budget: ${budget}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const ai = await invokeBedrockClaude({
      systemPrompt: `You are GLOBALSELLER, India's AI cross-border e-commerce intelligence engine. You help Indian sellers expand globally.

EXPERTISE AREAS:
1. MARKETPLACE: Amazon Global Selling, eBay, Etsy, Shopify, Amazon.in vs .com/.co.uk
2. SUPPLY CHAIN: Indian supplier directories (IndiaMart, TradeIndia), quality control, MOQ negotiation
3. COMPLIANCE: IEC code (DGFT), GST for exports (0% or refund), FEMA, product-specific certifications (CE, FDA, BIS)
4. PRICING: Landed cost calculation, currency hedging, competitive pricing, margin optimization
5. LOGISTICS: India Post EMS, DHL eCommerce, FedEx, Amazon FBA, bonded warehouse
6. MARKETING: Cross-cultural branding, Amazon SEO, international Google Ads

KEY INDIA EXPORT DATA:
- Top export products: Textiles, Gems & Jewelry, Pharmaceuticals, IT Services, Spices, Handicrafts
- Export incentive schemes: RoDTEP, MEIS, EPC membership benefits
- Foreign Trade Policy 2023 highlights
- Districts as Export Hubs (DEH) initiative

Always cite real platforms, costs, and timelines. Be specific about Indian seller requirements.`,
      userMessage: `${context}\n\nSeller's question (mode: ${mode}): ${englishQ}`,
      temperature: 0.3,
      maxTokens: 1800,
    });

    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    await logQuery({
      userId,
      engine: "globalseller",
      query: { query: q, mode, productCategory },
      response: { tokensUsed: ai.inputTokens + ai.outputTokens },
    });

    return ok({
      engine: "globalseller",
      mode,
      response: responseText,
      metadata: { model: ai.model, tokensUsed: ai.inputTokens + ai.outputTokens, language },
    });
  } catch (error: any) {
    console.error("[GLOBALSELLER] Error:", error);
    return err(500, `GlobalSeller engine error: ${error.message}`);
  }
}

import { callBedrock } from "@/app/lib/bedrock";
import { getDemandSignal, getSupplyRiskSignal, executeConnectorWithFailsafe } from "@/app/lib/connectors";

export async function POST(req: Request) {
  try {
    const { productName, category, cost, originCountry } = await req.json();

    // PHASE 3: Fetch real demand and supply risk signals
    // Scoring key markets: US, UK, Germany, India (new!)
    const keyMarkets = ["US", "UK", "DE", "IN", "JP"];
    let demandSignals: Record<string, any> = {};
    let supplySignals: Record<string, any> = {};

    for (const market of keyMarkets) {
      // Demand signal
      const demand = await executeConnectorWithFailsafe(
        "demandConnector",
        () => getDemandSignal(market),
        null
      );
      if (demand) {
        demandSignals[market] = demand;
      }

      // Supply risk signal
      const supplyRisk = await executeConnectorWithFailsafe(
        "supplyRiskConnector",
        () => getSupplyRiskSignal(originCountry),
        null
      );
      if (supplyRisk) {
        supplySignals[market] = supplyRisk;
      }
    }

    // Build signal context for Bedrock
    let signalContext = "";
    let signalSummary = demandSignals[Object.keys(demandSignals)[0]]?.signalConfidence || 0;

    if (Object.keys(demandSignals).length > 0 || Object.keys(supplySignals).length > 0) {
      signalContext = `
REAL MARKET SIGNALS (Live Data Integration):`;

      for (const market of keyMarkets) {
        if (demandSignals[market]) {
          const d = demandSignals[market];
          signalContext += `
[${market}] Demand Context:
  - Seasonal Index: ${d.seasonalDemandIndex}
  - Festival Boost: ${d.currentFestival || "None"} (${d.festivalBoost}x multiplier)
  - Search Trend: ${d.searchTrendIndex}
  - Regional Purchasing Power: ${d.regionalPurchasingPower}
  - Confidence: ${d.signalConfidence}%`;
        }
      }

      if (supplySignals[Object.keys(supplySignals)[0]]) {
        const s = supplySignals[Object.keys(supplySignals)[0]];
        signalContext += `

[SUPPLY] From Origin (${originCountry}):
  - Risk Level: ${s.riskLevel}
  - Key Threats: ${s.specificThreats?.slice(0, 2).join(", ") || "None detected"}
  - Action Window: ${s.recommendedActionWindow}
  - Confidence: ${s.signalConfidence}%`;
      }

      signalContext += `

Use these real-time signals to refine market opportunity scores. Current conditions matter.`;
    } else {
      signalContext = `
NOTE: Real market signals unavailable. Proceeding with market analysis based on historical patterns.`;
    }

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller has provided these product details:
- Product: ${productName}
- Category: ${category}
- Product Cost: $${cost}
- Origin Country: ${originCountry}

${signalContext}

TASK: Score this product's market opportunity across ALL 8 major Amazon marketplaces (0-100 opportunity score each).

MARKETPLACES TO SCORE:
1. Amazon US
2. Amazon UK
3. Amazon Germany (DE)
4. Amazon France (FR)
5. Amazon Italy (IT)
6. Amazon Japan (JP)
7. Amazon Canada (CA)
8. Amazon Australia (AU)

For EACH marketplace, provide:
- Opportunity Score (0-100)
- WHY this score (demand, competition, cultural fit, shipping costs, tariffs, current signals)
- Estimated Monthly Sales Potential
- Pricing Recommendation Range

Then:
- Recommend the TOP 3 markets
- Generate a detailed 90-day go-to-market plan for the TOP market
- Include: listing language, cultural notes, expected timeline to profitability
- Suggest pricing strategy per market
- Account for current demand/supply signals in your timeline

Return structured analysis with numbers, not generic advice.
Be tactical and consultant-level, like you've helped 1000 sellers.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 2000 });
    return Response.json({ 
      marketAnalysis: result,
      signalStatus: signalContext ? "[ ✓ SIGNALS INJECTED ]" : "[ ⚠ SIGNALS UNAVAILABLE ]",
      signalConfidence: signalSummary
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to analyze markets" }, { status: 500 });
  }
}

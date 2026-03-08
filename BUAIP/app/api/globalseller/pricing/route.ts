import { callBedrock } from "@/app/lib/bedrock";
import { getPricingSignal, executeConnectorWithFailsafe } from "@/app/lib/connectors";

export async function POST(req: Request) {
  try {
    const { product, cost, targetMarket, asin } = await req.json();

    // PHASE 3: Fetch real pricing signal
    let pricingSignal = null;
    let signalNote = "";
    
    if (asin) {
      pricingSignal = await executeConnectorWithFailsafe(
        "pricingConnector",
        () => getPricingSignal(asin, targetMarket),
        null
      );
    }

    // Build signal context for Bedrock
    let signalContext = "";
    if (pricingSignal && pricingSignal.signalConfidence > 0) {
      signalContext = `
REAL MARKET SIGNAL (Live Data - Confidence: ${pricingSignal.signalConfidence}%):
- Current Market Price: $${pricingSignal.currentPrice}
- 30-Day Average: $${pricingSignal.avg30DayPrice}
- 180-Day Average: $${pricingSignal.avg180DayPrice}
- Price Volatility: ${pricingSignal.priceVolatility}% (${pricingSignal.detectedPattern})
- Marketplace: ${pricingSignal.marketplace}
- Last Updated: ${pricingSignal.lastUpdated}

Use this data to inform your pricing strategy. Current market reality should guide your recommendations.`;
      signalNote = " [ ✓ LIVE PRICING DATA INJECTED ]";
    } else {
      signalContext = `
NOTE: Real pricing data unavailable. Providing strategy based on market analysis and competitor research.`;
      signalNote = " [ ⚠ DERIVED FROM MARKET ANALYSIS ]";
    }

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller has provided:
- Product: ${product}
- Cost to Produce: $${cost}
- Target Marketplace: Amazon ${targetMarket}
${asin ? `- ASIN: ${asin}` : ""}

${signalContext}

TASK: Provide complete pricing intelligence and strategy.

ANALYSIS:

1. COMPETITIVE LANDSCAPE:
   - Typical competitor price range for similar products: $X - $Y
   - Price distribution: Budget tier, mid-range, premium
   - Which competitors are winning at which price points?
   - Pricing strategies you're seeing: undercutting, value-add, premium positioning

2. RECOMMENDED PRICE:
   - Best launch price (specific number): $Z
   - Why this price? (margin, positioning, market capacity, competitor gaps)
   - Profit margin at this price
   - Break-even point

3. PRICING LOGIC:
   - Cost breakdown you should consider
   - Add cost of Amazon fees (commission, FBA, etc.)
   - Currency considerations for ${targetMarket}
   - Psychological pricing (why $Z.99 vs $Z.00)

4. SEASONAL PRICING CALENDAR (12-month strategy):
   - Jan-Mar: Price recommendation
   - Apr-Jun: Price recommendation
   - Jul-Sep: Price recommendation
   - Oct-Dec: Price recommendation
   - Reasoning for each: seasonal demand patterns, competitor behavior, holidays

5. COMPETITOR PRICING TACTICS TO WATCH:
   - How do competitors manipulate prices?
   - Price wars in this category?
   - Flash sale patterns?
   - Bundle tactics?
   - Early warnings: signs competitor is about to drop price

6. REPRICING STRATEGY:
   - How often should you reprice?
   - Rules to follow when competitors drop price
   - When to hold steady vs adjust
   - When to go premium vs discount

Provide SPECIFIC numbers, not ranges.
Be tactical like a pricing consultant.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 1800 });
    return Response.json({ 
      pricingStrategy: result,
      signalStatus: signalNote,
      signalConfidence: pricingSignal?.signalConfidence || 0 
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to analyze pricing" }, { status: 500 });
  }
}

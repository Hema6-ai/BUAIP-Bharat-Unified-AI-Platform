import { callBedrock } from "@/app/lib/bedrock";
import { getDemandSignal, executeConnectorWithFailsafe } from "@/app/lib/connectors";

export async function POST(req: Request) {
  try {
    const { productCategory, targetMarket, budget } = await req.json();

    // PHASE 3: Fetch real demand signal for festival/seasonal timing
    const demandSignal = await executeConnectorWithFailsafe(
      "demandConnector",
      () => getDemandSignal(targetMarket),
      null
    );

    let festivalContext = "";
    if (demandSignal && demandSignal.signalConfidence > 0) {
      festivalContext = `
FESTIVAL-AWARE TIMING (Real Seasonal Data):
- Current Festival: ${demandSignal.currentFestival || "None"}
- Festival Boost: ${demandSignal.festivalBoost}x multiplier
- Days Until Next Peak: ${demandSignal.daysUntilNextFestival}
- Seasonal Demand Index: ${demandSignal.seasonalDemandIndex}
- Regional Purchasing Power: ${demandSignal.regionalPurchasingPower}
- Data Confidence: ${demandSignal.signalConfidence}%

TIMING RECOMMENDATION: Consider launching ${
        demandSignal.festivalBoost > 2.0 
          ? "BEFORE this festival window (now - " + Math.min(21, demandSignal.daysUntilNextFestival) + " days)"
          : "after this festival spike for sustainable growth"
      } to align with buyer behavior.`;
    } else {
      festivalContext = `NOTE: Festival/seasonal data unavailable. Using historical patterns for timing.`;
    }

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller is launching a new product:
- Product Category: ${productCategory}
- Target Marketplace: Amazon ${targetMarket}
- Marketing Budget: $${budget}

${festivalContext}

TASK: Generate a data-backed week-by-week launch playbook based on patterns from 500+ successful launches.

WEEK-BY-WEEK LAUNCH PLAN (Week -4 to Month 3):

WEEK -4 (Preparation):
- Actions: [specific steps]
- Keyword phases to prepare: [list]
- Budget allocation: [how much of the ${budget} to spend this week, or 0]
- Expected output: [what you should have ready]

WEEK -3 (Optimization):
- [repeat above format]

WEEK -2 (Final Setup):
- [repeat above format]

WEEK -1 (Launch Eve):
- [repeat above format]

WEEK 1 (Launch Week):
- [repeat above format with specific actions]
- Ad spend recommend: [specific $amount from your ${budget}]
- Expected daily orders: [realistic target]
- Expected rank: [typical rank in this category for new products]

WEEK 2-4:
- Keyword phases to prioritize: [which keywords should dominate your ads]
- Ad budget allocation: [$X per week]
- Review velocity targets: [X reviews/day minimum to stay competitive]
- Expected rank progression: [how rank should improve]
- Conversion rate: [typical CVR% for new products in this category]

MONTH 2-3:
- Shift strategy: [change in keywords, messaging, budget allocation]
- Review velocity: [should still target X reviews/day]
- Seasonality impact: [special considerations for these months based on real data]
- Expected revenue: [$X per month range]
- Rank expectations: [where you should be ranked by end of week 8-12]

2. KEYWORD PHASES:
   - Phase 1 (Week 1-2): Broad/branded keywords to build reviews fast
   - Phase 2 (Week 3-4): Long-tail keywords for conversion
   - Phase 3 (Week 5-8): High-intent keywords for profitability
   - Phase 4 (Week 9-12): Expand successful keywords, test new categories

3. AD SPEND ALLOCATION:
   - Total budget you're working with: $${budget}
   - Week 1-2: $X (X% of budget) - Build reviews + visibility
   - Week 3-4: $X - Optimize conversions
   - Week 5-8: $X - Scaling profitable keywords
   - Week 9-12: $X - Sustained profitability
   - Reserve buffer: $X for unexpected opportunities

4. REVIEW VELOCITY TARGETS (per day):
   - Week 1: X reviews/day (aggressive)
   - Week 2: X reviews/day (decline expected)
   - Week 3-4: X reviews/day (stabilize)
   - Week 5+: X reviews/day (sustainable)

5. EXPECTED RANK PROGRESSION:
   - Week 1: Rank #500-1000 (just launched, low visibility)
   - Week 2: Rank #300-500 (reviews kick in)
   - Week 3: Rank #100-300 (momentum building)
   - Week 4: Rank #50-100 (strong showing)
   - Week 8: Rank #10-30 (competitive position)
   - Week 12: Rank #5-15 (established winner)

6. FAILURE SIGNALS (watch for these):
   - If conversions drop below X%, you have a problem
   - If reviews stall below X per day, adjust keyword strategy
   - If rank doesn't improve to #500 by week 2, price is likely too high
   - If ACOS exceeds X%, scale back ad spend immediately
   - If returns exceed X%, product quality issue likely

7. PIVOT STRATEGIES (if launch underperforms):
   - Pivot A: Price reduction strategy (drop to $Y)
   - Pivot B: Keyword shift (abandon these keywords, pursue these instead)
   - Pivot C: Positioning change (change main image/title to appeal to different audience)
   - Pivot D: Bundle strategy (bundle with complementary product)
   - Pivot E: Go/No-go decision point: If not #200 by week 4, consider discontinuing

8. CASE STUDY COMPARISON:
   - Similar successful launches in ${targetMarket} averaged X units in month 1
   - Top 10% performers hit X units
   - Bottom performers hit X units
   - Your budget of $${budget} should aim for [realistic target based on category]

Provide SPECIFIC numbers tied to category and market.
Not generic timelines.
This is your playbook to execute against.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 2500 });
    return Response.json({ 
      launchPlaybook: result,
      signalStatus: demandSignal ? "[ ✓ FESTIVAL-AWARE ]" : "[ ⚠ SEASONAL ESTIMATE ]",
      signalConfidence: demandSignal?.signalConfidence || 0
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to generate launch plan" }, { status: 500 });
  }
}

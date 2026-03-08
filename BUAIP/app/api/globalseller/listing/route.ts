import { callBedrock } from "@/app/lib/bedrock";

export async function POST(req: Request) {
  try {
    const { originalListing, targetMarketplace } = await req.json();

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller has provided:
- Original Listing (English):
${originalListing}

- Target Marketplace: Amazon ${targetMarketplace}

TASK: CULTURALLY TRANSFORM the listing for the target marketplace.

This is NOT just translation. You must:

1. BUYER PSYCHOLOGY ANALYSIS for ${targetMarketplace}:
   - How do buyers in this market search and buy?
   - What information do they want first? (Japanese want specs, Germans want precision, Brazilians want social proof)
   - What motivates purchase decisions in this culture?
   - Price sensitivity level?

2. REWRITE THE LISTING:

   A) TITLE:
   - Current: [extract from original]
   - Optimized for ${targetMarketplace}: [new title with local keywords and appeals]
   - Reasoning: [why this works for this market]

   B) FEATURE BULLETS (top 5):
   - Current: [extract top bullets]
   - Reordered/rewritten for ${targetMarketplace}:
     • [Bullet 1 - most important for this market]
     • [Bullet 2]
     • [Bullet 3]
     • [Bullet 4]
     • [Bullet 5]
   - Reasoning for each change

   C) PRODUCT DESCRIPTION:
   - Current: [summarize original]
   - Rewritten for ${targetMarketplace}: [completely rewritten to appeal to local buyer psychology]
   - Tone shift: [how tone differs from English version]

3. KEYWORD STRATEGY for ${targetMarketplace}:
   - Top 10 keywords in local language/search behavior
   - Search volume relative to competition
   - Where to place in listing
   - Long-tail keywords specific to this market

Provide specific, actionable, market-proven recommendations.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 2000 });
    return Response.json({ listingOptimization: result });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to optimize listing" }, { status: 500 });
  }
}

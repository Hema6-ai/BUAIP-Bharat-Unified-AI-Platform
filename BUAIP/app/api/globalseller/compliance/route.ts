import { callBedrock } from "@/app/lib/bedrock";
import { getComplianceSignal, executeConnectorWithFailsafe } from "@/app/lib/connectors";

export async function POST(req: Request) {
  try {
    const { productType, materials, targetMarkets } = await req.json();

    const marketsStr = Array.isArray(targetMarkets) ? targetMarkets.join(', ') : targetMarkets;
    
    // PHASE 3: Fetch real compliance signals for each target market
    let complianceSignals: Record<string, any> = {};
    const markets = Array.isArray(targetMarkets) ? targetMarkets : [targetMarkets];

    for (const market of markets) {
      const signal = await executeConnectorWithFailsafe(
        "complianceKnowledge",
        () => getComplianceSignal(market, productType),
        null
      );
      if (signal) {
        complianceSignals[market] = signal;
      }
    }

    let complianceContext = "";
    if (Object.keys(complianceSignals).length > 0) {
      complianceContext = `
REAL COMPLIANCE DATABASE (Knowledge Base Integration):`;

      for (const [market, signal] of Object.entries(complianceSignals)) {
        const certs = (signal as any).requiredCertifications || [];
        complianceContext += `

[${market}] Compliance Requirements:
  - Certifications Needed: ${certs.length > 0 ? certs.map((c: any) => c.certificationName).join(", ") : "To be verified"}
  - Estimated Total Cost: $${(signal as any).estimatedTotalCost || "0"}
  - Estimated Timeline: ${(signal as any).estimatedTotalTime || "0"} weeks
  - Restricted Materials: ${(signal as any).restrictedMaterials?.join(", ") || "None detected"}
  - Documentation Required: ${(signal as any).documentation?.slice(0, 3).join(", ") || "Standard docs"}
  - Data Confidence: ${(signal as any).signalConfidence || "0"}%`;
      }
    } else {
      complianceContext = `NOTE: Compliance database unavailable. Using consultant knowledge base.`;
    }

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller has provided:
- Product Type: ${productType}
- Materials/Content: ${materials}
- Target Marketplaces: ${marketsStr}

${complianceContext}

TASK: Map ALL compliance requirements per marketplace and create a compliance roadmap.

For EACH marketplace (${marketsStr}), list:

1. EXACT CERTIFICATIONS NEEDED:
   - Certification name (e.g., CE Mark, FCC, REACH, CPSC, etc.)
   - Which certification bodies issue it
   - What exactly does it certify
   - Cost estimate (in USD)
   - Timeline to obtain (weeks)
   - Can you get it online, or must you visit physically?

2. RESTRICTED/FLAGGED MATERIALS:
   - Are any of these materials restricted in this marketplace?
   - Which materials need special documentation?
   - Lead, phthalates, formaldehyde, etc. regulations (check real data)

3. DOCUMENTATION CHECKLIST:
   - What documents must you submit with your product?
   - Import declarations needed?
   - Material safety data sheets (MSDS)?
   - Test reports?
   - Compliance certificates?

4. PRIORITY:
   - What must be done BEFORE launch?
   - What can be done AFTER launch (within 60 days)?
   - What is optional but recommended?

Then provide:
- OVERALL ROADMAP with timeline (weeks to full compliance)
- Total estimated cost across all certifications
- Which marketplace has easiest/hardest compliance
- Quick wins (easy certifications to get fast)
- Account for actual compliance complexity (not generic)

Be VERY SPECIFIC with names, costs, timelines.
Not generic "you need certifications" advice.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 2200 });
    return Response.json({ 
      complianceRoadmap: result,
      signalStatus: Object.keys(complianceSignals).length > 0 ? "[ ✓ KNOWLEDGE BASE ACTIVE ]" : "[ ⚠ STANDARD KB ]",
      signalCount: Object.keys(complianceSignals).length
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to analyze compliance" }, { status: 500 });
  }
}

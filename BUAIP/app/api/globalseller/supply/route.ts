import { callBedrock } from "@/app/lib/bedrock";
import { getSupplyRiskSignal, executeConnectorWithFailsafe } from "@/app/lib/connectors";

export async function POST(req: Request) {
  try {
    const { manufacturerLocation, currentInventory, dailySales } = await req.json();

    // PHASE 3: Fetch real supply risk signal
    const supplyRisk = await executeConnectorWithFailsafe(
      "supplyRiskConnector",
      () => getSupplyRiskSignal(manufacturerLocation),
      null
    );

    let riskContext = "";
    if (supplyRisk && supplyRisk.signalConfidence > 0) {
      riskContext = `
REAL SUPPLY RISK SIGNAL (Live Data):
- Risk Level: ${supplyRisk.riskLevel}
- Current Disruption Types: ${supplyRisk.disruptionTypes.join(", ")}
- Specific Threats: ${supplyRisk.specificThreats.join(", ")}
- Action Window: ${supplyRisk.recommendedActionWindow}
- Recent Incidents: ${supplyRisk.historicalIncidents} in last 12 months
- Data Confidence: ${supplyRisk.signalConfidence}%

ALERT: Monitor these threats closely over the next ${supplyRisk.recommendedActionWindow}.`;
    } else {
      riskContext = `NOTE: Real supply risk data unavailable. Use standard risk mitigation playbook.`;
    }

    const prompt = `You are GlobalSeller AI — a world-class Amazon global selling strategist with expertise across 7 domains.

A seller has provided these supply chain details:
- Manufacturer Location: ${manufacturerLocation}
- Current Inventory: ${currentInventory} units
- Daily Sales: ${dailySales} units

${riskContext}

TASK: Assess their supply chain risk and provide a contingency plan.

ANALYZE:
1. Inventory Runway Calculation:
   - Calculate runway in days: ${currentInventory} ÷ ${dailySales} = X days
   - Is this healthy, at-risk, or critical?
   - Recommend safety stock buffer based on real geographic risks

2. Geographic Risk Assessment for ${manufacturerLocation}:
   - What are the main supply chain risks in this region? (natural disasters, strikes, political instability, quality issues)
   - Historical disruptions?
   - Vulnerability window?
   - Current threat landscape (from real data)

3. Alternative Supplier Regions (provide 3 specific alternatives):
   - For each: Region, typical costs, lead times, quality reputation, risk profile
   - Tradeoffs vs current supplier
   - Prioritize regions with lower current risk exposure

4. Contingency Plan:
   - Exact trigger points: "If X happens, do Y within Z days"
   - How many days of inventory cushion needed? (account for ${manufacturerLocation} risks)
   - Which regions to onboard now vs as backup?
   - Communication protocol with backup suppliers

Provide specific numbers, timelines, and actionable steps.
Not generic advice.

End with: "Which of the 7 modules do you want to go deeper on?"`;

    const result = await callBedrock(prompt, { maxTokens: 1800 });
    return Response.json({ 
      supplyChainAnalysis: result,
      signalStatus: supplyRisk ? "[ ✓ RISK SIGNAL ACTIVE ]" : "[ ⚠ RISK ESTIMATE ]",
      signalConfidence: supplyRisk?.signalConfidence || 0,
      riskLevel: supplyRisk?.riskLevel || "Unknown"
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: "Failed to analyze supply chain" }, { status: 500 });
  }
}

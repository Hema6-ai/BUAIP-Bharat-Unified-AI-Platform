import { NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";
import { getGovernanceInsights } from "@/app/lib/policyEngine";

let cachedExplanation: { value: string; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedExplanation && cachedExplanation.expiresAt > now) {
      return NextResponse.json({ explanation: cachedExplanation.value });
    }

    const insights = getGovernanceInsights();

    const prompt = `You are a public policy analyst AI assisting government officers.

Based on the analytics below, explain:

1. What problems are emerging
2. Which districts need attention first
3. What operational actions should be taken
4. Any risks if ignored

Keep explanation concise and decision-oriented.

DATA:
${JSON.stringify(insights)}`;

    const explanation = await callBedrock(prompt);

    cachedExplanation = {
      value: explanation,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Failed to generate governance explanation:", error);
    return NextResponse.json(
      { error: "Failed to generate governance explanation" },
      { status: 500 }
    );
  }
}

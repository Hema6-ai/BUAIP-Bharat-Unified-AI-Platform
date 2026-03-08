import { NextResponse } from "next/server";
import { getGovernanceInsights } from "@/app/lib/policyEngine";

export async function GET() {
  try {
    const analysis = getGovernanceInsights();
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Policy analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze policy landscape" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";
import { buildCacheKey, getCache, setCache } from "@/app/lib/cache";

type Language = "English" | "Hindi" | "Telugu" | "Tamil";

interface GovernanceAIRequest {
  analyticsSummary: string;
  language?: Language;
  districtData?: any;
  schemeData?: any;
}

interface GovernanceInsight {
  underservedSegment: string;
  districtRiskAlerts: Array<{
    district: string;
    risk: string;
    severity: "Low" | "Medium" | "High";
  }>;
  policyGap: string;
  reformRecommendations: string[];
  riskSeverityLevel: "Low" | "Medium" | "High";
  confidence: number;
  timestamp: string;
  language: string;
}

const LANGUAGE_PROMPTS: Record<Language, string> = {
  English: "Respond in English with professional governance terminology.",
  Hindi: "सभी उत्तर हिंदी में दें। शासन से संबंधित पेशेवर शब्दावली का उपयोग करें।",
  Telugu: "తెలుగులో సమాధానం ఇవ్వండి. పాలనకు సంబంధించిన వృత్తిపరమైన పదజాలాన్ని ఉపయోగించండి.",
  Tamil: "தமிழில் பதிலளிக்கவும். ஆளுகைக்கு தொடர்புடைய தொழில்முறை சொற்களைப் பயன்படுத்தவும்.",
};
const GOVERNANCE_AI_TTL_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body: GovernanceAIRequest = await request.json();
    const { analyticsSummary, language = "English", districtData, schemeData } = body;

    const cacheKey = buildCacheKey("governance-ai", {
      analyticsSummary,
      language,
      districtData,
      schemeData,
    });

    const cached = getCache<GovernanceInsight>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (!analyticsSummary) {
      return NextResponse.json(
        { error: "analyticsSummary is required" },
        { status: 400 }
      );
    }

    // Build comprehensive governance intelligence prompt
    const prompt = buildGovernancePrompt(
      analyticsSummary,
      language,
      districtData,
      schemeData
    );

    // Call Bedrock Claude
    const startTime = Date.now();
    const bedrockResponse = await callBedrock(prompt);
    const inferenceTime = Date.now() - startTime;

    // Parse AI response
    const insight = parseGovernanceResponse(
      bedrockResponse,
      language,
      inferenceTime
    );

    setCache(cacheKey, insight, GOVERNANCE_AI_TTL_MS);

    return NextResponse.json(insight);
  } catch (error) {
    console.error("Error in governance AI:", error);

    if (error instanceof Error) {
      if (error.message.includes("AWS") || error.message.includes("Bedrock")) {
        return NextResponse.json(
          {
            error: "AWS Bedrock service error",
            message: error.message,
            hint: "Check AWS credentials and Bedrock access",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate governance insights" },
      { status: 500 }
    );
  }
}

function buildGovernancePrompt(
  analyticsSummary: string,
  language: Language,
  districtData?: any,
  schemeData?: any
): string {
  const langInstruction = LANGUAGE_PROMPTS[language];

  let contextData = "";
  if (districtData) {
    contextData += `\n\nDistrict Performance Data:\n${JSON.stringify(districtData, null, 2)}`;
  }
  if (schemeData) {
    contextData += `\n\nScheme Utilization Data:\n${JSON.stringify(schemeData, null, 2)}`;
  }

  return `You are a National Governance Intelligence Engine for Indian welfare programs.

${langInstruction}

Analyze the following welfare distribution data:

${analyticsSummary}${contextData}

Generate a comprehensive governance intelligence report with these EXACT sections:

1. UNDERSERVED SEGMENT:
Identify the most critical underserved population segment (age group, income bracket, or demographic).

2. DISTRICT RISK ALERTS:
List 3-5 districts with the highest risk. For each district provide:
- District name
- Specific risk (e.g., "Low application rate", "High rejection rate")
- Severity level (Low/Medium/High)

Format as:
DISTRICT: [name]
RISK: [description]
SEVERITY: [Low/Medium/High]

3. POLICY GAP:
Identify the primary policy gap or systemic issue causing underutilization.

4. REFORM RECOMMENDATIONS:
Provide exactly 2 actionable reform recommendations to improve welfare delivery.

Format as:
RECOMMENDATION 1: [specific action]
RECOMMENDATION 2: [specific action]

5. OVERALL RISK SEVERITY:
State the overall system risk level as exactly one of: Low, Medium, or High

Be specific, data-driven, and actionable. Use the language: ${language}.`;
}

function parseGovernanceResponse(
  response: string,
  language: Language,
  inferenceTime: number
): GovernanceInsight {
  const lines = response.split("\n").filter((line) => line.trim().length > 0);

  // Extract underserved segment
  let underservedSegment = "Not identified";
  const underservedIndex = lines.findIndex((line) =>
    line.toUpperCase().includes("UNDERSERVED SEGMENT")
  );
  if (underservedIndex !== -1 && lines[underservedIndex + 1]) {
    underservedSegment = lines[underservedIndex + 1].trim();
  }

  // Extract district risk alerts
  const districtRiskAlerts: Array<{
    district: string;
    risk: string;
    severity: "Low" | "Medium" | "High";
  }> = [];

  const districtStartIndex = lines.findIndex((line) =>
    line.toUpperCase().includes("DISTRICT RISK")
  );

  if (districtStartIndex !== -1) {
    let currentDistrict: any = {};

    for (let i = districtStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (upperLine.includes("POLICY GAP") || upperLine.includes("REFORM")) {
        break;
      }

      if (upperLine.startsWith("DISTRICT:")) {
        if (currentDistrict.district) {
          districtRiskAlerts.push(currentDistrict);
        }
        currentDistrict = {
          district: line.replace(/DISTRICT:/i, "").trim(),
          risk: "",
          severity: "Medium" as const,
        };
      } else if (upperLine.startsWith("RISK:")) {
        currentDistrict.risk = line.replace(/RISK:/i, "").trim();
      } else if (upperLine.startsWith("SEVERITY:")) {
        const severity = line.replace(/SEVERITY:/i, "").trim();
        currentDistrict.severity = (["Low", "Medium", "High"].includes(severity)
          ? severity
          : "Medium") as "Low" | "Medium" | "High";
      }
    }

    if (currentDistrict.district) {
      districtRiskAlerts.push(currentDistrict);
    }
  }

  // Extract policy gap
  let policyGap = "Not identified";
  const policyIndex = lines.findIndex((line) =>
    line.toUpperCase().includes("POLICY GAP")
  );
  if (policyIndex !== -1 && lines[policyIndex + 1]) {
    policyGap = lines[policyIndex + 1].trim();
  }

  // Extract reform recommendations
  const reformRecommendations: string[] = [];
  const reformIndex = lines.findIndex((line) =>
    line.toUpperCase().includes("REFORM RECOMMENDATION")
  );

  if (reformIndex !== -1) {
    for (let i = reformIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      if (
        upperLine.includes("OVERALL RISK") ||
        upperLine.includes("SEVERITY")
      ) {
        break;
      }

      if (
        upperLine.startsWith("RECOMMENDATION") ||
        line.match(/^\d+[\.\):]/)
      ) {
        const recommendation = line
          .replace(/RECOMMENDATION \d+:/i, "")
          .replace(/^\d+[\.\):]/, "")
          .trim();
        if (recommendation.length > 0) {
          reformRecommendations.push(recommendation);
        }
      }
    }
  }

  // Extract overall risk severity
  let riskSeverityLevel: "Low" | "Medium" | "High" = "Medium";
  const severityIndex = lines.findIndex(
    (line) =>
      line.toUpperCase().includes("OVERALL RISK") ||
      line.toUpperCase().includes("OVERALL SEVERITY")
  );

  if (severityIndex !== -1) {
    const severityLine = lines
      .slice(severityIndex, severityIndex + 2)
      .join(" ")
      .toUpperCase();

    if (severityLine.includes("HIGH")) {
      riskSeverityLevel = "High";
    } else if (severityLine.includes("LOW")) {
      riskSeverityLevel = "Low";
    } else {
      riskSeverityLevel = "Medium";
    }
  }

  // Calculate confidence score (0-100) based on response quality
  let confidence = 50;
  if (underservedSegment !== "Not identified") confidence += 15;
  if (districtRiskAlerts.length > 0) confidence += 15;
  if (policyGap !== "Not identified") confidence += 10;
  if (reformRecommendations.length >= 2) confidence += 10;
  confidence = Math.min(confidence, 100);

  return {
    underservedSegment,
    districtRiskAlerts,
    policyGap,
    reformRecommendations,
    riskSeverityLevel,
    confidence,
    timestamp: new Date().toISOString(),
    language,
  };
}

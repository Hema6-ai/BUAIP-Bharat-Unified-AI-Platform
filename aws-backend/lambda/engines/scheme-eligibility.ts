// SCHEME ELIGIBILITY — Government Scheme Matching Lambda
// Real scheme DB in DynamoDB + Bedrock AI for intelligent matching
import { APIGatewayProxyEvent } from "aws-lambda";
import { invokeBedrockClaude } from "../shared/bedrock";
import { getSchemesByDomain, logQuery } from "../shared/dynamodb";
import { translateText } from "../shared/polly-translate";
import { ok, err, parseBody } from "../shared/response";

// ─── Citizen Profile ────────────────────────────────────────────────────────

interface CitizenProfile {
  age: number;
  gender: string;
  state: string;
  district?: string;
  areaType: "urban" | "rural";
  annualIncome: number;
  isBPL: boolean;
  category: "General" | "OBC" | "SC" | "ST";
  education: string;
  occupation: string;
  landOwnership?: string;
  isDisabled?: boolean;
  isWidow?: boolean;
  isSingleParent?: boolean;
  isVeteran?: boolean;
  isArtisan?: boolean;
  isBusinessOwner?: boolean;
  businessStage?: string;
}

const ALL_DOMAINS = [
  "agriculture",
  "education",
  "health",
  "employment",
  "women_child",
  "social_welfare",
  "business",
];

// ─── Rule-based pre-filter ──────────────────────────────────────────────────

function passesEligibility(
  scheme: any,
  profile: CitizenProfile
): { pass: boolean; reason?: string } {
  const elig = scheme.eligibility || {};

  if (elig.maxAge && profile.age > elig.maxAge)
    return { pass: false, reason: `Age > ${elig.maxAge}` };
  if (elig.minAge && profile.age < elig.minAge)
    return { pass: false, reason: `Age < ${elig.minAge}` };
  if (elig.gender && elig.gender !== "all" && elig.gender !== profile.gender)
    return { pass: false, reason: `Gender: ${elig.gender} only` };
  if (elig.maxIncome && profile.annualIncome > elig.maxIncome)
    return { pass: false, reason: `Income > ₹${elig.maxIncome}` };
  if (elig.bplOnly && !profile.isBPL)
    return { pass: false, reason: "BPL only" };
  if (
    elig.categories &&
    elig.categories.length &&
    !elig.categories.includes(profile.category)
  )
    return { pass: false, reason: `Category: ${elig.categories.join("/")} only` };
  if (
    scheme.states &&
    scheme.states.length &&
    !scheme.states.includes(profile.state)
  )
    return { pass: false, reason: `State not covered` };

  return { pass: true };
}

// ─── Lambda Handler ─────────────────────────────────────────────────────────

export async function handler(event: APIGatewayProxyEvent) {
  if (event.httpMethod === "OPTIONS") return ok({});

  const body = parseBody(event);
  const { profile, language = "en", userId = "anonymous" } = body;

  if (!profile || !profile.age || !profile.state) {
    return err(400, "profile with age and state is required");
  }

  const citizen: CitizenProfile = {
    age: profile.age,
    gender: profile.gender || "male",
    state: profile.state,
    district: profile.district,
    areaType: profile.areaType || "rural",
    annualIncome: profile.annualIncome || 0,
    isBPL: profile.isBPL || false,
    category: profile.category || "General",
    education: profile.education || "unknown",
    occupation: profile.occupation || "unknown",
    landOwnership: profile.landOwnership,
    isDisabled: profile.isDisabled,
    isWidow: profile.isWidow,
    isSingleParent: profile.isSingleParent,
    isVeteran: profile.isVeteran,
    isArtisan: profile.isArtisan,
    isBusinessOwner: profile.isBusinessOwner,
    businessStage: profile.businessStage,
  };

  try {
    // 1. Fetch all schemes from DynamoDB (across all domains)
    const allSchemes = (
      await Promise.all(ALL_DOMAINS.map((d) => getSchemesByDomain(d)))
    ).flat();

    // 2. Rule-based filtering
    const eligible: { scheme: any; reason?: string }[] = [];
    const nearMiss: { scheme: any; reason: string }[] = [];

    for (const scheme of allSchemes) {
      const check = passesEligibility(scheme, citizen);
      if (check.pass) {
        eligible.push({ scheme });
      } else {
        nearMiss.push({ scheme, reason: check.reason! });
      }
    }

    // 3. AI ranking — use Bedrock to rank and explain top matches
    const topEligible = eligible.slice(0, 15);
    const aiPrompt = `You are a government scheme eligibility expert for India.

CITIZEN PROFILE:
${JSON.stringify(citizen, null, 2)}

ELIGIBLE SCHEMES (${topEligible.length} matches):
${topEligible.map((e, i) => `${i + 1}. ${e.scheme.name}: ${e.scheme.description}\n   Benefits: ${e.scheme.benefits}\n   Documents: ${(e.scheme.documents || []).join(", ")}`).join("\n\n")}

TASK:
1. Rank these schemes by relevance to this citizen (most impactful first)
2. For each scheme, explain WHY they qualify and HOW to apply (2-3 sentences)
3. Mention documents needed
4. Format as numbered list

Be specific and practical. Use simple language a rural citizen can understand.`;

    const ai = await invokeBedrockClaude({
      systemPrompt:
        "You are BUAIP Scheme Advisor. Help Indian citizens discover government schemes they are eligible for. Be accurate, practical, and encouraging.",
      userMessage: aiPrompt,
      temperature: 0.2,
      maxTokens: 2000,
    });

    // 4. Translate if needed
    const responseText =
      language !== "en"
        ? await translateText(ai.text, language, "en")
        : ai.text;

    // 5. Log
    await logQuery({
      userId,
      engine: "scheme-eligibility",
      query: { profile: citizen },
      response: { matchCount: eligible.length },
    });

    return ok({
      engine: "scheme-eligibility",
      totalSchemes: allSchemes.length,
      eligibleCount: eligible.length,
      eligibleSchemes: topEligible.map((e) => ({
        name: e.scheme.name,
        domain: e.scheme.domain,
        benefits: e.scheme.benefits,
        documents: e.scheme.documents,
        applicationUrl: e.scheme.applicationUrl,
      })),
      nearMissSchemes: nearMiss.slice(0, 5).map((e) => ({
        name: e.scheme.name,
        reason: e.reason,
      })),
      aiAnalysis: responseText,
      metadata: {
        model: ai.model,
        tokensUsed: ai.inputTokens + ai.outputTokens,
        language,
      },
    });
  } catch (error: any) {
    console.error("[SCHEME] Error:", error);
    return err(500, `Scheme eligibility error: ${error.message}`);
  }
}

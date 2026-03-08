/**
 * Amazon Kendra RAG Service
 * Retrieves government scheme documents using real AWS credentials
 * Credentials loaded from .env.local
 */

import { KendraClient, QueryCommand } from "@aws-sdk/client-kendra";

// Initialize Kendra client with explicit credentials from .env.local
const client = new KendraClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface SchemeDocument {
  title: string;
  content: string;
  metadata: {
    ministry?: string;
    state?: string;
    income_limit?: string;
    eligibility?: string;
    apply_link?: string;
    helpline?: string;
  };
  relevanceScore: number;
}

export async function retrieveSchemes(
  searchQuery: string,
  sessionId: string
): Promise<SchemeDocument[]> {
  const indexId = process.env.KENDRA_INDEX_ID || "buaip-schemes-index";

  const command = new QueryCommand({
    IndexId: indexId,
    QueryText: searchQuery,
    PageSize: 30,
  });

  try {
    const response = await client.send(command);

    console.log(
      `[Kendra] Retrieved ${response.ResultItems?.length || 0} documents`
    );

    if (!response.ResultItems || response.ResultItems.length === 0) {
      console.log("[Kendra] No matching schemes found for query:", searchQuery);
      return [];
    }

    const schemes: SchemeDocument[] = response.ResultItems.map((item: any) => ({
      title: item.DocumentTitle || "Unknown Scheme",
      content: item.DocumentExcerpt || "",
      metadata: {
        ministry: item.DocumentAttributes?.Ministry?.[0] || "",
        state: item.DocumentAttributes?.State?.[0] || "All India",
        income_limit: item.DocumentAttributes?.IncomeLimitAnnual?.[0] || "",
        eligibility: item.DocumentAttributes?.Eligibility?.[0] || "",
        apply_link: item.DocumentAttributes?.ApplyLink?.[0] || "",
        helpline: item.DocumentAttributes?.Helpline?.[0] || "",
      },
      relevanceScore: item.ScoreAttributes?.ScoreConfidence || 0,
    }));

    return schemes;
  } catch (error) {
    console.error("[Kendra] Error retrieving schemes:", error);
    // Return empty array instead of throwing - fallback behavior
    return [];
  }
}

export function buildKendraQuery(userProfile: {
  state?: string;
  annual_income?: number;
  social_category?: string;
  disability?: boolean;
  occupation?: string;
  gender?: string;
  age_group?: string;
}): string {
  const queryParts: string[] = ["government schemes eligibility India"];

  if (userProfile.state) {
    queryParts.push(`state: ${userProfile.state}`);
  }

  if (userProfile.annual_income) {
    const incomeLakhs = Math.round(userProfile.annual_income / 100000);
    queryParts.push(`income: ${incomeLakhs} lakhs`);
  }

  if (userProfile.social_category) {
    queryParts.push(`category: ${userProfile.social_category.toUpperCase()}`);
  }

  if (userProfile.disability) {
    queryParts.push("disability: yes");
  }

  if (userProfile.occupation) {
    queryParts.push(`occupation: ${userProfile.occupation}`);
  }

  if (userProfile.gender) {
    queryParts.push(`gender: ${userProfile.gender}`);
  }

  if (userProfile.age_group) {
    queryParts.push(`age: ${userProfile.age_group}`);
  }

  return queryParts.join(" ");
}

export function formatSchemeForDisplay(scheme: SchemeDocument): string {
  return `
**${scheme.title}**
Ministry: ${scheme.metadata.ministry || "N/A"}
State: ${scheme.metadata.state || "All India"}

${scheme.content}

Eligibility: ${scheme.metadata.eligibility || "Check official portal"}
Income Limit: ${scheme.metadata.income_limit || "Varies"}
Apply: ${scheme.metadata.apply_link || "N/A"}
Helpline: ${scheme.metadata.helpline || "N/A"}

Relevance Score: ${(scheme.relevanceScore * 100).toFixed(1)}%
  `.trim();
}

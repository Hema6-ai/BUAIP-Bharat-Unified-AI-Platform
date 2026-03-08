// Scheme Data Seeder — One-time + periodic Lambda
// Reads government scheme CSV from S3 and populates DynamoDB
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { putScheme, SchemeRecord } from "../shared/dynamodb";

const REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET = process.env.DATA_BUCKET || "buaip-data";
const SCHEMES_KEY = process.env.SCHEMES_S3_KEY || "datasets/india_schemes_7domains.csv";

const s3 = new S3Client({ region: REGION });

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseEligibility(eligStr: string): Record<string, any> {
  const elig: Record<string, any> = {};
  // Parse common patterns like "Age: 18-40, Income: Below 2.5 lakh, Category: SC/ST/OBC"
  const ageMat = eligStr.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years|yrs)?/i);
  if (ageMat) {
    elig.minAge = parseInt(ageMat[1]);
    elig.maxAge = parseInt(ageMat[2]);
  }
  if (/bpl|below poverty/i.test(eligStr)) elig.bplOnly = true;
  if (/sc\b|st\b|obc/i.test(eligStr)) {
    const cats: string[] = [];
    if (/\bsc\b/i.test(eligStr)) cats.push("SC");
    if (/\bst\b/i.test(eligStr)) cats.push("ST");
    if (/\bobc\b/i.test(eligStr)) cats.push("OBC");
    elig.categories = cats;
  }
  const incomeMat = eligStr.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac)/i);
  if (incomeMat) elig.maxIncome = parseFloat(incomeMat[1]) * 100000;
  if (/women|female|महिला/i.test(eligStr)) elig.gender = "female";
  if (/farmer|kisan|किसान/i.test(eligStr)) elig.occupation = "farmer";

  return elig;
}

export async function handler() {
  console.log("[SchemeSeeder] Starting...");

  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: SCHEMES_KEY })
    );
    const csvText = await obj.Body!.transformToString("utf-8");
    const lines = csvText.split("\n").filter((l: string) => l.trim());

    if (lines.length < 2) {
      return { statusCode: 400, body: "CSV is empty or header-only" };
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    let seeded = 0;

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = fields[idx] || ""));

      const domain = (
        row["domain"] ||
        row["category"] ||
        row["sector"] ||
        "general"
      ).toLowerCase();
      const name = row["scheme_name"] || row["name"] || row["scheme"] || "";
      if (!name) continue;

      const scheme: SchemeRecord = {
        domain,
        schemeId: `${domain}_${i}`,
        name,
        description: row["description"] || row["details"] || "",
        eligibility: parseEligibility(
          row["eligibility"] || row["eligibility_criteria"] || ""
        ),
        benefits: row["benefits"] || row["benefit"] || "",
        applicationUrl: row["url"] || row["link"] || row["application_url"] || "",
        documents: (row["documents"] || row["required_documents"] || "")
          .split(/[;,]/)
          .map((d) => d.trim())
          .filter(Boolean),
        states: (row["states"] || row["applicable_states"] || "")
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        lastUpdated: new Date().toISOString().split("T")[0],
      };

      await putScheme(scheme);
      seeded++;
    }

    console.log(`[SchemeSeeder] Seeded ${seeded} schemes`);
    return { statusCode: 200, body: JSON.stringify({ seeded }) };
  } catch (error: any) {
    console.error("[SchemeSeeder] Error:", error);
    return { statusCode: 500, body: error.message };
  }
}

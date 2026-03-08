import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface Scheme {
  scheme_name: string;
  domain: string;
  ministry: string;
  description: string;
  target_beneficiaries: string;
  eligibility_criteria: string;
  age_limit: string;
  income_limit: string;
  required_documents: string;
  benefits: string;
  application_mode: string;
  official_apply_link: string;
  state_applicability: string;
  timeline: string;
}

function parseCSV(fileContent: string): Scheme[] {
  const lines = fileContent.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",").map((h) => h.trim());

  const schemes: Scheme[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const scheme: Scheme = {
      scheme_name: values[0] || "",
      domain: values[1] || "",
      ministry: values[2] || "",
      description: values[3] || "",
      target_beneficiaries: values[4] || "",
      eligibility_criteria: values[5] || "",
      age_limit: values[6] || "",
      income_limit: values[7] || "",
      required_documents: values[8] || "",
      benefits: values[9] || "",
      application_mode: values[10] || "",
      official_apply_link: values[11] || "",
      state_applicability: values[12] || "",
      timeline: values[13] || "",
    };

    if (scheme.scheme_name.trim()) {
      schemes.push(scheme);
    }
  }

  return schemes;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const csvPath = join(process.cwd(), "public", "india_schemes_7domains.csv");
    const fileContent = readFileSync(csvPath, "utf-8");
    const schemes = parseCSV(fileContent);

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");

    let filteredSchemes = schemes;
    if (category) {
      filteredSchemes = schemes.filter(
        (s) => s.domain.toLowerCase() === category.toLowerCase()
      );
    }

    return NextResponse.json(filteredSchemes);
  } catch (error) {
    console.error("Error reading schemes:", error);
    return NextResponse.json(
      { error: "Failed to load schemes" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getCategoryKey } from "@/app/lib/categoryConfig";

interface CategoryResponse {
  key: string;
  englishName: string;
}

function parseCSV(fileContent: string): CategoryResponse[] {
  const lines = fileContent.split("\n").filter((line) => line.trim());
  const domains = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= 2 && values[1].trim()) {
      domains.add(values[1].trim());
    }
  }

  // Convert to category objects with keys
  return Array.from(domains)
    .sort()
    .map((englishName) => ({
      key: getCategoryKey(englishName),
      englishName,
    }));
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

export async function GET() {
  try {
    const csvPath = join(process.cwd(), "public", "india_schemes_7domains.csv");
    const fileContent = readFileSync(csvPath, "utf-8");
    const categories = parseCSV(fileContent);

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error reading categories:", error);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";
import { buildCacheKey, getCache, setCache } from "@/app/lib/cache";
import {
  isValidLanguage,
  mapOldToNewLanguage,
  NewLanguageType,
  OldLanguageType,
} from "@/app/lib/languageCompat";
import { SUPPORTED_LANGUAGE_OPTIONS } from "@/app/lib/languageConfig";

type SupportedLanguage = OldLanguageType | NewLanguageType;

interface SchemeAIRequest {
  schemeName: string;
  schemeDescription?: string;
  selectedLanguage?: SupportedLanguage;
  selectedState?: string;
  spokenQuestion?: string;
}

interface SchemeExplanation {
  schemeName: string;
  language: NewLanguageType;
  region: string;
  whoCanApply: string;
  documentsRequired: string[];
  howToApply: string;
  offlineMethod: string;
  importantWarnings: string;
  deadlines: string;
  regionAvailability: string;
  confidence: "high" | "medium" | "low";
  timestamp: string;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  ...SUPPORTED_LANGUAGE_OPTIONS.map((item) => item.label as SupportedLanguage),
  ...SUPPORTED_LANGUAGE_OPTIONS.map((item) => item.code as SupportedLanguage),
];
const SCHEME_AI_TTL_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body: SchemeAIRequest = await request.json();
    const {
      schemeName,
      schemeDescription,
      selectedLanguage = "en",
      selectedState = "India",
      spokenQuestion,
    } = body;

    const normalizedLanguage = mapOldToNewLanguage(selectedLanguage);

    const cacheKey = buildCacheKey("scheme-ai", {
      schemeName,
      schemeDescription,
      language: normalizedLanguage,
      region: selectedState,
      question: spokenQuestion,
    });

    const cached = getCache<SchemeExplanation>(cacheKey);
    if (cached) {
      const response = NextResponse.json(cached);
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return response;
    }

    // Validate required fields
    if (!schemeName) {
      return NextResponse.json(
        { error: "schemeName is required" },
        { status: 400 }
      );
    }

    // Validate language
    if (!isValidLanguage(selectedLanguage)) {
      return NextResponse.json(
        { 
          error: `Invalid language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Build comprehensive prompt for Bedrock
    const prompt = buildSchemeExplanationPrompt(
      schemeName,
      schemeDescription,
      normalizedLanguage,
      selectedState,
      spokenQuestion
    );

    // Call Bedrock Claude
    const bedrockResponse = await callBedrock(prompt);

    // Parse and structure the response
    const explanation = parseBedrockResponse(
      bedrockResponse,
      schemeName,
      normalizedLanguage,
      selectedState
    );

    setCache(cacheKey, explanation, SCHEME_AI_TTL_MS);

    const response = NextResponse.json(explanation);
    
    // Add caching headers
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    
    return response;
  } catch (error) {
    console.error("Error in scheme AI:", error);

    // Check if it's an AWS/Bedrock error
    if (error instanceof Error) {
      if (error.message.includes("AWS") || error.message.includes("Bedrock")) {
        return NextResponse.json(
          {
            error: "AWS Bedrock service error",
            message: error.message,
            hint: "Ensure AWS credentials are configured in .env.local",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate scheme explanation" },
      { status: 500 }
    );
  }
}

function buildSchemeExplanationPrompt(
  schemeName: string,
  schemeDescription: string | undefined,
  language: NewLanguageType,
  region: string,
  spokenQuestion?: string
): string {
  // Language-specific instructions for new codes
  const langInstructions: Record<string, string> = {
    en: "Respond in English with clear, citizen-friendly language.",
    te: "తెలుగులో స్పష్టమైన, సరళమైన భాషలో సమాధానం ఇవ్వండి. అన్ని సమాధానాలు తెలుగులో ఉండాలి.",
    hi: "हिंदी में स्पष्ट, सरल भाषा में जवाब दें। सभी उत्तर हिंदी में होने चाहिए।",
    ta: "தமிழில் தெளிவான, எளிய மொழியில் பதிலளிக்கவும். அனைத்து பதில்களும் தமிழில் இருக்க வேண்டும்.",
  };
  const languageInstruction = langInstructions[language] || langInstructions.en;

  const description = schemeDescription
    ? `\n\nScheme Description: ${schemeDescription}`
    : "";

  const questionContext = spokenQuestion
    ? `\n\nUser Question: ${spokenQuestion}\n\nAnswer the user's specific question about this scheme in the context of the explanation below.`
    : "";

  return `You are a helpful government scheme advisor for ${region}.${questionContext}

Provide a comprehensive explanation of the scheme: "${schemeName}"${description}

Format your response with these EXACT sections clearly labeled:

1. WHO CAN APPLY: Explain eligibility criteria - who qualifies for this scheme. Include age, income, profession, gender, or other requirements.

2. DOCUMENTS REQUIRED: List each required document on a separate line. Start each with "- ".

3. HOW TO APPLY: Provide clear step-by-step instructions for applying online. Number each step.

4. OFFLINE METHOD: Explain how citizens can apply without internet - which offices to visit, forms to fill, whom to contact.

5. IMPORTANT WARNINGS: List critical things applicants must know to avoid rejection. Start each with "- ". Include common mistakes, deadlines, fees, etc.

6. DEADLINES: Clearly mention key dates, application windows, last date, renewal cycle, and if no fixed deadline say "No fixed deadline available".

7. REGION AVAILABILITY: State which states/regions this scheme is available in. Specify if it's pan-India or state-specific.

${languageInstruction}

Be accurate and factual. If information is unclear, state that clearly.`;
}

function parseBedrockResponse(
  response: string,
  schemeName: string,
  language: NewLanguageType,
  region: string
): SchemeExplanation {
  // Extract sections from Bedrock response
  const sections = extractSections(response);

  // Parse documents as arrays
  const documentsRequired = parseListSection(
    sections["DOCUMENTS REQUIRED"] || sections.DOCUMENTS || ""
  );

  // Calculate confidence based on response token length
  const tokenCount = response.split(/\s+/).length;
  let confidence: "high" | "medium" | "low";
  
  if (tokenCount > 300) {
    confidence = "high";
  } else if (tokenCount > 150) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    schemeName,
    language,
    region,
    whoCanApply: sections["WHO CAN APPLY"] || sections.ELIGIBILITY || "Information not available",
    documentsRequired,
    howToApply: sections["HOW TO APPLY"] || sections.APPLICATION || "Information not available",
    offlineMethod: sections["OFFLINE METHOD"] || sections.OFFLINE || "Information not available",
    importantWarnings: sections["IMPORTANT WARNINGS"] || sections.WARNINGS || "No specific warnings available",
    deadlines: sections.DEADLINES || sections["APPLICATION DEADLINE"] || "No fixed deadline available",
    regionAvailability: sections["REGION AVAILABILITY"] || sections.REGION || `Available in ${region}`,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // List of section headers to look for (case-insensitive)
  const sectionHeaders = [
    "WHO CAN APPLY",
    "ELIGIBILITY",
    "DOCUMENTS REQUIRED",
    "DOCUMENTS NEEDED",
    "DOCUMENTS",
    "HOW TO APPLY",
    "APPLICATION",
    "OFFLINE METHOD",
    "OFFLINE PROCESS",
    "OFFLINE",
    "IMPORTANT WARNINGS",
    "WARNINGS",
    "DEADLINES",
    "APPLICATION DEADLINE",
    "REGION AVAILABILITY",
    "REGION",
    "AVAILABILITY",
  ];

  const upperText = text.toUpperCase();

  for (let i = 0; i < sectionHeaders.length; i++) {
    const header = sectionHeaders[i];
    const startIndex = upperText.indexOf(header);

    if (startIndex === -1) continue;

    // Find the start of content after the header
    const contentStart = startIndex + header.length;
    let contentIndexInOriginal = contentStart;

    // Look for the end of this section (next header or end of text)
    let endIndex = text.length;

    for (let j = i + 1; j < sectionHeaders.length; j++) {
      const nextHeader = sectionHeaders[j];
      const nextIndex = upperText.indexOf(nextHeader, contentStart);

      if (nextIndex !== -1) {
        endIndex = nextIndex;
        break;
      }
    }

    // Extract and clean the section content
    const sectionContent = text
      .substring(contentIndexInOriginal, endIndex)
      .trim()
      // Remove the colon and number prefix if present (e.g., ": " or "- ")
      .replace(/^[\d\.\s\-:]*/, "")
      .trim();

    if (sectionContent.length > 0) {
      sections[header] = sectionContent;
    }
  }

  return sections;
}

function parseListSection(text: string): string[] {
  if (!text || text.length === 0) return [];

  // Split by newlines and filter out empty lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    // Remove bullet points, numbers, and dashes
    .map((line) => line.replace(/^[\*\-\d\.\)\s]+/, "").trim())
    .filter((line) => line.length > 0);

  return lines;
}

import { NextRequest, NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";

interface SchemeAssistanceRequest {
  scheme_name: string;
  user_inputs?: {
    age?: number;
    income_band?: string;
    state?: string;
    category?: string;
  };
  query_type?: "eligibility" | "requirements" | "application" | "general";
  language?: "en" | "hi" | "te" | "ta";
}

export async function POST(request: NextRequest) {
  try {
    const body: SchemeAssistanceRequest = await request.json();
    const { scheme_name, user_inputs, query_type, language = "en" } = body;

    if (!scheme_name) {
      return NextResponse.json(
        { error: "scheme_name is required" },
        { status: 400 }
      );
    }

    // Build context for Bedrock
    const context = buildContext(scheme_name, user_inputs, query_type, language);

    const response = await callBedrock(context);

    return NextResponse.json({
      scheme_name,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in scheme assistance:", error);
    return NextResponse.json(
      { error: "Failed to get scheme assistance" },
      { status: 500 }
    );
  }
}

function buildContext(
  scheme_name: string,
  user_inputs?: Record<string, unknown>,
  query_type?: string,
  language: "en" | "hi" | "te" | "ta" = "en"
): string {
  const languageName = {
    en: "English",
    hi: "Hindi",
    te: "Telugu",
    ta: "Tamil",
  }[language];

  let prompt = `You are an expert on Indian government welfare schemes. `;

  prompt += `Provide helpful information about the scheme: ${scheme_name}.\n\n`;

  if (query_type === "eligibility" && user_inputs) {
    prompt += `User Profile:\n`;
    if (user_inputs.age) prompt += `- Age: ${user_inputs.age}\n`;
    if (user_inputs.income_band)
      prompt += `- Income Band: ${user_inputs.income_band}\n`;
    if (user_inputs.state) prompt += `- State: ${user_inputs.state}\n`;
    prompt += `\nBased on this profile, provide a brief eligibility assessment for this scheme.`;
  } else if (query_type === "requirements") {
    prompt += `List the key requirements and documents needed to apply for this scheme.`;
  } else if (query_type === "application") {
    prompt += `Explain the application process and steps for this scheme.`;
  } else {
    prompt += `Provide a comprehensive overview including eligibility, benefits, and how to apply.`;
  }

  prompt += `\n\nKeep the response concise and practical. Respond fully in ${languageName}. No mixed-language output.`;

  return prompt;
}

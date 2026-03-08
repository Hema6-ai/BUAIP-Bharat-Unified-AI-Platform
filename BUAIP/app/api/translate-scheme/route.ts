// app/api/translate-scheme/route.ts

/**
 * API Route: /api/translate-scheme
 * Translates government scheme content using AI with intelligent caching
 * 
 * This endpoint provides on-demand translation for scheme details,
 * ensuring only viewed schemes incur translation costs.
 */

import { NextRequest, NextResponse } from "next/server";
import { translateSchemeWithAI, translateSchemeFields } from "@/app/lib/aiTranslator";
import {
  getCachedTranslation,
  setCachedTranslation,
} from "@/app/lib/translationCache";
import { mapOldToNewLanguage, isValidLanguage, OldLanguageType } from "@/app/lib/languageCompat";

interface TranslateSchemeRequest {
  name: string;
  description: string;
  language: OldLanguageType;
  fields?: {
    benefits?: string;
    eligibility_criteria?: string;
    target_beneficiaries?: string;
  };
}

interface TranslateSchemeResponse {
  schemeName: string;
  translatedDescription: string;
  translatedFields?: {
    benefits?: string;
    eligibility_criteria?: string;
    target_beneficiaries?: string;
  };
  language: OldLanguageType;
  source: "cache" | "ai" | "original";
  timestamp: string;
}

const SUPPORTED_LANGUAGES: OldLanguageType[] = ["English", "Hindi", "Telugu", "Tamil"];

export async function POST(request: NextRequest) {
  try {
    const body: TranslateSchemeRequest = await request.json();
    const { name, description, language, fields } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: "Missing required fields: name and description" },
        { status: 400 }
      );
    }

    // Validate language
    if (!language || !isValidLanguage(language)) {
      return NextResponse.json(
        {
          error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // If English, return original (no translation needed)
    if (language === "English") {
      return NextResponse.json({
        schemeName: name,
        translatedDescription: description,
        translatedFields: fields,
        language,
        source: "original",
        timestamp: new Date().toISOString(),
      });
    }

    // Map old language code to new format for internal processing
    const newLanguageCode = mapOldToNewLanguage(language);

    // Check cache first
    const cachedTranslation = getCachedTranslation(name, language);

    if (cachedTranslation) {
      const response: TranslateSchemeResponse = {
        schemeName: name,
        translatedDescription: cachedTranslation,
        language,
        source: "cache",
        timestamp: new Date().toISOString(),
      };

      // Add cache headers for CDN/browser caching
      const nextResponse = NextResponse.json(response);
      nextResponse.headers.set(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=7200"
      );
      nextResponse.headers.set("X-Cache-Status", "HIT");

      return nextResponse;
    }

    // If additional fields need translation, do comprehensive translation
    if (fields) {
      const fullTranslation = await translateSchemeFields(
        {
          scheme_name: name,
          description,
          benefits: fields.benefits,
          eligibility_criteria: fields.eligibility_criteria,
          target_beneficiaries: fields.target_beneficiaries,
        },
        newLanguageCode
      );

      // Cache the description
      setCachedTranslation(name, language, fullTranslation.description);

      const response: TranslateSchemeResponse = {
        schemeName: fullTranslation.scheme_name,
        translatedDescription: fullTranslation.description,
        translatedFields: {
          benefits: fullTranslation.benefits,
          eligibility_criteria: fullTranslation.eligibility_criteria,
          target_beneficiaries: fullTranslation.target_beneficiaries,
        },
        language,
        source: "ai",
        timestamp: new Date().toISOString(),
      };

      const nextResponse = NextResponse.json(response);
      nextResponse.headers.set(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=7200"
      );
      nextResponse.headers.set("X-Cache-Status", "MISS");

      return nextResponse;
    }

    // Simple translation of just description
    const translatedDescription = await translateSchemeWithAI(
      name,
      description,
      newLanguageCode
    );

    // Cache the result
    setCachedTranslation(name, language, translatedDescription);

    const response: TranslateSchemeResponse = {
      schemeName: name,
      translatedDescription,
      language,
      source: "ai",
      timestamp: new Date().toISOString(),
    };

    const nextResponse = NextResponse.json(response);
    nextResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );
    nextResponse.headers.set("X-Cache-Status", "MISS");

    return nextResponse;
  } catch (error) {
    console.error("Translation error:", error);

    // Distinguish between different error types
    if (error instanceof Error) {
      if (error.message.includes("AWS") || error.message.includes("Bedrock")) {
        return NextResponse.json(
          {
            error: "AI translation service unavailable",
            message: "AWS Bedrock connection failed. Check credentials.",
            hint: "Ensure AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are set in .env.local",
          },
          { status: 503 }
        );
      }

      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Translation timeout",
            message: "AI translation took too long. Try again.",
          },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Translation failed",
        message: "An unexpected error occurred during translation",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for cache statistics (useful for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const { getCacheStats } = await import("@/app/lib/translationCache");
    const stats = getCacheStats();

    return NextResponse.json({
      ...stats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cache stats" },
      { status: 500 }
    );
  }
}

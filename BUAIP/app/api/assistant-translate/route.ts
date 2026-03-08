import { NextRequest, NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";
import { isValidLanguage, mapNewToOldLanguage, mapOldToNewLanguage } from "@/app/lib/languageCompat";

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    if (!text || !language) {
      return NextResponse.json(
        { error: "Text and language are required" },
        { status: 400 }
      );
    }

    if (!isValidLanguage(language)) {
      return NextResponse.json(
        { error: "Invalid language. Use en/hi/te/ta or English/Hindi/Telugu/Tamil." },
        { status: 400 }
      );
    }

    const normalizedLanguageCode = mapOldToNewLanguage(language);
    const languageName = mapNewToOldLanguage(normalizedLanguageCode);

    // If language is English, return original text
    if (normalizedLanguageCode === "en") {
      const response = NextResponse.json({ translatedText: text });
      // Add caching headers (cache for 1 hour)
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return response;
    }

    // Build translation prompt with exact format specified
    const prompt = `Translate the following government content into ${languageName}.
Keep meaning exact. Do not summarize. Use simple citizen-friendly tone.

TEXT:
${text}`;

    const translatedText = await callBedrock(prompt);

    const response = NextResponse.json({ translatedText: translatedText.trim() });
    
    // Add caching headers to avoid repeated inference (cache for 1 hour)
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    
    return response;
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}

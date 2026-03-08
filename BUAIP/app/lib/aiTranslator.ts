// app/lib/aiTranslator.ts

/**
 * AI-Powered Translation Service using AWS Bedrock Claude
 * Provides intelligent translation and simplification for government schemes
 */

import type { Language } from "./languageContext";
import { callBedrock } from "./bedrock";
import { getDisplayLanguageName } from "./languageConfig";

/**
 * Language-specific translation instructions for Claude
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "Respond in clear, simple English suitable for rural citizens.",
  te: "గ్రామీణ పౌరులకు అర్థమయ్యే సరళమైన తెలుగులో సమాధానం ఇవ్వండి. సాంకేతిక పదాలను నివారించండి.",
  hi: "ग्रामीण नागरिकों के लिए समझने योग्य सरल हिंदी में जवाब दें। तकनीकी शब्दों से बचें।",
  ta: "கிராமப்புற குடிமக்களுக்கு புரியும் எளிய தமிழில் பதிலளிக்கவும். தொழில்நுட்ப சொற்களைத் தவிர்க்கவும்.",
};

/**
 * Translate and simplify scheme content using AI
 * Specifically designed for Indian government schemes with cultural context
 * 
 * @param schemeName - Name of the government scheme
 * @param schemeDescription - Original English description
 * @param language - Target language for translation
 * @returns AI-translated and simplified explanation
 */
export async function translateSchemeWithAI(
  schemeName: string,
  schemeDescription: string,
  language: Language
): Promise<string> {
  // If English, return original (no translation needed)
  if (language === "en") {
    return schemeDescription;
  }

  // Build comprehensive prompt for Bedrock Claude
  const prompt = buildTranslationPrompt(schemeName, schemeDescription, language);

  try {
    // Call Bedrock API
    const translatedText = await callBedrock(prompt);
    return translatedText.trim();
  } catch (error) {
    console.error(`AI Translation failed for ${language}:`, error);
    // Return original text on error
    return schemeDescription;
  }
}

/**
 * Build structured prompt for AI translation
 * Emphasizes simplicity and cultural relevance for Indian citizens
 */
function buildTranslationPrompt(
  schemeName: string,
  description: string,
  language: Language
): string {
  const languageName = getDisplayLanguageName(language);
  const languageInstruction =
    LANGUAGE_INSTRUCTIONS[language] ||
    `Respond in clear, simple ${languageName} suitable for rural citizens.`;

  return `You are an expert Indian government translator and simplifier.

Your task: Translate and explain the following government scheme in ${languageName}.

CRITICAL REQUIREMENTS:
1. ${languageInstruction}
2. Use simple words that rural citizens can understand
3. Keep all important benefits and eligibility details
4. Do NOT summarize away crucial information
5. Maintain accuracy - this is for real citizens seeking help
6. Be culturally sensitive to Indian context

Scheme Name: ${schemeName}

Original Description:
${description}

Provide ONLY the translated explanation in ${languageName}. Do not add any prefixes like "Translation:" or explanations about what you're doing.`;
}

/**
 * Batch translate multiple scheme texts
 * Useful for translating multiple fields of a scheme at once
 * 
 * @param texts - Array of texts to translate (name, description, benefits, etc.)
 * @param language - Target language
 * @returns Array of translated texts in same order
 */
export async function batchTranslateSchemeFields(
  texts: { field: string; content: string }[],
  language: Language
): Promise<string[]> {
  if (language === "en") {
    return texts.map((t) => t.content);
  }

  // Translate all fields in parallel for efficiency
  const promises = texts.map((item) =>
    translateSchemeWithAI(item.field, item.content, language)
  );

  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error("Batch translation failed:", error);
    // Return originals on error
    return texts.map((t) => t.content);
  }
}

/**
 * Translate specific scheme fields commonly needed
 * Pre-configured for standard scheme structure
 * 
 * @param scheme - Scheme object with standard fields
 * @param language - Target language
 * @returns Object with translated fields
 */
export async function translateSchemeFields(
  scheme: {
    scheme_name: string;
    description: string;
    benefits?: string;
    eligibility_criteria?: string;
    target_beneficiaries?: string;
  },
  language: Language
): Promise<{
  scheme_name: string;
  description: string;
  benefits: string;
  eligibility_criteria: string;
  target_beneficiaries: string;
}> {
  if (language === "en") {
    return {
      scheme_name: scheme.scheme_name,
      description: scheme.description,
      benefits: scheme.benefits || "",
      eligibility_criteria: scheme.eligibility_criteria || "",
      target_beneficiaries: scheme.target_beneficiaries || "",
    };
  }

  const fieldsToTranslate = [
    { field: "scheme_name", content: scheme.scheme_name },
    { field: "description", content: scheme.description },
    { field: "benefits", content: scheme.benefits || "" },
    { field: "eligibility_criteria", content: scheme.eligibility_criteria || "" },
    { field: "target_beneficiaries", content: scheme.target_beneficiaries || "" },
  ];

  const translated = await batchTranslateSchemeFields(fieldsToTranslate, language);

  return {
    scheme_name: translated[0],
    description: translated[1],
    benefits: translated[2],
    eligibility_criteria: translated[3],
    target_beneficiaries: translated[4],
  };
}

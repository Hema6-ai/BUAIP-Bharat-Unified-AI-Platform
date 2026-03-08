import { useState, useEffect } from "react";
import type { Language } from "@/app/lib/languageContext";
import { batchTranslate } from "@/app/lib/runtimeTranslator";
import { mapOldToNewLanguage } from "@/app/lib/languageCompat";

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

/**
 * Custom hook to translate scheme data dynamically
 * Translates key fields: scheme_name, description, benefits, eligibility_criteria
 * 
 * @param scheme - The original scheme object
 * @param language - Target language (new codes: "en" or "te")
 * @returns Object containing translated scheme and loading state
 */
export function useTranslatedScheme(scheme: Scheme | null, language: Language) {
  const [translatedScheme, setTranslatedScheme] = useState<Scheme | null>(scheme);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!scheme) {
      setTranslatedScheme(null);
      return;
    }

    // If English, no translation needed
    if (language === "en") {
      setTranslatedScheme(scheme);
      setIsTranslating(false);
      return;
    }

    let isCancelled = false;

    const translateScheme = async () => {
      setIsTranslating(true);

      try {
        // Fields to translate
        const fieldsToTranslate = [
          scheme.scheme_name,
          scheme.description,
          scheme.benefits,
          scheme.eligibility_criteria,
          scheme.target_beneficiaries,
          scheme.required_documents,
          scheme.timeline,
        ];

        // Batch translate all fields
        const translatedFields = await batchTranslate(fieldsToTranslate, language);

        if (!isCancelled) {
          setTranslatedScheme({
            ...scheme,
            scheme_name: translatedFields[0] || scheme.scheme_name,
            description: translatedFields[1] || scheme.description,
            benefits: translatedFields[2] || scheme.benefits,
            eligibility_criteria: translatedFields[3] || scheme.eligibility_criteria,
            target_beneficiaries: translatedFields[4] || scheme.target_beneficiaries,
            required_documents: translatedFields[5] || scheme.required_documents,
            timeline: translatedFields[6] || scheme.timeline,
          });
          setIsTranslating(false);
        }
      } catch (error) {
        console.error("Translation error:", error);
        if (!isCancelled) {
          // On error, use original scheme
          setTranslatedScheme(scheme);
          setIsTranslating(false);
        }
      }
    };

    translateScheme();

    return () => {
      isCancelled = true;
    };
  }, [scheme, language]);

  return { translatedScheme, isTranslating };
}

/**
 * Custom hook to translate an array of schemes
 * Useful for translating scheme lists in the dashboard
 * 
 * @param schemes - Array of schemes
 * @param language - Target language (new codes: "en" or "te")
 * @returns Object containing translated schemes and loading state
 */
export function useTranslatedSchemes(schemes: Scheme[], language: Language) {
  const [translatedSchemes, setTranslatedSchemes] = useState<Scheme[]>(schemes);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // If English, no translation needed
    if (language === "en") {
      setTranslatedSchemes(schemes);
      setIsTranslating(false);
      return;
    }

    if (schemes.length === 0) {
      setTranslatedSchemes([]);
      return;
    }

    let isCancelled = false;

    const translateSchemes = async () => {
      setIsTranslating(true);

      try {
        const translatedResults = await Promise.all(
          schemes.map(async (scheme) => {
            // Only translate name and description for list view (better performance)
            const [translatedName, translatedDescription] = await batchTranslate(
              [scheme.scheme_name, scheme.description],
              language
            );

            return {
              ...scheme,
              scheme_name: translatedName || scheme.scheme_name,
              description: translatedDescription || scheme.description,
            };
          })
        );

        if (!isCancelled) {
          setTranslatedSchemes(translatedResults);
          setIsTranslating(false);
        }
      } catch (error) {
        console.error("Batch translation error:", error);
        if (!isCancelled) {
          // On error, use original schemes
          setTranslatedSchemes(schemes);
          setIsTranslating(false);
        }
      }
    };

    translateSchemes();

    return () => {
      isCancelled = true;
    };
  }, [schemes, language]);

  return { translatedSchemes, isTranslating };
}

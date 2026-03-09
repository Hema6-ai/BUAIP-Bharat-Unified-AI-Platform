// app/lib/languageContext.tsx
"use client";

import React, { createContext, useState, useEffect, ReactNode, useMemo } from "react";
import { translations, Language, TranslationKey } from "@/app/i18n";
import {
  DEFAULT_LANGUAGE_CODE,
  getBrowserPreferredLanguageCode,
  normalizeLanguageCode,
} from "@/app/lib/languageConfig";
import {
  preloadUITranslations,
  preloadPriorityUITranslations,
  loadUITranslationsFromStorage,
} from "@/app/lib/runtimeUITranslation";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  translate: (key: TranslationKey | string) => string;
  translationsReady: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE_CODE);
  const [translationsReady, setTranslationsReady] = useState<boolean>(true);
  const [runtimeCache, setRuntimeCache] = useState<Map<string, string>>(new Map());

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLanguage = localStorage.getItem("selectedLanguage");
      if (savedLanguage) {
        const normalizedSavedLanguage = normalizeLanguageCode(savedLanguage);
        setLanguageState(normalizedSavedLanguage);
      } else {
        setLanguageState(getBrowserPreferredLanguageCode());
      }
    }
  }, []);

  // Preload translations when language changes
  useEffect(() => {
    let isCancelled = false;

    if (!language || language === "en") {
      setTranslationsReady(true);
      return () => {
        isCancelled = true;
      };
    }

    // For non-English languages with static dictionaries, mark ready immediately
    if (language in translations) {
      setTranslationsReady(true);
      return () => {
        isCancelled = true;
      };
    }

    // For runtime-translated languages (like German), wait for priority translations
    // This ensures the AI menu and key UI elements are translated before showing
    async function loadPriorityTranslations() {
      setTranslationsReady(false);

      // Load from localStorage first (synchronous)
      loadUITranslationsFromStorage(language);
      setRuntimeCache(new Map());

      // Preload ONLY priority keys (wait for them)
      await preloadPriorityUITranslations(language)
        .then(() => {
          if (isCancelled) return;
          // Force a re-render to show newly loaded translations
          setRuntimeCache(new Map());
          setTranslationsReady(true);

          // Continue preloading remaining keys in background (don't wait)
          void preloadUITranslations(language).then(() => {
            if (isCancelled) return;
            setRuntimeCache(new Map());
          });
        })
        .catch((error) => {
          console.error("Failed to preload priority translations:", error);
          // Even if preload fails, mark as ready so UI isn't blocked
          setTranslationsReady(true);
        });
    }

    void loadPriorityTranslations();

    return () => {
      isCancelled = true;
    };
  }, [language]);

  const setLanguage = (lang: Language) => {
    const normalizedLanguage = normalizeLanguageCode(lang);
    setLanguageState(normalizedLanguage);
    
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedLanguage", normalizedLanguage);
    }
  };

  // Translation function with runtime translation support
  const translate = useMemo(() => {
    return (key: TranslationKey | string): string => {
      // Check static dictionary first
      const currentDictionary = translations[language];
      if (currentDictionary) {
        const value = currentDictionary[key as TranslationKey];
        if (value) {
          return value;
        }
      }

      // Try runtime translation (synchronous lookup from cache)
      if (language !== "en") {
        const { getCachedUITranslation } = require("@/app/lib/runtimeUITranslation");
        const cached = getCachedUITranslation(language, key);
        if (cached) {
          return cached;
        }
      }

      // Fallback to English
      const fallback = translations.en[key as TranslationKey];
      if (fallback) {
        return fallback;
      }
      
      // Last resort: return the key itself
      return key;
    };
  }, [language, runtimeCache]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    translate,
    translationsReady,
  }), [language, translate, translationsReady]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Re-export Language type for convenience
export type { Language };

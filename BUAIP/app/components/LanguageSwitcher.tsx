// app/components/LanguageSwitcher.tsx
"use client";

import { useLanguage, Language } from "@/app/lib/languageContext";
import { useTranslation } from "@/app/lib/useTranslation";
import {
  SUPPORTED_LANGUAGE_GROUPS,
  getLocalizedDisplayLanguageName,
  type SupportedLanguageCode,
} from "@/app/lib/languageConfig";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-white/80">
        {t("header_language")}:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="px-3 py-1.5 border border-white/20 rounded-lg bg-white/10 text-sm font-medium text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
      >
        {SUPPORTED_LANGUAGE_GROUPS.flatMap((group) => group.languages).map((lang) => {
          const code = lang.code as SupportedLanguageCode;
          return (
            <option key={code} value={code}>
              {getLocalizedDisplayLanguageName(code, language)}
            </option>
          );
        })}
      </select>
    </div>
  );
}

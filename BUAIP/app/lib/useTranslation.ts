// app/lib/useTranslation.ts
import { useLanguage } from "./languageContext";

/**
 * Convenience hook that exposes translate function as 't' for cleaner syntax
 */
export function useTranslation() {
  const { translate, language } = useLanguage();
  return { t: translate, language, translate };
}

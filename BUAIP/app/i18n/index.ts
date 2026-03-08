// Language registry - static translation dictionaries
import { en } from "./en";
import { te } from "./te";
import { hi } from "./hi";
import { ta } from "./ta";
import type { SupportedLanguageCode } from "@/app/lib/languageConfig";

export type Language = SupportedLanguageCode;

export const translations: Record<string, typeof en> = {
  en,
  te,
  hi,
  ta,
};

export type TranslationKey = keyof typeof en;

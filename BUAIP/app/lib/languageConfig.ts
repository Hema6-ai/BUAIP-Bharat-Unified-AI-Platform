export type LanguageRegion =
  | 'India'
  | 'International';

export interface SupportedLanguageOption {
  code: string;
  label: string;
  region: LanguageRegion;
  awsTranslateCode: string;
  fallbackAwsTranslateCode?: string;
  aliases?: string[];
}

export const SUPPORTED_LANGUAGE_OPTIONS = [
  // Indian languages
  { code: 'en', label: 'English', region: 'India', awsTranslateCode: 'en', aliases: ['en-in', 'en-us', 'en-gb'] },
  { code: 'hi', label: 'Hindi', region: 'India', awsTranslateCode: 'hi' },
  { code: 'te', label: 'Telugu', region: 'India', awsTranslateCode: 'te' },
  { code: 'ta', label: 'Tamil', region: 'India', awsTranslateCode: 'ta' },
  { code: 'kn', label: 'Kannada', region: 'India', awsTranslateCode: 'kn' },
  { code: 'ml', label: 'Malayalam', region: 'India', awsTranslateCode: 'ml' },
  { code: 'bn', label: 'Bengali', region: 'India', awsTranslateCode: 'bn' },
  { code: 'gu', label: 'Gujarati', region: 'India', awsTranslateCode: 'gu' },
  { code: 'mr', label: 'Marathi', region: 'India', awsTranslateCode: 'mr' },
  { code: 'pa', label: 'Punjabi', region: 'India', awsTranslateCode: 'pa' },
  { code: 'ur', label: 'Urdu', region: 'India', awsTranslateCode: 'ur' },

  // International languages
  { code: 'es', label: 'Spanish', region: 'International', awsTranslateCode: 'es' },
  { code: 'fr', label: 'French', region: 'International', awsTranslateCode: 'fr' },
  { code: 'de', label: 'German', region: 'International', awsTranslateCode: 'de' },
  { code: 'ar', label: 'Arabic', region: 'International', awsTranslateCode: 'ar' },
  { code: 'zh', label: 'Chinese', region: 'International', awsTranslateCode: 'zh' },
  { code: 'ja', label: 'Japanese', region: 'International', awsTranslateCode: 'ja' },
] as const satisfies readonly SupportedLanguageOption[];

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_OPTIONS)[number]['code'];

export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = 'en';

const REGION_ORDER: LanguageRegion[] = [
  'India',
  'International',
];

export const SUPPORTED_LANGUAGE_GROUPS = REGION_ORDER.map((region) => ({
  region,
  languages: SUPPORTED_LANGUAGE_OPTIONS.filter((item) => item.region === region),
}));

const SUPPORTED_LANGUAGE_CODE_SET = new Set<string>(
  SUPPORTED_LANGUAGE_OPTIONS.map((item) => item.code)
);

const SUPPORTED_LANGUAGE_LABEL_TO_CODE = new Map(
  SUPPORTED_LANGUAGE_OPTIONS.map((item) => [item.label.toLowerCase(), item.code])
);

const SUPPORTED_LANGUAGE_ALIAS_TO_CODE = new Map<string, string>();
for (const option of SUPPORTED_LANGUAGE_OPTIONS as readonly SupportedLanguageOption[]) {
  for (const alias of option.aliases || []) {
    SUPPORTED_LANGUAGE_ALIAS_TO_CODE.set(alias.toLowerCase(), option.code);
  }
}

const LEGACY_ALIAS_TO_CODE: Record<string, string> = {
  english: 'en',
  hindi: 'hi',
  telugu: 'te',
  tamil: 'ta',
};

const CODE_TO_OPTION = new Map(
  SUPPORTED_LANGUAGE_OPTIONS.map((item) => [item.code, item])
);

export function isSupportedLanguageCode(value: string): value is SupportedLanguageCode {
  return SUPPORTED_LANGUAGE_CODE_SET.has(value);
}

export function normalizeLanguageCode(value?: string): SupportedLanguageCode {
  if (!value) {
    return DEFAULT_LANGUAGE_CODE;
  }

  const normalized = value.trim().toLowerCase().replace(/_/g, '-');
  if (isSupportedLanguageCode(normalized)) {
    return normalized;
  }

  if (LEGACY_ALIAS_TO_CODE[normalized] && isSupportedLanguageCode(LEGACY_ALIAS_TO_CODE[normalized])) {
    return LEGACY_ALIAS_TO_CODE[normalized] as SupportedLanguageCode;
  }

  const byLabel = SUPPORTED_LANGUAGE_LABEL_TO_CODE.get(normalized);
  if (byLabel && isSupportedLanguageCode(byLabel)) {
    return byLabel;
  }

  const byAlias = SUPPORTED_LANGUAGE_ALIAS_TO_CODE.get(normalized);
  if (byAlias && isSupportedLanguageCode(byAlias)) {
    return byAlias;
  }

  const baseLocale = normalized.split('-')[0];

  if (isSupportedLanguageCode(baseLocale)) {
    return baseLocale;
  }

  return DEFAULT_LANGUAGE_CODE;
}

export function getLanguageOption(code: SupportedLanguageCode): SupportedLanguageOption {
  return CODE_TO_OPTION.get(code) || CODE_TO_OPTION.get(DEFAULT_LANGUAGE_CODE)!;
}

export function getDisplayLanguageName(code: SupportedLanguageCode): string {
  return getLanguageOption(code).label;
}

export function getLocalizedDisplayLanguageName(
  code: SupportedLanguageCode,
  uiLanguage: SupportedLanguageCode,
): string {
  if (typeof Intl === 'undefined' || typeof (Intl as any).DisplayNames !== 'function') {
    return getDisplayLanguageName(code);
  }

  try {
    const displayNames = new Intl.DisplayNames([uiLanguage], { type: 'language' });
    const localized = displayNames.of(code);
    return localized || getDisplayLanguageName(code);
  } catch {
    return getDisplayLanguageName(code);
  }
}

export function getAwsTranslateTargetCode(code: SupportedLanguageCode): string {
  const option = getLanguageOption(code);
  return option.fallbackAwsTranslateCode || option.awsTranslateCode;
}

export function getBrowserPreferredLanguageCode(): SupportedLanguageCode {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE_CODE;
  }

  const candidates = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = String(candidate).trim().toLowerCase().replace(/_/g, '-');

    if (isSupportedLanguageCode(normalized)) {
      return normalized;
    }

    const aliasMatch = SUPPORTED_LANGUAGE_ALIAS_TO_CODE.get(normalized);
    if (aliasMatch && isSupportedLanguageCode(aliasMatch)) {
      return aliasMatch;
    }

    const baseLocale = normalized.split('-')[0];
    if (isSupportedLanguageCode(baseLocale)) {
      return baseLocale;
    }
  }

  return DEFAULT_LANGUAGE_CODE;
}

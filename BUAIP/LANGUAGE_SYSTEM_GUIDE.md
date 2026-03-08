# Global Language System Implementation

## Overview
A comprehensive multilingual support system with localStorage persistence, dynamic UI translation, and AI responses in the user's selected language.

## Supported Languages
1. **English** - Default language
2. **Hindi** - हिंदी
3. **Telugu** - తెలుగు
4. **Tamil** - தமிழ்

## Architecture

### 1. Language Context (`app/lib/languageContext.tsx`)
- **LanguageContext**: React context for global language state
- **LanguageProvider**: Wrapper component that provides language context
- **useLanguage**: Hook to access current language and setter
- **LocalStorage**: Persists selection across sessions (`selectedLanguage` key)
- **Hydration-safe**: Prevents SSR mismatches with mounted state

### 2. Translations Dictionary (`app/lib/translations.ts`)
- **translations**: Object with all UI strings in 4 languages
- **getTranslation**: Helper function to retrieve translated strings
- **Categories**:
  - Header & Navigation
  - Citizen Dashboard
  - Government Dashboard
  - Scheme Details
  - Scheme Assistance
  - Common UI elements
  - Footer

### 3. Translation Hook (`app/lib/useTranslation.ts`)
- **useTranslation**: Hook combining useLanguage + getTranslation
- **t() function**: Simple translation function accepting key strings
- Example: `t("header.title")` → "India Governance Intelligence Platform" (English)

### 4. Language Switcher (`app/components/LanguageSwitcher.tsx`)
- Dropdown component for language selection
- Uses translated label for "Language"
- Automatically saves to localStorage on change
- Styled with Tailwind CSS

## Integration Points

### Root Layout (`app/layout.tsx`)
```tsx
<LanguageProvider>
  {children}
</LanguageProvider>
```
All pages wrapped with LanguageProvider at the root level.

### Landing Page (`app/page.tsx`)
- Uses dynamic import with `ssr: false` to prevent SSR errors
- LandingPageContent component uses language context

### API Route (`app/api/scheme-ai/route.ts`)
Enhanced to:
- Accept `language` parameter in request body
- Validate against supported languages
- Send language-specific prompts to Bedrock Claude
- Return responses in the selected language

**Bedrock Prompt Instructions by Language:**
- **English**: "Respond in English with clear, professional language"
- **Hindi**: "सभी उत्तर हिंदी में दें। स्पष्ट और पेशेवर भाषा का उपयोग करें"
- **Telugu**: "తెలుగులో సంపూర్ణ ప్రతిస్పందన ఇవ్వండి"
- **Tamil**: "தமிழில் முழு பதிலை வழங்கவும்"

### Scheme AI Explainer (`app/components/SchemeAIExplainer.tsx`)
- Automatically reads language from context
- Sends language to `/api/scheme-ai` endpoint
- All UI labels dynamically translated (`t("scheme.eligibility")`, etc.)

## Usage Examples

### In a Component
```tsx
import { useTranslation } from "@/app/lib/useTranslation";

export function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("header.title")}</h1>
      <p>{t("header.subtitle")}</p>
    </div>
  );
}
```

### Accessing Current Language
```tsx
import { useLanguage } from "@/app/lib/languageContext";

export function MyComponent() {
  const { language, setLanguage } = useLanguage();
  
  console.log(language); // "English", "Hindi", etc.
  
  // Change language programmatically
  setLanguage("Hindi");
}
```

### In API Calls
```tsx
const { language } = useLanguage();

const response = await fetch("/api/scheme-ai", {
  method: "POST",
  body: JSON.stringify({
    schemeName: "PM Kisan",
    language, // Automatically uses selected language
  }),
});
```

## Translation Keys Reference

### Header & Navigation
- `header.title`, `header.subtitle`, `header.language`
- `nav.home`, `nav.citizen`, `nav.government`, `nav.admin`

### Citizen Dashboard
- `citizen.title`, `citizen.subtitle`, `citizen.selectCategory`
- `citizen.noSchemes`, `citizen.loading`, `citizen.error`
- `citizen.getAIHelp`, `citizen.exploreScheme`

### Government Dashboard
- `government.title`, `government.subtitle`
- `government.districtIntelligence`, `government.topPerformers`
- `government.schemeIntelligence`, `government.underservedSegments`
- `government.policyRecommendations`

### Scheme Details
- `scheme.details`, `scheme.eligibility`, `scheme.documents`
- `scheme.howToApply`, `scheme.offline`, `scheme.deadlines`
- `scheme.rejectionReasons`, `scheme.additionalInfo`
- `scheme.loading`, `scheme.getExplanation`, `scheme.error`

### Common
- `common.loading`, `common.error`, `common.save`, `common.cancel`
- `common.close`, `common.noData`, `common.tryAgain`
- `common.aiGeneratedInsight`, `common.generatedOn`

## Adding New Languages

1. **Add Language Type**:
   ```tsx
   // In languageContext.tsx
   export type Language = "English" | "Hindi" | "Telugu" | "Tamil" | "NewLanguage";
   ```

2. **Add Translation Dictionary**:
   ```tsx
   // In translations.ts
   export const translations: TranslationDictionary = {
     // ...existing languages
     NewLanguage: {
       "header.title": "Translated Title",
       // ...all keys
     },
   };
   ```

3. **Add to Switcher**:
   ```tsx
   // In LanguageSwitcher.tsx
   const languages: Language[] = ["English", "Hindi", "Telugu", "Tamil", "NewLanguage"];
   ```

4. **Add Bedrock Prompt**:
   ```tsx
   // In api/scheme-ai/route.ts
   const langInstructions: Record<SupportedLanguage, string> = {
     // ...existing
     NewLanguage: "Instruction in NewLanguage",
   };
   ```

## Adding New Translation Keys

1. Add key to all 4 language dictionaries in `translations.ts`
2. Use in components with `t("newKey")`
3. Build to verify no missing translations

## Testing

### Manual Testing
1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Click language dropdown in header
4. Select different languages
5. Verify:
   - UI text changes immediately
   - Selection persists on page reload (localStorage)
   - Language switcher label translates
6. Navigate to Citizen Dashboard
7. Select a scheme
8. Click "Get AI Scheme Explanation"
9. Verify Bedrock response in selected language

### localStorage Check
```javascript
// In browser console
localStorage.getItem("selectedLanguage") // "Hindi"
```

## Technical Details

### Hydration Strategy
- Provider uses `mounted` state to prevent SSR mismatches
- Landing page uses `dynamic` import with `ssr: false`
- Translations load on client side only

### Performance
- Translations object is statically defined (no fetch)
- Hook rerenders components when language changes
- LocalStorage writes are debounced by React state

### Type Safety
- Language type is strictly typed union
- Translation keys are string literals (could be made type-safe)
- API validates language against supported list

## Troubleshooting

### "useLanguage must be used within a LanguageProvider"
- Ensure LanguageProvider wraps component tree
- Check layout.tsx has provider
- Verify component is inside provider boundary

### Translations not updating
- Clear localStorage: `localStorage.removeItem("selectedLanguage")`
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors

### Bedrock responses in wrong language
- Verify language is being passed to API
- Check API request body includes correct language
- Review Bedrock prompt instructions

## Future Enhancements
- Type-safe translation keys with TypeScript template literals
- Fallback language chain (e.g., Hindi → English)
- Right-to-left (RTL) language support
- Pluralization support
- Date/number formatting per locale
- Translation management UI
- Auto-detect browser language

# Multi-Language Translation System

## Overview

BUAIP now supports **90+ languages** with a hybrid translation approach:

1. **Static Dictionaries**: Pre-translated files for common languages (instant UI switching)
2. **Runtime Translation**: AWS Translate for remaining languages (on-demand with caching)
3. **DynamoDB + Memory Cache**: Avoid repeated API calls and reduce costs

## Architecture

```
User selects language (e.g., French)
           ↓
    Has static dictionary?
           ↓
      YES ────────→ Use fr.ts dictionary (instant)
           ↓ NO
    Check runtime cache?
           ↓
      YES ────────→ Use cached translations (fast)
           ↓ NO
   AWS Translate API
           ↓
    Cache result (DynamoDB + memory + localStorage)
           ↓
    Display translated UI
```

## Files Structure

### Core System
- `app/lib/runtimeUITranslation.ts` - Runtime translation engine
- `app/lib/languageContext.tsx` - React context with translation logic
- `app/lib/aws/translationCache.ts` - Translation caching layer
- `app/i18n/index.ts` - Translation registry

### Static Dictionaries (Instant Translation)
- `app/i18n/en.ts` - English (base)
- `app/i18n/te.ts` - Telugu
- `app/i18n/hi.ts` - Hindi
- `app/i18n/ta.ts` - Tamil
- `app/i18n/bn.ts` - Bengali (generate)
- `app/i18n/mr.ts` - Marathi (generate)
- ... more as needed

### Utilities
- `scripts/generateTranslations.ts` - Generate single language dictionary
- `scripts/generateAllTranslations.ps1` - Batch generate multiple languages

## Usage

### Generating Static Dictionaries

**Single Language:**
```bash
tsx scripts/generateTranslations.ts bn  # Bengali
tsx scripts/generateTranslations.ts mr  # Marathi
```

**Batch (All Indian Languages):**
```powershell
.\scripts\generateAllTranslations.ps1
```

### Adding Generated Dictionaries

1. After generation, import in `app/i18n/index.ts`:
```typescript
import { bn } from "./bn";
import { mr } from "./mr";

export const translations: Record<string, typeof en> = {
  en,
  te,
  hi,
  ta,
  bn,  // Add new languages
  mr,
  // ...
};
```

2. Rebuild the app:
```bash
npm run build
```

### How It Works for Users

1. **User selects any language from dropdown** (90+ options)
2. **Static languages** (en, te, hi, ta, etc.) → Instant UI switch
3. **Other languages** → Shows English briefly → Loads translations in background → UI updates
4. **Second visit** → Cached translations load from localStorage → Appears instant

## Translation Keys

All UI strings use translation keys:

```tsx
// Component code
const { t } = useTranslation();
<h1>{t('chat_welcome_title')}</h1>

// English dictionary (app/i18n/en.ts)
chat_welcome_title: "Hello, I'm BUAIP."

// Telugu dictionary (app/i18n/te.ts)  
chat_welcome_title: "హలో, నేను BUAIP."

// French (runtime) → AWS Translate
chat_welcome_title: "Bonjour, je suis BUAIP."
```

## Performance

- **Static dictionaries**: 0ms (instant)
- **Cached runtime**: ~5ms (localStorage + memory)
- **First-time runtime**: ~200-500ms per batch (AWS API)
- **Preloading**: Background process, non-blocking

## Cost Optimization

1. **DynamoDB Cache**: 1-hour TTL, shared across users
2. **Memory Cache**: In-process cache, reset on server restart
3. **localStorage Cache**: Client-side persistence across sessions
4. **Batch Translation**: Translates 10 keys at a time with delays
5. **Static Dictionaries**: Zero API costs for common languages

## Testing

```bash
# Start dev server
npm run dev

# Test language switching:
1. Open http://localhost:3000
2. Click language dropdown in navbar
3. Select any language (e.g., "Français - Europe")
4. UI should switch immediately (static) or show English briefly then update (runtime)
5. Check browser console for preload progress
6. Refresh page - should load from cache

# Verify translation:
- Welcome title should change
- Example prompts should translate
- Input placeholder should translate
- Navbar labels should translate
```

## Adding New UI Strings

1. Add key to `app/i18n/en.ts`:
```typescript
export const en = {
  // ... existing keys
  my_new_key: "My new text",
};
```

2. Add translations to other static dictionaries (te.ts, hi.ts, etc.)

3. Use in components:
```tsx
const { t } = useTranslation();
<div>{t('my_new_key')}</div>
```

4. Runtime languages will auto-translate the new key

## Troubleshooting

**UI not switching?**
- Check browser console for errors
- Verify localStorage has `selectedLanguage` key
- Check DynamoDB table exists: `buaip-translation-cache`

**Translations not loading?**
- Check AWS credentials are configured
- Check AWS Translate quota (1M chars/month free tier)
- Check DynamoDB table permissions

**Slow runtime translation?**
- First load is always slower (AWS API call)
- Check network tab in DevTools
- Verify caching is working (console logs show "Preloaded UI translations")

**Clear caches:**
```typescript
// In browser console:
localStorage.clear();
location.reload();
```

## API Reference

### `preloadUITranslations(language: string)`
Preloads all UI translations for a language in background.

### `translateUIKey(key: string, targetLanguage: string)`
Translates a single key with caching.

### `clearUITranslationCache(languageCode?: string)`
Clears translation cache for debugging.

### `useTranslation()`
React hook for accessing translations.

## Future Enhancements

- [ ] Right-to-left (RTL) support for Arabic, Urdu, Hebrew
- [ ] Voice input in native language
- [ ] Translation quality feedback
- [ ] Custom translation overrides per organization
- [ ] Incremental static generation (ISG) for popular language combinations

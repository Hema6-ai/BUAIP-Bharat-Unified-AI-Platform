# BUAIP Strict Multilingual Architecture - Implementation Guide

## ✅ COMPLETED: Core Infrastructure

### 1. Language Detection & Translation Pipeline (`app/lib/languageDetection.ts`)
- **detectLanguage()**: Automatic detection of user input language using script analysis
- **translateUserQueryToEnglish()**: Converts user input to English for internal reasoning
- **translateResponseToUILanguage()**: Translates AI response to selected UI language
- **executeMultilingualPipeline()**: Complete end-to-end pipeline (Input detection → Reasoning → Output translation)

### 2. Enhanced Translation Pipeline (`app/lib/aws/translationPipeline.ts`)
- **STRICT MODE ENFORCEMENT**: Selected UI language ALWAYS controls response language
- Language detection for input analysis
- Bidirectional translation (user query to English, response back to selected language)
- Caching for translation efficiency
- Graceful fallback with warnings

### 3. Language Enforcement System (`app/lib/languageEnforcement.ts`)
- System prompt instructions for strict language enforcement
- Language names in multiple languages for AI understanding
- Translation failure warnings in all supported languages
- RULE: All AI engines will include language enforcement in system prompts

### 4. Translation API Route (`app/api/translate/route.ts`)
- Bidirectional translation service
- In-memory caching for performance
- Graceful degradation (returns original text if translation fails)
- Fallback warnings for user awareness

### 5. Translation Cache Enhancement (`app/lib/aws/translationCache.ts`)
- Added `getMemoryCachedTranslation()` for quick lookups
- Added `setCacheTranslation()` for memory caching
- DynamoDB integration for persistent cache
- TTL management for cache freshness

---

## ✅ COMPLETED: API Route Updates

### 1. Unified AI Router (`app/api/unified-ai/route.ts`)
- Updated to use strict language enforcement
- Passes `selectedLanguage` (responseLanguage) to all engine calls
- Fixed:  `language: 'en'` → `language: responseLanguage`

### 2. ANNADATA AI Engine (`app/api/annadata-ai/route.ts`)
- Enhanced system prompt with strict language enforcement
- Added multilingual instruction: "Respond ONLY and ENTIRELY in {language}"  
- Accepts `language` parameter from frontend
- All advisory types enforce response language

### 3. Agriculture Modules (`app/lib/agricultureModules.ts`)
- All 9 modules (Crop Advisor, Mandi Price, Weather, Disease Doctor, etc.)
- Added language enforcement to `buildModuleSystemPrompt()`
- System prompt clarifies: Selected language controls all responses
- Currently supports: English, Hindi, Telugu, Tamil

---

## ✅ COMPLETED: Frontend Integration

### 1. Chat Interface (`app/chat/page.tsx`)
- Already passes `selectedLanguage: language` to `/api/unified-ai`
- Conversation history preserved across language changes
- Session management tracks language preference

### 2. Example Queries - Multilingual (`app/i18n/*.ts`)
- **English**: Original examples
- **Hindi** (`hi.ts`): Full Hindi translations of all 6 example queries
- **Telugu** (`te.ts`): Full Telugu translations of all 6 example queries
- **Tamil** (`ta.ts`): Full Tamil translations of all 6 example queries

Example queries cover:
1. Farmer - scheme eligibility & subsidies
2. Farmer - crop selection based on season
3. Manufacturer - export assistance
4. Tourist - travel preparation
5. Tenant - legal rights
6. Student - career guidance

---

## 🔄 HOW THE SYSTEM WORKS

### User Interaction Flow

```
[User Interface - Language Selected: {LANGUAGE}]
          ↓
[User Types Query in Any Language]
          ↓
[Language Detection: detectLanguage(userInput)]
   ├─ Detects: Input Language, Confidence
   └─ If not English: translates to English for reasoning
          ↓
[Internal Processing: callBedrock(englishQuery, systemPrompt)]
   ├─ System Prompt includes: Language enforcement instruction
   ├─ AI Engine processes in English reasoning
   └─ Returns: English response
          ↓
[Output Translation: translateResponseToUILanguage]
   ├─ If UI Language ≠ English: Translates response to {LANGUAGE}
   └─ If translation fails: Shows original + warning
          ↓
[Display to User in Selected Language]
```

### The Three Critical Rules

**RULE 1: Selected Language Controls Everything**
- UI language selector is the master control
- All responses MUST be in selected language
- Regardless of user's input language

**RULE 2: English is Canonical Reasoning Language**
- Internal AI processing happens only in English
- Ensures consistency across all engines
- Eliminates cross-language reasoning errors

**RULE 3: Strict Language Enforcement**
- Every AI system prompt includes language enforcement instruction
- AI is explicitly told: "Respond ONLY in {language}, even if user typed something else"
- Failsafe: If translation fails, show English + warning message

---

## 📋 REMAINING TASKS

### TODO 1: Translate Hardcoded UI Labels

Location: All engine pages (`/app/*/page.tsx` and components)

Examples to translate:
- Module titles: "Crop Advisor", "Mandi Price Intelligence", "Disease Doctor", etc.
- Button labels: "Submit", "Try Again", "Clear", etc.
- Error messages: "Please enter valid input", "No results found", etc.
- Section headings and descriptions
- Capability descriptions

**Approach**: Use the `useTranslation()` hook and add translation keys to i18n files:
```javascript
const { t } = useTranslation();
// Instead of: <h1>Crop Advisor</h1>
// Use: <h1>{t('module_crop_advisor')}</h1>
```

### TODO 2: Implement Translation Failsafe & Warnings

Locations:
1. `app/api/translate/route.ts` - Already partially done
2. Frontend components - Need to display warnings gracefully
3. Chat display - Show subtle warning when translation fails

**Implementation**:
```typescript
// In API response:
{
  translatedText: "...",
  isFallback: false,
  warning?: "Translation temporarily unavailable."
}

// In UI, show warning as subtle notification:
{warning && <small className="text-yellow-600">{warning}</small>}
```

---

## 🎯 VALIDATION CHECKLIST

Test each scenario:

### Scenario 1: User selects Gujarati, asks in English
- [ ] UI shows entirely in Gujarati
- [ ] Example prompts appear in Gujarati  
- [ ] User can type question in English
- [ ] Response comes back in Gujarati
- [ ] No English appears in the response

### Scenario 2: User selects Telugu, asks in Hindi
- [ ] Input is detected as Hindi
- [ ] Translated to English internally
- [ ] AI reasoning happens in English  
- [ ] Response translated to Telugu
- [ ] User sees only Telugu

### Scenario 3: User switches language mid-conversation
- [ ] Conversation history preserved
- [ ] New responses in new language
- [ ] No code-switching in responses

### Scenario 4: Translation service fails
- [ ] Fallback English response shown
- [ ] Warning message displayed
- [ ] System doesn't crash
- [ ] User knows why English is shown

---

## 🔧 FILES CREATED/MODIFIED

### Created Files
1. `app/lib/languageDetection.ts` - Language detection & translation utilities
2. `app/lib/languageEnforcement.ts` - System prompt instructions
3. `app/api/translate/route.ts` - Translation API service

### Modified Files
1. `app/lib/aws/translationPipeline.ts` - Enforced strict language mode
2. `app/lib/aws/translationCache.ts` - Added memory cache functions
3. `app/api/unified-ai/route.ts` - Pass language to engines
4. `app/api/annadata-ai/route.ts` - Enhanced language enforcement
5. `app/lib/agricultureModules.ts` - Added language enforcement
6. `app/i18n/hi.ts` - Added Hindi example prompts
7. `app/i18n/ta.ts` - Added Tamil example prompts
8. `app/i18n/te.ts` - Already had Telugu translations

---

## 🚀 DEPLOYMENT NOTES

### AWS Configuration
- Ensure `AWS_REGION` = "ap-south-1" (India)
- Verify AWS Translate service permissions
- DynamoDB table for translation cache configured

### Environment Variables
```
AWS_REGION=ap-south-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
DYNAMODB_TRANSLATION_CACHE_TABLE=buaip-translation-cache
```

### Performance Optimization
- Translation cache set to 1 hour TTL
- In-memory cache for very frequently translated text
- Consider pre-caching common responses by language

---

## 📞 SUPPORT & TESTING

### Manual Testing Commands

```bash
# Test language detection
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "నా కుటుంబ వార్షిక ఆదాయం కుండ",
    "sourceLanguage": "te",
    "targetLanguage": "en"
  }'

# Test chat in different language
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "నా ఆర్థిక పరिस्थिति",
    "selectedLanguage": "te"
  }'
```

### Edge Cases to Test
- [ ] Very long texts (>5000 chars)
- [ ] Mixed script text (Hindi + English)
- [ ] Regional variations (accent marks, etc.)
- [ ] Special characters and numbers
- [ ] Repeated language selection
- [ ] Rapid language switching

---

## 🎓 ARCHITECTURE NOTES

### Why English as Canonical Language?
- Bedrock Claude trained primarily in English
- Consistent reasoning quality across all languages
- Simplifies multi-stage processing
- Translation is only at input/output boundaries

### Why Strict Mode?
- Global apps (Facebook, WhatsApp) don't code-switch
- User expectations: "I selected this language, show everything in it"
- Prevents confusion from mixed languages
- Better UX for non-English-first users

### Translation Choices
- AWS Translate for production (fast, accurate)
- LLM-based fallback possible but slower
- Cache aggressively to reduce API calls
- Graceful degradation: show original if translation fails

---

## 🔐 SECURITY CONSIDERATIONS

- [ ] Language parameter validated (whitelist: 'en', 'hi', 'te', 'ta')
- [ ] No language injection attacks (use parameterized calls)
- [ ] Translation API requires authentication
- [ ] Cache doesn't leak across users/sessions
- [ ] User language preference stored only in localStorage (client-side)

---

## 📈 NEXT PHASE: AI ENGINE UPDATES

Each engine needs to be updated to include language enforcement in system prompts:

- [ ] `/api/nyaya-ai` (Legal Engine)
- [ ] `/api/udyog-page.tsx` (Entrepreneurship)
- [ ] `/api/globalseller-engine` (Export)
- [ ] `/api/atithi-page.tsx` (Travel)
- [ ] `/api/pathai-page.tsx` (Career)
- [ ] Super Router with language context

---

**Status**: Infrastructure complete. Ready for comprehensive UI translation and edge case testing.

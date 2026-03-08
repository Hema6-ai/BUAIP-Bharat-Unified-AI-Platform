# BUAIP Language Override Feature - Test & Demo

## Quick Test Suite

### 1. Test Language Override Detection
```bash
# In your terminal or Node REPL:
node

> const { detectLanguageOverride, extractBaseQuery } = require('./app/lib/languageOverrideDetection');

// Test Case 1: Simple override
> detectLanguageOverride("Explain GST in English");
// Expected: { hasOverride: true, overrideLanguage: 'en', confidence: 0.95, ... }

// Test Case 2: Hindi override
> detectLanguageOverride("हिंदी में समझाओ");
// Expected: { hasOverride: true, overrideLanguage: 'hi', confidence: 0.95, ... }

// Test Case 3: No override
> detectLanguageOverride("What is agriculture?");
// Expected: { hasOverride: false, confidence: 0 }

// Test Case 4: Extract base query
> extractBaseQuery("Tell me about GST in English");
// Expected: "Tell me about GST"
```

---

### 2. Test System Prompt Generation
```bash
> const { buildLanguageSystemPrompt } = require('./app/lib/systemPromptWithLanguage');

// Normal mode - no override
> buildLanguageSystemPrompt({
    selectedLanguage: 'hi',
    responseLanguage: 'hi',
    hasOverride: false
  });
// Expected: System prompt mentioning Hindi enforcement

// Override mode
> buildLanguageSystemPrompt({
    selectedLanguage: 'hi',
    responseLanguage: 'en',
    hasOverride: true
  });
// Expected: System prompt mentioning override to English, revert to Hindi
```

---

### 3. End-to-End API Test

#### Test Case: User Selects Hindi, Overrides to English
```bash
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Explain GST rules, but answer in English",
    "selectedLanguage": "hi",
    "conversationHistory": []
  }'

# Expected Response:
{
  "response": "GST (Goods and Services Tax) is a comprehensive...",
  "language": "en",  // Override language
  "hasOverride": true,
  "willRevertTo": "hi"
}
```

#### Test Case 2: User Selects Tamil, No Override
```bash
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "எவ்வகை பயிர்களை நான் விளைவிக்க வேண்டும்?",
    "selectedLanguage": "ta",
    "conversationHistory": []
  }'

# Expected Response:
{
  "response": "உங்கள் பகுதிக்கு இந்தப் பயிர்கள் பொருத்தம்...",
  "language": "ta",  // Default language
  "hasOverride": false
}
```

---

### 4. UI Testing Checklist

- [ ] **Language Selector Works**
  - Select each language from dropdown
  - Verify selection saved in localStorage
  - Refresh page - language persists

- [ ] **Default Behavior**
  - Select Gujarati
  - Ask in English
  - Verify response in Gujarati

- [ ] **Simple Override**
  - Select Hindi
  - Ask "Explain in English"
  - Verify response in English
  - Ask again and verify returns to Hindi

- [ ] **Complex Override**
  - Select Tamil
  - Ask in Hindi: "मुझे English में जवाब दो"
  - Verify system:
    - Detects input language: Hindi
    - Detects override: English
    - Responds in English

- [ ] **Multi-Turn Conversation**
  - Select Marathi
  - Message 1: "कृषि सलाह दो" → Response in Marathi
  - Message 2: "लेकिन अंग्रेजी में समझाओ" → Response in English
  - Message 3: "अगला सवाल" → Response reverts to Marathi

- [ ] **All 90+ Languages**
  - Sample 10-15 languages from different regions
  - Verify responses work in each language

---

## Debug Mode

### Enable Detailed Logging
```typescript
// In app/lib/languageOverrideDetection.ts
const DEBUG = true;  // Set to true

// Or in browser console
localStorage.setItem('DEBUG_LANGUAGE', 'true');
```

### Check Logs
```
Browser Console:
[LANGUAGE] Input: "Explain GST in English"
[LANGUAGE] Override detected: { language: 'en', confidence: 0.95 }
[LANGUAGE] Base query: "Explain GST"
[LANGUAGE] Response language: English (override)
[LANGUAGE] System prompt: [LANGUAGE ENFORCEMENT - OVERRIDE MODE]...
```

---

## Sample Test Queries by Language

### English
```
- "Explain agricultural subsidies"
- "Which crops suit my region?"
- "What is MSP?"
- "Explain GST in Hindi"  // Override
```

### Hindi
```
- "कृषि अनुदान क्या होते हैं"
- "मेरे क्षेत्र के लिए कौन सी फसलें अच्छी हैं"
- "MSP क्या है"
- "GST को अंग्रेजी में समझाओ"  // Override
```

### Telugu
```
- "పంటుల కూడా విధానం ఏమిటి"
- "నా ప్రాంతానికి ఏ పంటలు వెలుగుతాయి"
- "కర్మాంటీకరణ ప్రక్రియ"
- "Explain system in English"  // Override (mixed)
```

### Tamil
```
- "விவசாய மானியம் என்றால் என்ன"
- "என் பகுதிக்கு எந்தப் பயிர்கள் ஏற்றம்"
- "MSP என்றால் என்ன"
- "Explain in English"  // Override
```

### Gujarati
```
- "ખેતી સબસિડી શું છે"
- "મારા વિસ્તાર માટે કયા પાક વધવું જોઈએ"
- "MSP શું છે"
- "In English explain"  // Override
```

### Marathi
```
- "शेतीचे अनुदान काय आहे"
- "माझ्या भागासाठी कोणते पीक चांगले आहे"
- "MSP म्हणजे काय"
- "अंग्रेजीत समजाव"  // Override
```

### Spanish
```
- "¿Qué son los subsidios agrícolas?"
- "¿Qué cultivos son adecuados para mi región?"
- "¿Qué es APOYO?"
- "Explain in English"  // Override
```

### French
```
- "Qu'est-ce que les subventions agricoles?"
- "Quelles cultures conviennent à ma région?"
- "Qu'est-ce que l'AIDE?"
- "En angais, explique"  // Override
```

### Chinese (Simplified)
```
- "农业补贴是什么"
- "我地区适合种什么庄稼"
- "什么是最低收购价"
- "用英语解释"  // Override
```

### Arabic
```
- "ما هي إعانات الزراعة"
- "ما المحاصيل المناسبة لمنطقتي"
- "ما هو الحد الأدنى للسعر"
- "اشرح باللغة الإنجليزية"  // Override
```

---

## Expected Behavior Matrix

| Scenario | Input Language | UI Language | Override | Expected Response Language |
|----------|---|---|---|---|
| 1 | English | Thai | None | Thai |
| 2 | English | Thai | "in English" | English |
| 3 | Hindi | Gujarati | None | Gujarati |
| 4 | Marathi | Hindi | "explain in Tamil" | Tamil |
| 5 | Tamil | English | None | English |
| 6 | German | German | "in Spanish" | Spanish |
| 7 | Arabic | French | None | French |
| 8 | Chinese | Urdu | "in Punjabi" | Punjabi |

---

## Performance Benchmarks

### Expected Times (in milliseconds)
| Operation | Expected | Acceptable |
|-----------|----------|-----------|
| Override detection | <1 | <5 |
| Language identification | <50 | <200 |
| Translate to English | 200-500 | <1000 |
| AI reasoning | 1000-5000 | <10000 |
| Translate to target | 200-500 | <1000 |
| Total response | 1400-6500 | <12000 |

---

## Known Limitations & Workarounds

### 1. Complex Mixed-Language Queries
**Issue**: Queries mixing 3+ languages might confuse detection
**Example**: "हिंदी में explain करो what is GST, लेकिन English में answer दो"
**Workaround**: Keep override request in one language

### 2. Dialect Variations
**Issue**: Some dialects not in language list (e.g., Brazilian Portuguese vs European)
**Workaround**: Uses closest match

### 3. Ambiguous Language Names
**Issue**: "Chinese" could mean Simplified or Traditional
**Detection**: Defaults to Simplified (most common)
**Workaround**: User can specify "Chinese Traditional"

### 4. Very Long Queries
**Issue**: Override detection might miss pattern in 10000+ char text
**Workaround**: Keep queries concise

---

## Debugging Checklist

If feature not working:

- [ ] Check browser console for errors
- [ ] Verify AWS Translate credentials configured
- [ ] Check `languageConfig.ts` has 90+ languages
- [ ] Ensure `languageOverrideDetection.ts` imported correctly
- [ ] Test override detection in isolation: `detectLanguageOverride("test in English")`
- [ ] Check network tab for API failure
- [ ] Verify localStorage saving language preference

---

## Success Criteria

✅ **Full Feature Complete When**:
1. All 90+ languages load from dropdown
2. Each language works for default responses
3. Override detection works for 10+ languages
4. Override reverts correctly after response
5. Performance acceptable (<2sec end-to-end)
6. No errors in browser console
7. localStorage saves and restores preference

---

## Regression Testing After Each Engine Update

After modifying any engine (NYAYA, UDYOG, etc.):

```
[ ] Default language works: Hindi
[ ] Override works: "in English"
[ ] Multi-turn conversation maintains language state
[ ] Engine output respects system prompt language rules
[ ] No mixed-language response (e.g., doesn't mix Tamil + English)
```

---

## User Acceptance Testing (UAT)

### Test Round 1: Basic Functionality
- [ ] 5 users test in their native language
- [ ] 5 users test override feature
- [ ] Collect feedback on accuracy

### Test Round 2: Performance
- [ ] Measure response times
- [ ] Test on slow connection (throttle to 3G)
- [ ] Ensure no timeouts

### Test Round 3: Edge Cases
- [ ] Very long queries (>5000 chars)
- [ ] Mixed language inputs
- [ ] Rapid language switching
- [ ] 10+ turn conversations

---

## Production Rollout Checklist

- [ ] All 90+ languages tested
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness tested
- [ ] AWS Translate quotas verified
- [ ] Cache configuration optimized
- [ ] Monitoring alerts set up
- [ ] Documentation updated
- [ ] User training completed

---

**Last Updated**: [Current Date]
**Feature Status**: ✅ Ready for Testing

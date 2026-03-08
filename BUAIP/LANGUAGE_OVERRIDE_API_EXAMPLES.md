# Language Override Feature - API Examples & Responses

## Complete Request/Response Examples

### Example 1: Default Behavior (No Override)

#### Request
```bash
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userMessage": "What are the MSP rates for wheat?",
    "selectedLanguage": "hi",
    "userId": "user123",
    "conversationHistory": []
  }'
```

#### Response
```json
{
  "response": "गेहूँ के लिए न्यूनतम समर्थन मूल्य (MSP) वर्तमान में प्रति क्विंटल ₹2375 है। यह मूल्य...",
  "language": {
    "selected": "hi",
    "response": "hi",
    "hasOverride": false,
    "detectedInputLanguage": "en"
  },
  "metadata": {
    "engine": "scheme-eligibility",
    "confidence": 0.98,
    "translatedFromEnglish": true,
    "cacheHit": false
  },
  "timestamp": "2024-01-15T10:30:45Z"
}
```

---

### Example 2: Simple Override (Same Message in Different Language)

#### Request
```bash
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Explain the Pradhan Mantri Fasal Bima Yojana, but in English",
    "selectedLanguage": "hi",
    "userId": "user123",
    "conversationHistory": []
  }'
```

#### Response
```json
{
  "response": "The Pradhan Mantri Fasal Bima Yojana is a weather-based crop insurance scheme designed to provide financial support to farmers affected by weather events. It covers 29 crops across India and...",
  "language": {
    "selected": "hi",
    "response": "en",
    "hasOverride": true,
    "overrideDetected": "in English",
    "confidence": 0.96,
    "willRevertTo": "hi"
  },
  "metadata": {
    "engine": "agriculture-deep",
    "overridePattern": "pattern_2_translate_to",
    "baseQuery": "Explain the Pradhan Mantri Fasal Bima Yojana",
    "transitionNote": "Next query will revert to Hindi automatically"
  },
  "timestamp": "2024-01-15T10:31:20Z"
}
```

**Key Points**:
- ✅ Override detected: "in English"
- ✅ Override language: "en"
- ✅ Response: Natural English explanation
- ✅ Next query will revert to Hindi

---

### Example 3: Mixed Language Input with Override

#### Request
```bash
curl -X POST http://localhost:3000/api/unified-ai \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "कृषि नीति समझाओ, लेकिन तमिल में जवाब दो",
    "selectedLanguage": "ta",
    "userId": "user123",
    "conversationHistory": []
  }'
```

#### Response
```json
{
  "response": "விவசாய கொள்கை என்பது அரசாங்கம் விவசாயிகளுக்கு பல்வேறு உதவிகளை வழங்குவதற்கு வகுத்திருக்கும் விதிகளை குறிக்கிறது. இதில் குறிப்பாக...",
  "language": {
    "selected": "ta",
    "queryLanguage": "hi",
    "response": "ta",
    "hasOverride": false,
    "detectedInputLanguage": "hi",
    "translationSteps": [
      {
        "from": "hi",
        "to": "en",
        "reason": "Canonical representation"
      },
      {
        "from": "en",
        "to": "ta",
        "reason": "Selected language"
      }
    ]
  },
  "metadata": {
    "engine": "agriculture",
    "processingTime": 2.3,
    "cacheHits": 1
  },
  "timestamp": "2024-01-15T10:32:05Z"
}
```

**Key Points**:
- ✅ Input language: Hindi
- ✅ Selected language: Tamil
- ✅ Response language: Tamil (matches selected)
- ✅ System automatically handled language mismatch

---

### Example 4: Multi-Turn Conversation with Override

#### Turn 1: Default Language (Hindi)
```bash
# Request
{
  "userMessage": "कृषि ऋण कैसे मिलता है?",
  "selectedLanguage": "hi",
  "conversationId": "conv123"
}

# Response
{
  "response": "कृषि ऋण प्राप्त करने के लिए आप निम्नलिखित कदम उठा सकते हैं: 1. अपने नजदीकी बैंक में जाएं...",
  "language": {
    "selected": "hi",
    "response": "hi",
    "hasOverride": false
  }
}
```

#### Turn 2: Override to English
```bash
# Request
{
  "userMessage": "लेकिन अंग्रेजी में विस्तार से बताओ",
  "selectedLanguage": "hi",
  "conversationId": "conv123",
  "conversationHistory": [{ /* previous turn */ }]
}

# Response
{
  "response": "Agricultural loans are provided by various financial institutions in India. The primary types include: 1. Crop loans - short term...",
  "language": {
    "selected": "hi",
    "response": "en",
    "hasOverride": true,
    "overrideDetected": "in English",
    "willRevertTo": "hi"
  }
}
```

#### Turn 3: Auto-Revert to Hindi
```bash
# Request
{
  "userMessage": "और प्राकृतिक आपदा से बचाव?",
  "selectedLanguage": "hi",
  "conversationId": "conv123",
  "conversationHistory": [{ /* turns 1-2 */ }]
}

# Response (Automatically in Hindi)
{
  "response": "प्राकृतिक आपदा से बचाव के लिए सरकार ने प्रधान मंत्री फसल बीमा योजना शुरू की है, जो...",
  "language": {
    "selected": "hi",
    "response": "hi",
    "previousWasOverride": true,
    "hasOverride": false,
    "note": "Reverted to selected language (Hindi) automatically"
  }
}
```

**Key Points**:
- ✅ Turn 1: Hindi (default)
- ✅ Turn 2: English (override)
- ✅ Turn 3: Hindi (auto-revert)
- ✅ System maintains state across turns

---

### Example 5: All 90+ Languages

#### Spanish
```bash
# Request
{
  "userMessage": "¿Cuáles son los esquemas de subsidios agrícolas en la India?",
  "selectedLanguage": "es"
}

# Response
{
  "response": "Los principales esquemas de subsidios agrícolas en India son: 1. Programa de precio de apoyo mínimo...",
  "language": {
    "selected": "es",
    "response": "es"
  }
}
```

#### Chinese (Simplified)
```bash
# Request
{
  "userMessage": "印度的主要农业补贴方案是什么?",
  "selectedLanguage": "zh"
}

# Response
{
  "response": "印度的主要农业补贴计划包括: 1. 最低支持价格 (MSP) 计划...",
  "language": {
    "selected": "zh",
    "response": "zh"
  }
}
```

#### Arabic
```bash
# Request
{
  "userMessage": "اشرح برنامج بीमة المحاصيل الرئيسي في الهند",
  "selectedLanguage": "ar"
}

# Response
{
  "response": "برنامج بيمة المحاصيل الرئيسي في الهند هو برنامج رئيس الوزراء لتأمين المحاصيل (PMFBY)...",
  "language": {
    "selected": "ar",
    "response": "ar"
  }
}
```

#### Portuguese
```bash
# Request
{
  "userMessage": "Quais são os principais esquemas de subsídios agrícolas na Índia?",
  "selectedLanguage": "pt"
}

# Response
{
  "response": "Os principais esquemas de subsídios agrícolas na Índia são: 1. Programa de Preço de Apoio Mínimo...",
  "language": {
    "selected": "pt",
    "response": "pt"
  }
}
```

---

### Example 6: Override Variations

#### Variation 1: "in [Language]"
```bash
{
  "userMessage": "Explain MSP in German",
  "selectedLanguage": "hi"
}
# Response will be in German
```

#### Variation 2: "translate to [Language]"
```bash
{
  "userMessage": "translate the scheme details to French",
  "selectedLanguage": "ta"
}
# Response will be in French
```

#### Variation 3: "[Language] version"
```bash
{
  "userMessage": "Give me the Spanish version of this explanation",
  "selectedLanguage": "en"
}
# Response will be in Spanish
```

#### Variation 4: "say in [Language]"
```bash
{
  "userMessage": "say it in Russian",
  "selectedLanguage": "gu"
}
# Response will be in Russian
```

#### Variation 5: "respond in [Language]"
```bash
{
  "userMessage": "respond in Swedish",
  "selectedLanguage": "mr"
}
# Response will be in Swedish
```

---

### Example 7: Error Handling

#### Language Not Found
```bash
# Request with invalid language
{
  "userMessage": "Explain in Klingon",  # Not a real language in config
  "selectedLanguage": "hi"
}

# Response
{
  "response": "I couldn't recognize 'Klingon' as a valid language. Did you mean one of these? [List of similar languages]. Please try again with a supported language.",
  "language": {
    "selected": "hi",
    "response": "hi",
    "hasOverride": false,
    "error": "language_not_recognized",
    "supportedLanguages": ["en", "es", "fr", "de", ...]
  }
}
```

#### Translation Service Timeout
```bash
# Response if AWS Translate times out
{
  "response": "I understand you asked for [language], but translation service is currently unavailable. I'm providing the response in your selected language (Hindi) instead.",
  "language": {
    "selected": "hi",
    "requested": "es",
    "response": "hi",
    "hasOverride": true,
    "overrideFailed": true,
    "reason": "translation_timeout",
    "fallbackLanguage": "hi"
  },
  "metadata": {
    "warning": "Translation service unavailable, used fallback language"
  }
}
```

---

### Example 8: Workflow - Complete Request/Response Cycle

#### Initial Setup
```javascript
// User selects Gujarati from dropdown
const store = {
  selectedLanguage: 'gu',  // Saved in localStorage
  conversationHistory: []
};
```

#### API Call Sequence
```javascript
// Call 1: User asks in English
const call1 = {
  userMessage: "What is Agricultural Income Support?",
  selectedLanguage: "gu"
};

// Response 1: In Gujarati
const response1 = {
  response: "કૃષિ આय સહાય સ્કીમ એક સરકારી પ્રોગ્રામ છે...",
  language: {
    selected: "gu",
    response: "gu",
    hasOverride: false
  }
};

// Call 2: Override to English
const call2 = {
  userMessage: "But explain in English",
  selectedLanguage: "gu",
  conversationHistory: [response1]
};

// Response 2: In English
const response2 = {
  response: "The Agricultural Income Support scheme is a government program...",
  language: {
    selected: "gu",
    response: "en",
    hasOverride: true,
    willRevertTo: "gu"
  }
};

// Call 3: Follow-up question
const call3 = {
  userMessage: "How do I apply?",
  selectedLanguage: "gu",
  conversationHistory: [response1, response2]
};

// Response 3: Auto-reverted to Gujarati
const response3 = {
  response: "તમે આ યોજનામાં અરજી કરવા માટે...",
  language: {
    selected: "gu",
    response: "gu",
    hasOverride: false,
    note: "Automatically reverted to selected language"
  }
};
```

---

## Response Object Structure

### Complete Response Schema
```typescript
interface UnifiedAIResponse {
  response: string;  // The actual response text
  
  language: {
    selected: string;              // User's UI language
    response: string;              // Language of this response
    queryLanguage?: string;        // Language of input query
    hasOverride: boolean;          // Was override requested?
    overrideDetected?: string;     // The override phrase
    confidence?: number;           // Confidence score (0-1)
    willRevertTo?: string;         // What language next query uses
    detectedInputLanguage?: string;// Detected query language
    previousWasOverride?: boolean; // Previous turn had override?
    translationSteps?: Array<{
      from: string;
      to: string;
      reason: string;
    }>;
  };
  
  metadata: {
    engine: string;                // Which engine processed it
    processingTime?: number;       // Time in ms
    cacheHit?: boolean;           // Was result cached?
    cacheHits?: number;           // Multiple cache hits
    warning?: string;             // Any warnings
    error?: string;               // Any errors
  };
  
  timestamp: string;  // ISO timestamp
}
```

---

## Testing with cURL or Postman

### Postman Collection

```json
{
  "name": "Language Override Tests",
  "item": [
    {
      "name": "Default Language",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/unified-ai",
        "body": {
          "mode": "raw",
          "raw": "{\"userMessage\": \"What is agriculture insurance?\", \"selectedLanguage\": \"hi\"}"
        }
      }
    },
    {
      "name": "Simple Override",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/unified-ai",
        "body": {
          "mode": "raw",
          "raw": "{\"userMessage\": \"But in English\", \"selectedLanguage\": \"hi\"}"
        }
      }
    }
  ]
}
```

---

## Integration with Frontend

### React Example
```typescript
import { useState } from 'react';

export function ChatComponent() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (userMessage: string) => {
    const response = await fetch('/api/unified-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        selectedLanguage,
        conversationHistory: messages
      })
    });
    
    const data = await response.json();
    
    // Handle language context
    if (data.language.hasOverride) {
      console.log(`Override detected: ${data.language.overrideDetected}`);
      console.log(`Will revert to ${data.language.selected} next turn`);
    }
    
    setMessages([...messages, {
      role: 'user',
      content: userMessage,
      language: data.language.queryLanguage
    }, {
      role: 'assistant',
      content: data.response,
      language: data.language.response
    }]);
  };
  
  return (
    <div>
      <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="es">Español</option>
        {/* 90+ languages */}
      </select>
      {/* Chat UI */}
    </div>
  );
}
```

---

## Performance Notes

- **Response Time Goal**: < 2 seconds end-to-end
- **Cache Hit**: ~10ms
- **Cache Miss**: 200-500ms (AWS call)
- **Typical**: 1-3 seconds depending on response length

---

## Debugging Tips

### Enable Console Logging
```typescript
// In app/lib/languageOverrideDetection.ts
const DEBUG = true;
```

### Check Browser Console
```
[LANGUAGE] Input: "Explain GST in English"
[LANGUAGE] Override detected: true
[LANGUAGE] Pattern: pattern_2_translate_to
[LANGUAGE] Override language: en
[LANGUAGE] Base query: "Explain GST"
[LANGUAGE] System prompt: [LANGUAGE ENFORCEMENT...]
```

### Check Response Metadata
```json
{
  "response": "...",
  "metadata": {
    "engine": "scheme-eligibility",
    "processingTime": 2.3,
    "cacheHit": false,
    "cacheHits": 1
  }
}
```

---

**Status**: ✅ Ready for Implementation
**Language Support**: 90+
**Override Patterns**: 5 variations supported

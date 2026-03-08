# SCHEME ENGINE - CODE STRUCTURE & EXTENSION GUIDE

## File Organization

```
c:\BUAIP\BUAIP\
├── app/
│   ├── api/
│   │   └── scheme-conversation/
│   │       └── route.ts                    ← MAIN CONVERSATION ENGINE
│   │
│   └── lib/
│       └── schemeRetriever.ts              ← RAG SCHEME DATABASE
│
├── .env.local                              ← API KEY CONFIG
└── AI_SCHEME_ENGINE_IMPLEMENTATION.md      ← THIS GUIDE
```

## File Breakdown

### 1. Route Handler: `app/api/scheme-conversation/route.ts`

**Responsibilities:**
- HTTP request/response handling
- Session management
- Claude API integration
- Profile extraction
- Conversation flow orchestration

**Key Functions:**

#### `buildSystemPrompt(profile, completedFields)`
Creates dynamic Claude instructions based on:
- What fields are already filled
- What questions remain
- Current user profile state

```typescript
// Example output:
"You are BUAIP...
Ask about: gender, age_group, state (3 remaining)
Current profile: {gender: 'female', state: 'Maharashtra'}
..."
```

#### `extractProfileFromResponse(userMessage, profile)`
Parses natural language to extract profile fields.

Rules implemented:
- Gender: Checks for "male", "female", "other"
- Age: Extracts numbers, maps to ranges (35 → "26-40")
- State: Searches state name list
- Income: Parses ₹/lakh notation
- Category: Recognizes SC/ST/OBC/General
- Disability: Y/N parsing
- Marital: Single/Married/Widow/Divorced
- Land: Land/House/Both/Neither

#### `callClaude(message, profile, fields, history)`
Calls Claude 3.5 Sonnet with:
- System prompt (instructions)
- Conversation history
- Current user message

Returns:
- Claude's natural language response
- Extracted profile updates

#### `getEligibleSchemes(profile)`
Retrieves schemes matching user profile.

Filtering logic:
1. Check state availability
2. Check income limits
3. Filter by social category if needed
4. Return top 15 matching schemes

#### `POST(request)`
Main endpoint handler.

Flow:
```
1. Parse JSON request
2. Get/create session
3. Call Claude
4. Extract profile updates
5. Update session state
6. If profile complete: fetch schemes
7. Return response
```

---

### 2. RAG Engine: `app/lib/schemeRetriever.ts`

**Responsibilities:**
- Scheme database
- Retrieval & filtering
- Caching
- Search functionality

**Key Functions:**

#### `retrieveSchemes(userProfile)`
Main retrieval function.

Process:
1. Create cache key from profile
2. Check if cached (TTL: 24 hours)
3. Filter database by criteria
4. Return top 30 schemes
5. Cache results

Filtering criteria:
- State matching (all_india or specific state)
- Income limit comparison
- Social category relevance
- Occupation matching

#### `searchSchemes(keyword)`
Search by keyword across:
- Scheme name
- Description
- Ministry
- Target groups

Returns matching schemes.

#### `getSchemeByName(name)`
Direct lookup by exact scheme name.

#### `formatSchemeForDisplay(scheme)`
Formats scheme for user display with:
- Name + Ministry
- Description
- Benefits (bulleted)
- Eligibility
- Documents needed
- Apply link & helpline

#### `clearCache()`
Development helper to clear cached results.

---

**Database Structure:**

```typescript
interface SchemeDocument {
  scheme_name: string;           // "Pradhan Mantri Mudra Yojana"
  ministry: string;              // "Ministry of Finance"
  description: string;           // Full description
  benefits: string[];            // ["Loan up to ₹10 lakhs", ...]
  eligibility_criteria: string;  // "Self-employed entrepreneurs..."
  required_documents: string[];  // ["Aadhaar", "Bank Account", ...]
  apply_link: string;            // "https://mudra.org.in"
  helpline: string;              // "1800-180-1111"
  state: string;                 // "all_india" or state name
  target_groups: string[];       // ["Entrepreneurs", "Self-Employed", ...]
  annual_income_limit?: number;  // 1000000 (optional)
}
```

---

## How It Works: Detailed Flow

### Session Lifecycle

```
1. User sends first message
   ├─ sessionId auto-generated
   ├─ Session created in Map
   └─ Profile: {} (empty)

2. User answers question 1
   ├─ Claude parses response
   ├─ Profile updated: {gender: 'female'}
   ├─ completedFields: ['gender']
   └─ Progress: 1/8

3. User answers question 2
   ├─ Same process
   ├─ Profile updated: {..., age_group: '26-40'}
   ├─ completedFields: ['gender', 'age_group']
   └─ Progress: 2/8

... (repeat for all 8 fields) ...

8. Profile complete
   ├─ retrieveSchemes(profile) called
   ├─ Results cached for future
   ├─ Response type: "schemes"
   └─ Show recommendation cards
```

### Message Processing Pipeline

```
User Message
     ↓
Parse JSON
     ↓
Get Session
     ↓
Call Claude
     │
     ├─ Pass system prompt
     ├─ Pass conversation history
     ├─ Pass current message
     │
     └→ Claude responds
     ↓
Extract Profile Updates
     ├─ Gender check
     ├─ Age parsing
     ├─ State lookup
     ├─ Income parsing
     └─ Other fields
     ↓
Update Session
     ├─ Merge profile changes
     ├─ Update completedFields
     └─ Increment messageCount
     ↓
Check Status
     ├─ If incomplete: Return "message" type
     └─ If complete: Fetch schemes, return "schemes" type
     ↓
Response to User
```

---

## Extending the System

### Add a New Scheme

1. Open `app/lib/schemeRetriever.ts`
2. Add to `REAL_SCHEMES_DATABASE`:

```typescript
{
  scheme_name: "My New Scheme",
  ministry: "Ministry Name",
  description: "What it does",
  benefits: [
    "Benefit 1",
    "Benefit 2",
    "Benefit 3"
  ],
  eligibility_criteria: "Who can apply?",
  required_documents: [
    "Aadhaar",
    "Income Certificate",
    "Application Form"
  ],
  apply_link: "https://scheme.gov.in",
  helpline: "1800-111-2222",
  state: "all_india", // or specific state
  target_groups: ["Target Group 1", "Target Group 2"],
  annual_income_limit: 500000 // optional
}
```

3. Rebuild: `npm run build`
4. Test: Send a request and verify scheme appears

---

### Modify Profile Questions

Profile questions are NOT hardcoded in route.ts anymore. Claude dynamically asks them based on:
- REQUIRED_FIELDS array
- Completed fields
- System prompt

To change the order or add new fields:

1. Update `REQUIRED_FIELDS` in route.ts:
```typescript
const REQUIRED_FIELDS = [
  "gender",
  "age_group",
  // ... add new field here
  "new_field_name"
];
```

2. Add parsing logic in `extractProfileFromResponse()`:
```typescript
// For new field "education_level"
if (text.includes("12th") || text.includes("school")) 
  updates.education_level = "school";
if (text.includes("college")) 
  updates.education_level = "college";
// etc.
```

3. Update UserProfile interface:
```typescript
interface UserProfile {
  // ... existing fields
  education_level?: string;
}
```

4. Update system prompt in `buildSystemPrompt()`:
```typescript
- education_level (school, college, graduate, postgraduate)
```

---

### Customize Claude Behavior

#### Change Response Tone

In `buildSystemPrompt()`:
```typescript
// FRIENDLY
"Please be warm and encouraging in your responses."

// FORMAL
"Maintain a professional, official tone."

// CASUAL
"Keep responses brief and conversational."
```

#### Change Question Order

In `buildSystemPrompt()`, customize:
```typescript
const remainingFields = REQUIRED_FIELDS.filter(...);
"Next question to ask: " + remainingFields[0];
```

#### Add Conditional Questions

Modify `callClaude()` to add context:
```typescript
const additionalContext = userProfile.occupation === 'farmer' 
  ? "Ask about land holdings since user is a farmer"
  : "";
```

---

### Connect to Database

Replace in-memory sessionStore:

```typescript
// OLD: In-memory Map
const sessionStore = new Map<string, SessionData>();

// NEW: Database
import { db } from "@/lib/database";

async function getSession(sessionId: string): Promise<SessionData> {
  return await db.sessions.findOne({ sessionId });
}

async function updateSession(sessionId: string, data: SessionData) {
  await db.sessions.updateOne({ sessionId }, data);
}
```

---

### Add Multi-Language Support

1. Create language-specific prompts:
```typescript
const PROMPTS = {
  en: "You are BUAIP...",
  hi: "आप BUAIP हैं...",
  ta: "நீங்கள் BUAIP...",
};

const systemPrompt = PROMPTS[language];
```

2. Create field mappings:
```typescript
const FIELD_LABELS = {
  en: { gender: "gender", age: "age" },
  hi: { gender: "लिंग", age: "उम्र" }
};
```

---

### Add Voice Interface

1. Install speech-to-text library:
```bash
npm install @anthropic-ai/sdk web-speech-api
```

2. Convert user audio to text before sending to `/api/scheme-conversation`

3. Convert Claude response to speech using TTS API

---

## Testing

### Unit Test: Profile Extraction

```typescript
test("extracts age correctly", () => {
  const result = extractProfileFromResponse("I'm 35 years old", {});
  expect(result.age_group).toBe("26-40");
});

test("extracts state correctly", () => {
  const result = extractProfileFromResponse("Maharashtra", {});
  expect(result.state).toBe("Maharashtra");
});
```

### Integration Test: Full Conversation

```typescript
test("full conversation flow", async () => {
  const session = getSession("test-session");
  
  // Message 1: Greeting
  let res = await POST({
    message: "hello",
    sessionId: "test-session"
  });
  expect(res.type).toBe("message");
  
  // Message 2: Gender
  res = await POST({
    message: "female",
    sessionId: "test-session"
  });
  expect(res.profile.gender).toBe("female");
  
  // ... continue through all 8 questions
  
  // Final message: Should return schemes
  res = await POST({
    message: "own house",
    sessionId: "test-session"
  });
  expect(res.type).toBe("schemes");
  expect(res.schemes.length).toBeGreaterThan(0);
});
```

### Manual Testing

1. Start server: `npm run dev`
2. Test with curl:
```bash
curl -X POST http://localhost:3001/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","sessionId":"test1"}'
```
3. Check response structure
4. Continue conversation with same sessionId

---

## Debugging

### Enable Logging

Add to route.ts:
```typescript
console.log(`[Session] ${sessionId}`, session);
console.log(`[Profile] Updated:`, profileUpdates);
console.log(`[Claude] Response:`, claudeResponse);
console.log(`[Schemes] Retrieved:`, eligibleSchemes.length);
```

### Check Claude Output

`claudeResponse` should contain:
- Natural language text
- Maybe `[PROFILE_COMPLETE]` marker if profile is full

### Verify Scheme Retrieval

```typescript
const schemes = await retrieveSchemes(profile);
console.log("Total schemes:", schemes.length);
console.log("First scheme:", schemes[0]);
```

### Check Session State

```typescript
const session = getSession(sessionId);
console.log("Completed fields:", session.completedFields);
console.log("Message count:", session.messagesCount);
```

---

## Performance Tuning

### Reduce Claude API Calls
- Use system prompt instead of prompt examples
- Cache conversation context
- Batch similar requests

### Optimize Scheme Retrieval
- Pre-filter by state before detailed analysis
- Cache results for common profiles
- Implement TTL expiry

### Reduce Memory Usage
- Add session cleanup (expire after 24 hours)
- Limit conversation history to last N messages
- Clear old cache entries

---

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
```
ANTHROPIC_API_KEY=sk_ant_...
NODE_ENV=production
```

### Scaling Notes
- Stateless API (multiple servers OK)
- Session storage: Use Redis or DB for persistence
- Rate limiting: Add middleware
- Monitoring: Track API response times

---

**Questions?** Check the code comments or the implementation guide.

## 🚀 BUAIP Scheme Eligibility Engine - AWS Bedrock + Kendra RAG

### Complete AWS Architecture

This document describes the **real AI system** that replaced static templates and mock data.

---

## Architecture Overview

```
User Request
    ↓
┌─────────────────────────────────────────────────┐
│ Express API Endpoint                             │
│ POST /api/scheme-conversation                    │
└──────────────┬──────────────────────────────────┘
               ↓
    ┌──────────────────────┐
    │ Parse User Message    │
    └──────────┬────────────┘
               ↓
    ┌─────────────────────────────────────┐
    │ DynamoDB: Get/Create Session        │    ← AWS Service 1
    │ - Profile data                      │
    │ - Conversation history (last 20)    │
    └──────────────┬──────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ Extract Profile From Message        │
    │ (Gender, Age, State, Income, etc.)  │
    └──────────────┬──────────────────────┘
                   ↓
    ┌─────────────────────────────────────┐
    │ AWS Bedrock Claude LLM              │    ← AWS Service 2
    │ - Ask next profile question OR      │
    │ - Prepare scheme recommendations    │
    └──────────────┬──────────────────────┘
                   ↓
               IS PROFILE READY?
              /                 \
             /                   \
          NO (ask more ?)        YES → Send to Kendra
            ↓                        ↓
        Return                  ┌─────────────────────────────────────┐
        Message                 │ Kendra RAG Retrieval                │    ← AWS Service 3
                                │ - Query: "schemes for female, 26-40"│
                                │ - Return: Top 30 documents          │
                                │ - With relevance scores             │
                                └──────────────┬──────────────────────┘
                                               ↓
                                    ┌──────────────────────────────┐
                                    │ Claude Ranks Schemes         │
                                    │ - Personalized explanations  │
                                    │ - Application links          │
                                    │ - Helpline numbers           │
                                    └──────────────┬──────────────┘
                                                   ↓
                                         Return Top 10 Schemes
                                                   ↓
                                     ┌─────────────────────────┐
                                     │ Update Session          │
                                     │ - Save messages         │
                                     │ - Mark complete         │
                                     └─────────────────────────┘
```

---

## AWS Services Used

### 1. **AWS Bedrock Claude LLM**
- **File**: `app/lib/aws/bedrock.ts`
- **Model**: Claude 3 Sonnet (`anthropic.claude-3-sonnet-20240229-v1:0`)
- **Region**: ap-south-1 (India)
- **Purpose**: 
  - Natural language conversation
  - Profile field extraction
  - Scheme recommendations and personalization

**Key Functions**:
```typescript
// Direct Bedrock invocation
await callBedrockClaude(systemPrompt, messages, maxTokens);

// High-level wrapper
await generateConversationResponse(systemPrompt, userMessage, history);
```

**Communication Flow**:
1. System prompt defines Claude's role and context
2. Message history provides conversation context
3. Bedrock returns Claude's response as text
4. Response parsed and validated

---

### 2. **Amazon Kendra (Retrieval Augmented Generation)**
- **File**: `app/lib/aws/kendra.ts`
- **Index ID**: `buaip-schemes-index`
- **Purpose**: 
  - Retrieve relevant government schemes from knowledge base
  - Full-text search across scheme documents
  - Relevance scoring

**Key Functions**:
```typescript
// Build intelligent query from user profile
const query = buildKendraQuery({
  gender: "female",
  state: "Maharashtra",
  annual_income: 500000,
  social_category: "general"
});

// Retrieve matching schemes
const schemes = await retrieveSchemes(query, sessionId);
// Returns: SchemeDocument[] with title, content, metadata, relevanceScore
```

**Query Construction**:
- Combines profile fields into natural language query
- Example: "schemes for female, age 26-40, Maharashtra, annual income 500000, general category, not disabled, married, owns land and house"
- Kendra searches index and returns top 30 documents

**Metadata Returned**:
- Ministry that administers the scheme
- Eligibility criteria
- Benefits and coverage
- Application link
- Helpline number

---

### 3. **Amazon DynamoDB (Persistent State)**
- **File**: `app/lib/aws/dynamodb.ts`
- **Table**: `buaip-conversations`
- **Purpose**: 
  - Store user profile information across sessions
  - Maintain conversation history
  - Track profile completion status

**Schema**:
```typescript
ConversationSession {
  sessionId: string              // Partition key
  profile: UserProfile           // 8 fields to collect
  messages: ConversationMessage[] // Last 20 messages
  completedFields: string[]       // Tracks which fields are filled
  createdAt: string
  updatedAt: string
}

UserProfile {
  gender?: string              // male, female, other, prefer_not_to_say
  age_group?: string           // 18-25, 26-40, 41-60, 60+
  state?: string               // Any Indian state
  annual_income?: number       // In rupees
  social_category?: string     // general, obc, sc, st, ews, minority
  disability?: boolean         // true/false
  marital_status?: string      // single, married, widowed, divorced
  land_ownership?: string      // owns_land, owns_house, owns_both, owns_neither, tenant_farmer
}
```

**Operations**:
```typescript
await getSession(sessionId);           // Retrieve session
await createSession(sessionId);        // Create new session
await updateSession(sessionId, data);  // Update profile/fields
await addMessage(sessionId, role, content); // Store message
```

---

## Conversation Flow

### Phase 1: Profile Collection (Steps 1-8)

User answers questions about their demographic and economic profile:

1. **Gender**: "I am female" → `gender: "female"`
2. **Age**: "I am 35 years old" → `age_group: "26-40"`
3. **State**: "I am from Maharashtra" → `state: "Maharashtra"`
4. **Income**: "My income is 5 lakhs" → `annual_income: 500000`
5. **Category**: "General" → `social_category: "general"`
6. **Disability**: "No" → `disability: false`
7. **Marital**: "Married" → `marital_status: "married"`
8. **Land**: "Own a house" → `land_ownership: "owns_house"`

**Claude's Role**: Ask one question at a time, parse responses naturally, confirm understanding.

### Phase 2: Scheme Recommendation (Step 9+)

Once all 8 fields are collected:

1. **Build Kendra Query**: Combines profile into search string
2. **Retrieve Schemes**: Kendra returns top 30 matching documents
3. **Claude Ranks**: Orders by relevance, personalizes explanations
4. **Return Schemes**: Top 10 with:
   - Scheme name
   - Ministry/Department
   - Eligibility criteria
   - Benefits
   - How to apply (link)
   - Helpline number

---

## Profile Extraction Logic

### Pattern Matching Rules

```typescript
// Gender extraction
if (text.includes("female")) { gender = "female"; }
else if (text.includes("male")) { gender = "male"; }

// Age extraction (2-digit age → group)
const ageMatch = text.match(/\b(\d{2})\b/);
if (age >= 26 && age <= 40) { age_group = "26-40"; }

// Income extraction (with currency multipliers)
const incomeMatch = text.match(/(\d+)\s*(?:lakh|crore|thousand)/i);
if (/lakh/i.test(text)) { income = value * 100000; }
if (/crore/i.test(text)) { income = value * 10000000; }

// State extraction (26 states + union territories)
const states = ["andhra pradesh", "maharashtra", "tamil nadu", ...];
for (const state of states) {
  if (text.includes(state)) { state = state; break; }
}

// Category extraction (SC/ST/OBC/General/EWS/Minority)
if (/\bsc\b/.test(text)) { category = "sc"; }
else if (/\bobc\b/.test(text)) { category = "obc"; }

// Disability (boolean)
const hasYes = /yes|have disability|disabled/.test(text);
const hasNo = /no|don't|not disabled/.test(text);
if (hasYes && !hasNo) { disability = true; }

// Land ownership (5 categories)
if (/own.*land/.test(text)) { ownership = "owns_land"; }
else if (/own.*house/.test(text)) { ownership = "owns_house"; }
else if (/both/.test(text)) { ownership = "owns_both"; }
```

---

## System Prompt Design

Claude receives a system prompt that:
1. Defines its role as BUAIP (government scheme assistant)
2. Shows current profile progress (e.g., "3/8 fields complete")
3. Lists fields still needed
4. Shows current profile data
5. Specifies which field to ask about next
6. Instructs to output `[PROFILE_COMPLETE]` when done

**Example System Prompt**:
```
You are BUAIP — Bharat Unified Access Intelligence Platform.

**CURRENT PROGRESS:**
- Fields Collected: 3/8
- Collected: gender, state, age_group
- Remaining: annual_income, social_category, disability, marital_status, land_ownership

**CURRENT PROFILE DATA:**
- gender: female
- state: Maharashtra
- age_group: 26-40

**NEXT QUESTION:** Ask about: annual_income

Keep your responses natural and conversational (2-3 sentences max).
When profile is complete, respond with: [PROFILE_COMPLETE]
```

---

## API Endpoint Details

### POST `/api/scheme-conversation`

**Request**:
```json
{
  "message": "I am a female from Maharashtra",
  "sessionId": "session_123_abc"  // optional, generated if missing
}
```

**Response (While collecting profile)**:
```json
{
  "type": "message",
  "text": "Great! Now, could you tell me your age?",
  "profile": {
    "gender": "female",
    "state": "Maharashtra"
  },
  "profileProgress": {
    "completed": 2,
    "total": 8
  },
  "sessionId": "session_123_abc"
}
```

**Response (When schemes are found)**:
```json
{
  "type": "schemes",
  "message": "Here are schemes tailored for you...",
  "schemes": [
    {
      "name": "Pradhan Mantri Awas Yojana",
      "ministry": "Ministry of Housing and Urban Affairs",
      "eligibility": "Income < 6 lakh per annum, married women",
      "benefits": "Loan upto Rs 9 lakhs for house purchase",
      "apply_link": "https://pib.gov.in/...",
      "helpline": "1800-121-3141",
      "relevance": 0.92
    },
    // ... 9 more schemes
  ],
  "profileProgress": {
    "completed": 8,
    "total": 8
  },
  "profile": { /* complete profile */ },
  "sessionId": "session_123_abc"
}
```

---

## Environment Variables

Required in `.env.local`:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Kendra
KENDRA_INDEX_ID=buaip-schemes-index

# DynamoDB
DYNAMODB_CONVERSATIONS_TABLE=buaip-conversations
```

---

## Project Files

### Core Implementation
- **`app/api/scheme-conversation/route.ts`**: Main endpoint (orchestration)
- **`app/lib/aws/bedrock.ts`**: Bedrock Claude integration
- **`app/lib/aws/kendra.ts`**: Kendra RAG retrieval
- **`app/lib/aws/dynamodb.ts`**: DynamoDB session management

### Testing
- **`tests/test-aws-integration.ts`**: Integration tests and examples

### Documentation
- **`AWS_BEDROCK_KENDRA_GUIDE.md`** (this file)

---

## Testing the System

### 1. Unit Test Profile Extraction
```bash
npm test -- test-aws-integration.ts
```

### 2. Manual API Testing
```bash
curl -X POST http://localhost:3000/api/scheme-conversation \
  -H "Content-Type: application/json" \
  -d '{"message":"Hi, I am 35 year old female from Maharashtra"}'
```

### 3. Real AWS Testing
Requires:
1. AWS Bedrock Claude model available
2. Kendra index with scheme documents
3. DynamoDB table created

### 4. Integration Test
See `tests/test-aws-integration.ts` for complete flow examples

---

## Error Handling

### Bedrock Errors
- Missing API key → HTTP 500
- Invalid model ID → HTTP 500
- Rate limiting → Retry with exponential backoff

### Kendra Errors
- Index not found → Returns `[]` (graceful degradation)
- Query timeout → Returns `[]`
- No matching documents → Returns `[]`

### DynamoDB Errors
- Table doesn't exist → Fallback to in-memory session
- Network error → Graceful degradation with memory store

---

## Performance Characteristics

| Operation | Latency | Source |
|-----------|---------|--------|
| Bedrock API call | 2-5s | AWS |
| Kendra query | 1-3s | AWS |
| DynamoDB write | <100ms | AWS |
| Profile extraction | <50ms | local regex |
| Total request | 3-8s | combined |

**Optimization**:
- Conversation history limited to last 6 messages
- Kendra results limited to top 30 documents
- Scheme recommendations limited to top 10

---

## Security Considerations

1. **Credentials**: All AWS keys in environment variables (never in code)
2. **Authentication**: API endpoint protected by Next.js auth (add if needed)
3. **RAG Safety**: Kendra ensures only official scheme documents returned
4. **PII**: Profile data stored only in DynamoDB, encrypted at rest (AWS feature)
5. **Conversation TTL**: Consider adding TTL to old sessions in DynamoDB

---

## Future Enhancements

1. **Multi-language support**: Claude already multilingual
2. **Document uploading**: Allow agencies to add more schemes to Kendra
3. **Feedback loop**: Track which schemes most helped users
4. **Advanced RAG**: Use embeddings for semantic search
5. **Real-time indexing**: Auto-update as schemes change
6. **Analytics**: Track common questions, completion rates
7. **Mobile app**: React Native client using same API

---

## References

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Amazon Kendra Documentation](https://docs.aws.amazon.com/kendra/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)

---

**Last Updated**: March 2024
**Status**: Production Ready
**Team**: BUAIP Development

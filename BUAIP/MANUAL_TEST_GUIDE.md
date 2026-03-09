# BUAIP Manual Test Guide

**Test Environment:** http://localhost:3001  
**Date:** March 9, 2026  
**Architecture:** Unified LLM Reasoning Layer

---

## 🎯 TEST SCENARIOS

### TEST 1: Basic Routing & Engine Selection

#### 1.1 Scheme Engine
**Query:** "What government schemes am I eligible for as a farmer in Telangana?"  
**Expected:**
- ✅ Routes to `scheme_engine`
- ✅ Uses LLM reasoning (no static response)
- ✅ Provides structured response with:
  - Understanding the Question
  - Explanation of schemes
  - Context Analysis
  - Practical Guidance (application steps, documents)
  - Follow-up Questions (if profile incomplete)

#### 1.2 Agriculture Engine
**Query:** "Which crops should I grow this Kharif season in Maharashtra?"  
**Expected:**
- ✅ Routes to `agriculture_engine`
- ✅ LLM provides crop recommendations based on:
  - Season (Kharif = monsoon crops)
  - Region (Maharashtra climate)
  - MSP considerations
  - Water availability
  - Market demand
- ✅ Structured reasoning format

#### 1.3 Commerce Engine
**Query:** "How do I start selling handmade products on Amazon?"  
**Expected:**
- ✅ Routes to `commerce_engine`
- ✅ LLM provides business guidance:
  - Platform registration process
  - Pricing strategy
  - Logistics setup
  - Competition analysis
  - Regulatory compliance
- ✅ Actionable steps, not generic advice

#### 1.4 Tourism Engine
**Query:** "What should I know before traveling to India as a tourist?"  
**Expected:**
- ✅ Routes to `tourism_engine`
- ✅ LLM provides comprehensive guidance:
  - Visa process
  - Safety considerations
  - Cultural etiquette
  - Transport options
  - Payment methods
  - Emergency contacts

#### 1.5 Legal Engine (Nyay AI)
**Query:** "My landlord is harassing me. What are my legal rights as a tenant?"  
**Expected:**
- ✅ Routes to `legal_engine`
- ✅ LLM provides legal analysis:
  - Tenant rights under Indian law
  - Legal category identification
  - Evidence gathering steps
  - Complaint process
  - Timeline expectations
  - Legal resources

#### 1.6 Career Engine (PathAI)
**Query:** "What should I do after 12th to become a software engineer?"  
**Expected:**
- ✅ Routes to `career_engine`
- ✅ LLM provides career roadmap:
  - Education path (B.Tech/BCA/BSc options)
  - Entrance exams (JEE, state-level)
  - Skills to learn
  - Timeline expectations
  - Salary potential
  - Alternative paths

---

### TEST 2: Multi-Engine Queries

#### 2.1 Scheme + Agriculture
**Query:** "Are there government subsidies for drip irrigation systems?"  
**Expected:**
- ✅ Routes to BOTH `scheme_engine` AND `agriculture_engine`
- ✅ Unified response synthesizing both domains:
  - Relevant schemes (PM-KUSUM, PMKSY, state subsidies)
  - Drip irrigation benefits (agronomic perspective)
  - Eligibility criteria
  - Application process
  - Cost-benefit analysis
- ✅ No mention of "engines" or internal routing to user

#### 2.2 Commerce + Tourism
**Query:** "I want to start a tour guide business for foreign tourists in Jaipur"  
**Expected:**
- ✅ Routes to `commerce_engine` (business strategy) + `tourism_engine` (tourism domain)
- ✅ Unified response covering:
  - Business registration requirements
  - Tourism licenses
  - Target market analysis
  - Pricing strategy
  - Cultural insights for foreign tourists
  - Marketing channels

---

### TEST 3: Capabilities Layer

#### 3.1 Document Upload & Q&A
**Steps:**
1. Upload a government scheme PDF or image
2. Wait for analysis confirmation
3. Ask: "What are the eligibility criteria in this document?"

**Expected:**
- ✅ Routes to `document_ai` capability
- ✅ LLM extracts and explains eligibility from document
- ✅ Structured answer with specific sections/clauses referenced
- ✅ Follow-up questions about the document work

#### 3.2 Image Analysis
**Steps:**
1. Upload an image (crop disease, plant, product)
2. Ask: "What is this?" or "What disease does this crop have?"

**Expected:**
- ✅ Routes to `photo_ai` capability
- ✅ LLM analyzes image content
- ✅ Provides detailed explanation
- ✅ For crop diseases: suggests remedies

#### 3.3 Learning Mode
**Steps:**
1. Send message: "🧠 Teach me about organic farming"
2. Answer the AI's interactive questions
3. Continue the learning conversation

**Expected:**
- ✅ Routes to `learning_ai` capability
- ✅ AI asks progressively deeper questions
- ✅ Adapts difficulty based on answers
- ✅ Provides structured explanations
- ✅ Tracks progress through topic
- ✅ Completes when topic mastered

---

### TEST 4: Multilingual Support

#### 4.1 Switch to Hindi
**Steps:**
1. Click language selector → Choose "हिन्दी"
2. Ask: "मुझे कौन सी सरकारी योजनाएं मिल सकती हैं?"

**Expected:**
- ✅ UI text updates to Hindi
- ✅ Query translates to English internally for routing
- ✅ Routes to appropriate engine
- ✅ AI response comes back in Hindi
- ✅ Structured format maintained in Hindi

#### 4.2 Switch to Telugu
**Steps:**
1. Change language to Telugu
2. Ask query in Telugu about farming

**Expected:**
- ✅ Same multilingual pipeline
- ✅ Response in Telugu with proper formatting

#### 4.3 Language Consistency
**Test:**
- Start conversation in English
- Switch to Hindi mid-conversation
- Continue conversation

**Expected:**
- ✅ Conversation history maintained
- ✅ New responses in selected language
- ✅ Context preserved across language switch

---

### TEST 5: Voice & Audio

#### 5.1 Voice Input
**Steps:**
1. Click microphone icon
2. Speak query: "What are the benefits of PM-KISAN scheme?"
3. Click stop

**Expected:**
- ✅ Speech recognized and transcribed
- ✅ Query sent to AI
- ✅ Response appears in chat

#### 5.2 Audio Output
**Steps:**
1. After receiving AI response
2. Click speaker/audio icon
3. Listen to response

**Expected:**
- ✅ Text-to-speech plays response
- ✅ Uses appropriate voice for selected language
- ✅ Can pause/resume playback

---

### TEST 6: Performance & Caching

#### 6.1 Local Quick Answers
**Queries:**
- "Hi"
- "Hello"
- "What time is it?"
- "What is today's date?"

**Expected:**
- ✅ Instant response (< 100ms)
- ✅ No LLM call made
- ✅ Marked as "Local Quick Response"

#### 6.2 Cache Hit
**Steps:**
1. Ask: "Tell me about PM-KISAN scheme"
2. Wait for full LLM response
3. Ask the EXACT same query again within 5 minutes

**Expected:**
- ✅ Second response is instant (cache hit)
- ✅ Identical response returned
- ✅ No new LLM call

#### 6.3 Cache Miss
**Steps:**
1. Ask query A
2. Wait 6+ minutes
3. Ask query A again

**Expected:**
- ✅ New LLM call made (cache expired)
- ✅ Fresh response generated

---

### TEST 7: Streaming vs Non-Streaming

#### 7.1 Streaming Endpoint
**Query:** Any complex query requiring LLM reasoning  
**Observe:** Browser network tab → `/api/unified-ai-stream`

**Expected:**
- ✅ Response appears token-by-token (streaming)
- ✅ First words visible within 1-2 seconds
- ✅ Full response builds progressively
- ✅ Content-Type: `text/event-stream`

#### 7.2 Fallback to Non-Streaming
**Scenario:** If streaming fails (rare)

**Expected:**
- ✅ Automatic fallback to `/api/unified-ai`
- ✅ Full response appears at once
- ✅ No error visible to user

---

### TEST 8: Error Handling

#### 8.1 Empty Message
**Steps:**
1. Try to send empty message or only spaces

**Expected:**
- ✅ Error handled gracefully
- ✅ No API call made
- ✅ Input validation message

#### 8.2 LLM Service Error
**Scenario:** Bedrock temporarily unavailable (simulate by invalidating credentials)

**Expected:**
- ✅ Retry logic activates (1 retry with temp=0.5)
- ✅ If both fail: Intelligent error message explaining limitation
- ✅ NO generic "try again" — explains what happened and suggests actions

#### 8.3 Network Interruption
**Scenario:** Disconnect internet mid-stream

**Expected:**
- ✅ Graceful degradation
- ✅ Partial response preserved
- ✅ Error indication shown
- ✅ Can retry without losing context

---

### TEST 9: Conversation Context

#### 9.1 Multi-Turn Conversation
**Steps:**
1. Ask: "I am a farmer in Punjab with 5 acres of land"
2. AI responds
3. Ask: "What crops should I grow?" (without repeating location/profile)
4. AI responds
5. Ask: "What about pest control?" (continues context)

**Expected:**
- ✅ AI remembers: User is farmer, Punjab, 5 acres
- ✅ No need to repeat context each time
- ✅ Responses build on previous conversation
- ✅ Conversation history passed to LLM

#### 9.2 Context Reset
**Steps:**
1. Click "New Chat" or BUAIP logo
2. Start fresh conversation

**Expected:**
- ✅ Previous context cleared
- ✅ Clean slate for new query
- ✅ No bleed-over from previous session

---

### TEST 10: Production Build

#### 10.1 Build Verification
**Command:** `npm run build`

**Expected:**
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ All 49 routes compile successfully
- ✅ Bundle size reasonable (< 200KB first load JS)

#### 10.2 Production Start
**Command:** `npm start`

**Expected:**
- ✅ Production server starts on port 3000
- ✅ All features work identically to dev mode
- ✅ Optimized performance
- ✅ Static assets served efficiently

---

## 🏆 SUCCESS CRITERIA

### Critical (Must Pass)
- ✅ All 6 engines route correctly
- ✅ All engines use real LLM (no static responses)
- ✅ Multi-engine queries work
- ✅ Capabilities layer works (document, photo, learning)
- ✅ Multilingual support works (Hindi, Telugu, Tamil)
- ✅ Voice input works
- ✅ Audio output works
- ✅ Streaming works
- ✅ Loading issue fixed (no refresh needed)
- ✅ No TypeScript errors
- ✅ Production build succeeds

### Important (Should Pass)
- ✅ Response quality is high (detailed, structured)
- ✅ Conversation context maintained
- ✅ Cache works correctly
- ✅ Error handling is graceful
- ✅ Performance is acceptable (< 3s for LLM response)

### Nice-to-Have (Can Improve Later)
- Response time optimization
- Enhanced error messages
- Additional language support
- Advanced caching strategies

---

## 📊 TESTING CHECKLIST

### Before Testing
- [ ] .env.local file has valid AWS credentials
- [ ] BEDROCK_MODEL_ID is correct
- [ ] Development server running (port 3001 or 3000)
- [ ] Browser console open for monitoring

### During Testing
- [ ] Test each engine individually
- [ ] Test at least 2 multi-engine scenarios
- [ ] Test all 3 capabilities (document, photo, learning)
- [ ] Test at least 2 languages (English + Hindi/Telugu)
- [ ] Test voice input and audio output
- [ ] Verify streaming works
- [ ] Check cache behavior
- [ ] Test error scenarios

### After Testing
- [ ] Review browser console for errors
- [ ] Check network tab for API response structure
- [ ] Verify no static/fallback responses in AI layer
- [ ] Confirm all responses are structured (5 sections)
- [ ] Document any issues found

---

## 🔧 DEBUGGING TIPS

### If Engine Routing Fails
1. Check browser console for routing logs
2. Verify query keywords match router patterns
3. Check `/router/super_router.ts` DOMAIN_KEYWORDS

### If LLM Response is Empty/Short
1. Check AWS credentials in .env.local
2. Verify Bedrock region is correct
3. Check server logs for LLM errors
4. Ensure maxTokens is sufficient (should be 4096)

### If Multilingual Fails
1. Check AWS Translate is configured
2. Verify selectedLanguage is passed correctly
3. Check translation cache in DynamoDB/local storage

### If Streaming Fails
1. Check Content-Type header in network tab
2. Verify SSE format is correct
3. Check for network interruptions
4. Fallback to non-streaming should be automatic

---

## ✅ FINAL VERIFICATION

**Run this command after all tests:**
```bash
npm run build
```

**Expected output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (49/49)
✓ Collecting build traces
✓ Finalizing page optimization
```

If build succeeds and all manual tests pass → **PRODUCTION READY** ✅

---

**Test Completion Date:** _____________  
**Tester:** _____________  
**Result:** ✅ PASS / ❌ FAIL  
**Notes:** _____________

# BUAIP Complete System Testing Guide

## Overview
This guide provides comprehensive testing procedures for all 6 BUAIP intelligence engines to ensure 100% accuracy and smooth operation.

---

## 🎯 System Architecture

**BUAIP** (Bharat Unified AI Platform) consists of:

1. **Government Scheme Intelligence** - Scheme eligibility and benefit matching
2. **Agriculture Intelligence (Annadata)** - Crop care, farming advice, subsidy guidance
3. **Commerce Intelligence (GlobalSeller)** - Export/import procedures, business compliance
4. **Tourism Intelligence (India Insider)** - Trip planning, cultural experiences, budget itineraries
5. **Legal Rights Intelligence (Nyay AI)** - Legal advice, citizen rights, court procedures
6. **Career Intelligence (PathAI)** - Career guidance, honest salary expectations, roadmaps

**Routing Flow:**
```
User Query → buaipRouter.ts (Intent Detection) → unified-ai/route.ts (Engine Routing) → Specific Engine → Claude AI → Response
```

---

## 🚀 Quick Test (All 6 Engines)

### Step 1: Start Development Server
```powershell
cd c:\BUAIP\BUAIP
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

### Step 2: Run Automated Test Suite
```powershell
# In a new terminal
node test-6-engines-complete.js
```

**Expected Output:**
```
===================================================================================
BUAIP 6-ENGINE SYSTEM TEST
Testing all 6 intelligence engines through unified-ai routing
===================================================================================

TEST 1/6: Government Scheme Intelligence
📝 Query: I am a farmer with 2 acres of land in Maharashtra...
✅ SUCCESS:
   Engine: Government Scheme Intelligence
   Intent: government_scheme
   Confidence: 92.5%
   Response Time: 1234ms
   Relevance Score: 85.0%

[... continues for all 6 engines ...]

===================================================================================
TEST SUMMARY
===================================================================================
✅ Government Scheme Intelligence
✅ Agriculture Intelligence (Annadata)
✅ Commerce Intelligence (GlobalSeller)
✅ Tourism Intelligence (India Insider)
✅ Legal Rights Intelligence (Nyay AI)
✅ Career Intelligence (PathAI)

===================================================================================
FINAL RESULT: 6/6 tests passed (100.0%)
===================================================================================
🎉 ALL ENGINES WORKING PERFECTLY! System ready for production.
```

### Step 3: Manual UI Testing
1. Open browser: `http://localhost:3000`
2. Test each example query from WelcomeScreen:
   - "I am a farmer with 2 acres of land. What schemes can help me?"
   - "How do I control pest attacks on my cotton crop?"
   - "I want to export handicrafts to Dubai. What are the procedures?"
   - "Plan a 5-day trip to Kerala with ₹40,000 budget"
   - "My landlord is not returning my security deposit. What are my rights?"
   - "I finished 12th with 75% in PCM. Confused between engineering and other careers"

3. Verify for each:
   - ✅ Correct engine detected (shown in response)
   - ✅ Real AI reasoning (not placeholder text)
   - ✅ Response is relevant to query
   - ✅ Response time < 5 seconds
   - ✅ Follow-up questions work (engines ask for clarification if needed)

---

## 🔍 Individual Engine Testing

### 1. Government Scheme Intelligence
**Test Query:**
```
I am a widow with 2 children in rural Karnataka. What government schemes can help me?
```

**Expected Response Characteristics:**
- Lists relevant schemes (Widow Pension, PM Awas Yojana, etc.)
- Checks eligibility criteria
- Provides application procedures
- Mentions required documents
- Includes benefit amounts

**Verification Checklist:**
- [ ] Intent detected as `government_scheme`
- [ ] Engine identified as "Government Scheme Intelligence"
- [ ] Response mentions specific schemes by name
- [ ] Eligibility criteria explained
- [ ] Application process outlined
- [ ] Follow-up questions asked if profile incomplete

---

### 2. Agriculture Intelligence (Annadata)
**Test Query:**
```
My wheat crop has yellow leaves and stunted growth. Temperature is 28°C. What should I do?
```

**Expected Response Characteristics:**
- Diagnoses issue (likely nitrogen deficiency or disease)
- Recommends treatment (fertilizers, pesticides)
- Provides dosage and application method
- Suggests preventive measures
- Mentions government subsidies if applicable

**Verification Checklist:**
- [ ] Intent detected as `agriculture_intelligence`
- [ ] Engine identified as "Annadata Agriculture Intelligence"
- [ ] Specific diagnosis provided
- [ ] Treatment plan with steps
- [ ] Safety precautions mentioned
- [ ] Cost estimates included

---

### 3. Commerce Intelligence (GlobalSeller)
**Test Query:**
```
I want to export organic tea to Germany. What are the procedures, costs, and certifications needed?
```

**Expected Response Characteristics:**
- Lists required certifications (FSSAI, Organic, EU standards)
- Explains export procedures step-by-step
- Provides cost breakdown (certification, shipping, duties)
- Mentions IEC code and GST requirements
- Suggests APEDA support

**Verification Checklist:**
- [ ] Intent detected as `india_commerce`
- [ ] Engine identified as "GlobalSeller Commerce Intelligence"
- [ ] Certification requirements listed
- [ ] Step-by-step export procedure
- [ ] Cost estimates provided
- [ ] Timeline mentioned

---

### 4. Tourism Intelligence (India Insider)
**Test Query:**
```
Plan a 7-day honeymoon trip to Goa with budget of ₹60,000 including flights from Delhi
```

**Expected Response Characteristics:**
- Day-by-day itinerary with activities
- Budget breakdown (flights, hotels, food, activities)
- Romantic destinations (beaches, sunset points)
- Local cuisine recommendations
- Travel tips and best times

**Verification Checklist:**
- [ ] Intent detected as `india_tourism`
- [ ] Engine identified as "India Insider Tourism Intelligence"
- [ ] 7-day itinerary provided
- [ ] Budget within ₹60,000 constraint
- [ ] Honeymoon-specific recommendations
- [ ] Practical travel tips

---

### 5. Legal Rights Intelligence (Nyay AI)
**Test Query:**
```
I received a defective mobile phone. Seller is refusing refund. What legal action can I take?
```

**Expected Response Characteristics:**
- Explains Consumer Protection Act rights
- Outlines complaint procedure (consumer forum)
- Mentions documentation needed
- Provides timeline expectations
- Suggests negotiation steps first

**Verification Checklist:**
- [ ] Intent detected as `legal_rights`
- [ ] Engine identified as "Nyay AI Legal Intelligence"
- [ ] Relevant laws cited (Consumer Protection Act)
- [ ] Step-by-step complaint procedure
- [ ] Required documents listed
- [ ] Alternative resolution suggested

---

### 6. Career Intelligence (PathAI)
**Test Query:**
```
I just finished 12th PCM with 75%. Confused between engineering and other careers. Family pressure for IIT but I'm not sure.
```

**Expected Response Characteristics:**
- Acknowledges confusion and family pressure
- Asks follow-up questions about interests and priorities
- Provides realistic career options beyond engineering
- Mentions honest salary expectations
- Offers to create career roadmap if interested

**Verification Checklist:**
- [ ] Intent detected as `career_intelligence`
- [ ] Engine identified as "PathAI Career Intelligence"
- [ ] Empathetic response to confusion
- [ ] Multiple career options suggested (not just engineering)
- [ ] Honest salary expectations mentioned
- [ ] Follow-up questions asked to understand better

---

## 🧪 Advanced Testing Scenarios

### Scenario 1: Multi-Intent Queries
**Query:** "Are there government schemes for farmers who want to export organic produce?"

**Expected Behavior:**
- Primary intent: `government_scheme` (schemes are the main focus)
- Should mention both agriculture schemes and export benefits
- May reference APEDA, PM-AASHA, export subsidies

**Verification:**
- [ ] Query correctly routed to primary engine
- [ ] Response addresses both farming and export aspects
- [ ] No confusion or generic response

---

### Scenario 2: Follow-Up Questions
**Query 1:** "I want career guidance"
**System Response:** "I'll help you! First, tell me about your current education level..."

**Query 2:** "I'm in 12th PCM with 82%"
**System Response:** "Great! What subjects interest you most? What are your career priorities?"

**Query 3:** "I like coding and want work-life balance"
**System Response:** [Provides specific career matches + roadmap offer]

**Verification:**
- [ ] Engine maintains conversation context
- [ ] Each response builds on previous answers
- [ ] No repetition of already-asked questions
- [ ] Final recommendations are personalized

---

### Scenario 3: Hindi + English Code-Mixed Queries
**Query:** "Mera wheat crop kharab ho raha hai. Leaves yellow ho gayi hain. What should I do?"

**Expected Behavior:**
- Intent detection works (keywords in both languages)
- Routes to Annadata engine
- Response can be in English (Hindi response optional but not required)

**Verification:**
- [ ] Query understood correctly
- [ ] Intent detected as `agriculture_intelligence`
- [ ] Response addresses wheat crop yellowing issue

---

### Scenario 4: Ambiguous Queries
**Query:** "Help me with my problem"

**Expected Behavior:**
- System asks clarifying questions
- Does not guess or provide generic response
- Helps user articulate their specific need

**Verification:**
- [ ] No error or crash
- [ ] Follow-up question asked
- [ ] Response is helpful and conversational

---

## 📊 Success Criteria

### ✅ System is Production-Ready When:

1. **All 6 Engines Pass Automated Tests** (100% success rate)
2. **Real AI Responses** (no mock/placeholder text)
3. **Intent Detection Accuracy** ≥ 85% confidence
4. **Response Time** < 5 seconds for 95% of queries
5. **Follow-Up Questions Work** (engines maintain context)
6. **Error Handling** (graceful degradation, helpful error messages)
7. **No Compilation Errors** in any TypeScript file
8. **UI Works Smoothly** (no broken components, animations work)

---

## 🐛 Troubleshooting Common Issues

### Issue 1: Engine Not Detected
**Symptom:** Query routed to default scheme engine instead of correct engine

**Diagnosis:**
```powershell
# Check intent detection
node -e "const { detectIntent } = require('./app/lib/buaipRouter'); console.log(detectIntent('Your query here'));"
```

**Fix:**
- Add more keywords to `buaipRouter.ts` for that intent
- Check for typos in intent names
- Verify intent is registered in unified-ai routing

---

### Issue 2: Mock/Placeholder Responses
**Symptom:** Response contains "mock", "placeholder", or is too generic

**Diagnosis:**
- Check if engine is actually calling Claude AI
- Verify ANTHROPIC_API_KEY is set correctly
- Check engine implementation for hardcoded responses

**Fix:**
- Ensure engine calls Claude API with proper prompt
- Remove any mock/placeholder logic
- Verify API key has sufficient credits

---

### Issue 3: No Response or Timeout
**Symptom:** Request hangs or times out after 30+ seconds

**Diagnosis:**
```powershell
# Check API endpoint directly
curl -X POST http://localhost:3000/api/unified-ai `
  -H "Content-Type: application/json" `
  -d '{"message":"test query","sessionId":"test-123"}'
```

**Fix:**
- Check if dev server is running
- Verify no infinite loops in routing logic
- Check Claude API status (may be rate limited)
- Increase timeout in fetch calls if needed

---

### Issue 4: Follow-Up Questions Not Working
**Symptom:** Engine doesn't remember previous conversation context

**Diagnosis:**
- Check if sessionId is being passed correctly
- Verify session storage is working
- Check if conversationHistory is maintained

**Fix:**
- Implement session management in unified-ai
- Pass conversationHistory to engine APIs
- Store profile/context in session

---

## 📝 Testing Checklist (Complete)

### Pre-Testing Setup
- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env.local` with ANTHROPIC_API_KEY)
- [ ] Dev server starts without errors (`npm run dev`)
- [ ] No TypeScript compilation errors (`npm run build` or check VS Code)

### Automated Testing
- [ ] Run `node test-6-engines-complete.js`
- [ ] All 6 tests pass (100% success rate)
- [ ] No "mock" or "placeholder" warnings
- [ ] Response times reasonable (< 5s each)
- [ ] Relevance scores > 50% for all engines

### Manual UI Testing
- [ ] WelcomeScreen displays 6 example queries
- [ ] Each example query routes to correct engine
- [ ] Chat interface works (user can type and send)
- [ ] Responses display correctly (no broken formatting)
- [ ] Animations smooth (no lag or stuttering)
- [ ] Mobile responsive (test on 375px width)

### Intent Detection Testing
- [ ] Government schemes → `government_scheme`
- [ ] Farming questions → `agriculture_intelligence`
- [ ] Export/import → `india_commerce`
- [ ] Travel planning → `india_tourism`
- [ ] Legal issues → `legal_rights`
- [ ] Career guidance → `career_intelligence`
- [ ] Ambiguous queries → Asks clarification

### Conversation Flow Testing
- [ ] Follow-up questions work
- [ ] Context maintained across messages
- [ ] No repetition of already-collected info
- [ ] Graceful handling of topic changes

### Edge Case Testing
- [ ] Empty query → Error handled gracefully
- [ ] Very long query (500+ words) → Works correctly
- [ ] Hindi/English mixed → Intent detected
- [ ] Multiple intents in one query → Primary intent chosen
- [ ] Typos in query → Still understands intent

### Performance Testing
- [ ] Response time < 5s for 95% of queries
- [ ] No memory leaks (can handle 50+ messages)
- [ ] Concurrent requests work (3+ users simultaneously)

---

## 🎉 Final Validation

**Run this command to generate final report:**
```powershell
node test-6-engines-complete.js > test-results.txt 2>&1
type test-results.txt
```

**Expected Final Output:**
```
🎉 ALL ENGINES WORKING PERFECTLY! System ready for production.
```

**If all tests pass:**
- ✅ System is production-ready
- ✅ All 6 engines working with real AI
- ✅ Intent detection accurate
- ✅ User experience smooth and intelligent

---

## 📞 Support

If any tests fail or you encounter issues:

1. **Check error messages** in test output (they tell you exactly what failed)
2. **Review troubleshooting section** above
3. **Verify environment setup** (API keys, dependencies)
4. **Check Claude API status** (may be rate limited or down)
5. **Review engine logs** in terminal (detailed error messages)

---

**System Status:** 🟢 All 6 Engines Operational
**Last Updated:** January 2025
**Version:** BUAIP v1.0 Production-Ready

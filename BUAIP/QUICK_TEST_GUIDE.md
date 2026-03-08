# Quick Test Guide - Intelligent Reasoning System

## How to Test in Browser

### 1. Start the Server (if not already running)
```bash
cd c:\BUAIP\BUAIP
npm run dev
```

Server will start on: http://localhost:3001

### 2. Open Chat Interface
Open your browser and go to:
**http://localhost:3001/chat**

### 3. Test the Intelligent Reasoning

Try these example conversations to see the improvements:

#### Test 1: Multi-field Natural Input
**You say:** "I am a 35-year-old farmer in Andhra Pradesh, rural area, earning ₹20,000 monthly"

**What the bot will do:**
- ✅ Extract age, occupation, state, area type, income in ONE message
- ✅ Infer farming=true, employed=true, seniorCitizen=false
- ✅ Ask only for missing critical info (gender, category)
- ✅ NEVER ask "are you involved in farming?" (already knows!)

#### Test 2: Verify No Redundant Questions
**You say:** "I am a farmer"

**What the bot will do:**
- ✅ Set occupation=Farmer
- ✅ Automatically infer farming=true
- ✅ NOT ask "Are you involved in farming?"
- ✅ NOT ask "Are you employed?" (farmers are employed!)

#### Test 3: Check Clickable Links
After providing profile info, the bot will recommend schemes.

**Look for:**
- ✅ Links like https://pmkisan.gov.in are blue and underlined
- ✅ Clicking them opens in new tab
- ✅ Hover shows color change

#### Test 4: Minimal Questions
Count how many questions the bot asks before giving recommendations.

**Expected:**
- Old system: 19 questions (rigid sequence)
- New system: 0-3 questions (smart adaptive)

## Example Full Conversation

```
You: Hi, I need help finding schemes

Bot: Hello! I'd be happy to help you discover government schemes 
     you're eligible for. To get started, could you tell me a bit 
     about yourself - your age, occupation, and location?

You: I am a 37-year-old farmer in Andhra Pradesh, Eluru district, 
     rural area

Bot: Understood. Based on the information provided:
     - Age: 37 years
     - Occupation: Farmer
     - State: Andhra Pradesh
     - Area Type: Rural
     - District: Eluru
     
     To better understand your eligibility, please let me know your 
     gender and social category (General/OBC/SC/ST).

You: Male, ST category, monthly income ₹20,000

Bot: [Provides detailed scheme recommendations with clickable links]
     
     1. PM-KISAN Scheme
        - ₹6,000 annual income support
        - Apply at: https://pmkisan.gov.in
     
     2. PMFBY Crop Insurance
        - Covers crop losses
        - Apply through agriculture office
     
     3. ST Welfare Schemes
        - Economic empowerment programs
        - Details: https://tribal.nic.in/schemes.aspx
     
     [More schemes...]
```

## What to Notice

### ✅ Good Signs (New System Working)
- Bot extracts multiple fields from one message
- Bot never asks redundant questions
- Links are clickable (blue, underlined)
- Only 2-3 questions before recommendations
- Bot explains reasoning ("Since you're a farmer...")

### ❌ Problems (Old System Behavior)
- Bot asks questions one by one rigidly
- Bot asks "Are you involved in farming?" after you said "farmer"
- Links appear as plain text
- 19+ questions before any recommendations
- Bot doesn't explain why it's asking

## Quick Debug

### Check Session State
Open in browser while chatting:
```
http://localhost:3001/api/unified-ai?sessionId=YOUR_SESSION_ID
```

You'll see:
- Current profile fields
- Conversation history
- What's been inferred

### Check Server Logs
In the terminal where server is running, watch for:
```
Unified AI Error: [if any errors]
```

## Expected Behavior Summary

| What You Say | What Bot Extracts | What Bot Infers |
|--------------|-------------------|-----------------|
| "I am a 37-year-old farmer" | age=37, occupation=Farmer | farming=true, employed=true, seniorCitizen=false |
| "Income ₹20,000, ST category" | monthlyIncome=20000, category=ST | (validates profile) |
| "I own 2 acres of land" | landOwned=2 | farming=true |
| "I am a student" | occupation=Student | student=true, employed=false |
| "I am 65 years old" | age=65 | seniorCitizen=true |

## Troubleshooting

### Links not clickable?
- Check browser console for errors
- Verify ChatMessage.tsx has formatMessageWithLinks()
- Clear browser cache and reload

### Bot asking too many questions?
- Check API response includes profile extraction
- Verify inference rules are applied
- Check server logs for errors

### Bot not providing schemes?
- Ensure you've provided at least: age, occupation, state, income, category
- Check if bot is waiting for critical missing info
- View session state via debug endpoint

## Success Criteria

Your test is successful if:

1. ✅ Bot extracts 3+ fields from single natural message
2. ✅ Bot never asks "farming?" after you say "farmer"
3. ✅ Links are clickable (try clicking one)
4. ✅ You get scheme recommendations after 0-3 questions
5. ✅ Bot explains reasoning contextually

---

**Ready to test!** Open http://localhost:3001/chat and try the examples above.

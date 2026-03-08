# India Insider AI - Tourist Intelligence Layer

## Update (March 8, 2026)
- All 8 engines are now implemented and tested.
- New all-in-one test script: `test-india-insider-all-engines.js`.
- Any older `TODO` labels in this historical document are superseded by `INDIA_INSIDER_IMPLEMENTATION_STATUS.md` and `INDIA_INSIDER_QUICK_REFERENCE.md`.

## 🌏 Overview

**India Insider AI** is a comprehensive tourist intelligence system integrated into BUAIP (Bharatiya Universal AI Platform). It consists of **8 specialized AI engines** that help international visitors navigate India safely and confidently.

## 🎯 Mission

Transform the tourist experience in India by providing:
- **Pre-arrival preparation** guidance (visa, vaccines, packing)
- **Real-time city navigation** (attractions, transport, scams)
- **Payment ecosystem** help (UPI, ATMs, cash strategy)
- **Emergency assistance** (medical, legal, lost documents)
- **Food safety** guidance (what's safe, where to eat)
- **Long-term expat support** (FRRO, banking, housing)
- **Language survival** phrases (Hindi + regional languages)
- **Legal & cultural rules** (laws, etiquette, dos/don'ts)

---

## 🏗️ System Architecture

### Components Created

```
BUAIP
├─ app/
│  ├─ lib/
│  │  ├─ indiaInsiderTypes.ts        ✅ Complete type system
│  │  ├─ indiaInsiderPrompts.ts      ✅ All 8 engine system prompts
│  │  └─ buaipRouter.ts               ✅ Intent detection & routing
│  │
│  └─ api/
│     ├─ india-insider-prearival/    ✅ Pre-Arrival Planner engine
│     ├─ india-insider-citynavigator/✅ City Navigator engine
│     ├─ india-insider-payment/       ✅ Payment & Money engine
│     ├─ india-insider-emergency/     ✅ Emergency Assistant engine
│     │
│     ├─ india-insider-foodsafety/    🔲 TODO: Food Safety engine
│     ├─ india-insider-expat/         🔲 TODO: Expat Longstay engine
│     ├─ india-insider-language/      🔲 TODO: Language Survival engine
│     └─ india-insider-legal/         🔲 TODO: Legal & Cultural engine
```

### How It Works

```
User Query
    ↓
BUAIP Router (buaipRouter.ts)
    ↓
Intent Detection
    ├─ Scheme Eligibility → unified-ai
    ├─ Agriculture/Farming → annadata-ai
    └─ Tourist Query → India Insider Engine
                          ↓
                   8 Specialized Engines
                          ↓
                  System Prompt (indiaInsiderPrompts.ts)
                          ↓
                  AWS Bedrock (Claude 3)
                          ↓
                  Structured Response
```

---

## 🤖 The 8 India Insider Engines

### 1. **Pre-Arrival Planner** ✅ IMPLEMENTED
**Route:** `/api/india-insider-prearival`  
**Purpose:** Prepare visitors BEFORE they arrive in India

**Capabilities:**
- Nationality-specific visa requirements
- e-Visa vs embassy visa guidance
- Vaccination recommendations (Yellow Fever, Hepatitis, Typhoid)
- Travel insurance advice
- Currency exchange strategy
- SIM card options at airport
- Packing lists (climate-appropriate, modest clothing)
- Customs regulations (what's allowed/prohibited)
- 8-week timeline for preparations

**Example Queries:**
- "I'm from USA, what visa do I need for India?"
- "What vaccinations should I get before India?"
- "How much cash should I bring?"
- "What can I bring through customs?"

---

### 2. **City Navigator** ✅ IMPLEMENTED
**Route:** `/api/india-insider-citynavigator`  
**Purpose:** Local expert guide for navigating Indian cities

**Capabilities:**
- Top attractions with timing/cost/tips
- Transport options (Metro, auto, taxi, apps)
- Safety advice (solo women, night safety, areas to avoid)
- Common tourist scams and how to avoid them
- Neighborhood guides (where to stay, local vibe)
- Food recommendations (where locals eat)
- Budget estimation (₹/day by budget level)
- Best time to visit

**Covered Cities:**
- Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad
- Jaipur, Goa, Kerala, Agra, Varanasi, Udaipur

**Example Queries:**
- "What should I see in Delhi in 2 days?"
- "Is Delhi safe for solo women travelers?"
- "How do I avoid taxi scams in Jaipur?"
- "Best areas to stay in Mumbai?"

---

### 3. **Payment & Money Expert** ✅ IMPLEMENTED
**Route:** `/api/india-insider-payment`  
**Purpose:** Navigate India's unique payment ecosystem

**Capabilities:**
- **UPI System Explained:** India's revolutionary digital payment (can foreigners use it?)
- **ATM Strategy:** Best banks, fees, withdrawal amounts, safety
- **Cash Requirements:** Daily needs by budget, denomination strategy
- **Card Acceptance:** Visa/Mastercard/Amex acceptance rates
- **Currency Exchange:** Where to exchange (rates, safety)
- **Digital Apps:** Ola, Uber, Paytm, Google Pay
- **Payment Safety:** Scams, card skimming, fake notes

**Example Queries:**
- "What is UPI and can I use it as a tourist?"
- "How much cash do I need daily in India?"
- "Where should I exchange currency?"
- "Which ATMs accept international cards?"

---

### 4. **Emergency Assistant** ✅ IMPLEMENTED
**Route:** `/api/india-insider-emergency`  
**Purpose:** Handle tourist emergencies with calm, actionable guidance

**Capabilities:**
- **Immediate Action Steps** (what to do RIGHT NOW)
- **Emergency Numbers** (Police 100, Ambulance 102, Tourist Helpline 1363)
- **Nearby Help** (hospitals, police stations, pharmacies)
- **Embassy Contacts** (country-specific consulate info)
- **Documentation Guidance** (FIR, medical records, replacement docs)
- **Follow-up Actions** (insurance, legal steps)

**Emergency Types:**
- Lost/stolen passport
- Medical emergencies (injury, illness)
- Crime (assault, robbery, scam)
- Lost belongings
- Serious illness requiring hospitalization

**Example Queries:**
- "I lost my passport in Delhi, what do I do?"
- "I was robbed, how do I file a police report?"
- "I need a hospital urgently"
- "My credit card was stolen"

---

### 5. **Food Safety Expert** 🔲 TODO
**Route:** `/api/india-insider-foodsafety`  
**Purpose:** Enjoy India's food safely without getting sick

**Capabilities:**
- Water safety rules (never drink tap water)
- Street food selection (what's safe, what to avoid)
- Restaurant quality indicators
- Dietary accommodations (vegetarian, vegan, halal, kosher, allergies)
- Spice level management
- Illness prevention (probiotics, hand sanitizer, ORS packets)
- Must-try safe dishes

**Example Queries:**
- "Is street food safe in India?"
- "What should I avoid eating?"
- "I'm vegetarian, what are my options?"
- "How do I avoid food poisoning?"

---

### 6. **Expat Longstay Specialist** 🔲 TODO
**Route:** `/api/india-insider-expat`  
**Purpose:** Help foreigners moving to India for 3+ months

**Capabilities:**
- Long-term visa types (Employment, Student, Research, Medical)
- **FRRO Registration** (mandatory for 180+ day stays)
- Banking (opening Indian accounts, documents needed)
- Accommodation (PG, apartments, rental process, deposits)
- Utilities (electricity, gas, internet setup)
- Healthcare (insurance, finding doctors)
- Taxes (Indian tax obligations for foreigners)
- PAN card and Aadhaar

**Example Queries:**
- "How do I register with FRRO?"
- "Can I open an Indian bank account?"
- "How do I rent an apartment in Bangalore?"
- "What are my tax obligations in India?"

---

### 7. **Language Survival Teacher** 🔲 TODO
**Route:** `/api/india-insider-language`  
**Purpose:** Teach essential phrases for surviving without fluent Hindi

**Capabilities:**
- Essential survival phrases (greetings, directions, food, emergency)
- Pronunciation guide (phonetics for English speakers)
- Context usage (when formal vs casual)
- Emergency language (Help! Police! Hospital!)
- Number system (1 Lakh = 1,00,000, 1 Crore = 1,00,00,000)
- Food vocabulary (vegetarian, not spicy, water, bill)
- Bargaining language
- Regional languages (Tamil, Telugu, Bengali, Marathi)

**Example Queries:**
- "How do I ask for directions in Hindi?"
- "What are essential phrases for auto drivers?"
- "How do I order food if I don't speak Hindi?"
- "Teach me emergency phrases"

---

### 8. **Legal & Cultural Rules Expert** 🔲 TODO
**Route:** `/api/india-insider-legal`  
**Purpose:** Explain Indian laws and cultural etiquette

**Capabilities:**
- Indian laws for foreigners (what's legal/illegal)
- Prohibited items (drugs, wildlife products, drones without permit)
- State-specific alcohol laws (Gujarat, Bihar = banned)
- Photography restrictions (military, airports)
- Dress codes (temples, conservative areas)
- Gender norms and LGBTQ+ considerations
- Religious site etiquette (remove shoes, cover head)
- Social customs (eating with right hand, respect elders)
- Consequences (fines, jail, deportation)

**Example Queries:**
- "What are the drug laws in India?"
- "Where can I and can't I take photos?"
- "What should I wear to temples?"
- "Is alcohol legal everywhere in India?"

---

## 📊 Type System (indiaInsiderTypes.ts)

### Core Types

```typescript
interface TouristProfile {
  nationality?: string;
  currentLocation?: string;
  destination?: string;
  arrivalDate?: string;
  departureDate?: string;
  travelPurpose?: 'tourism' | 'business' | 'medical' | 'education' | 'other';
  groupSize?: number;
  budget?: 'budget' | 'mid' | 'luxury';
  dietaryRestrictions?: string[];
  preferredLanguage?: SupportedLanguage;
}

interface EngineResponse {
  success: boolean;
  engine: string;
  response: string;
  warnings?: string[];
  actionItems?: string[];
  emergencyContacts?: EmergencyContact[];
}

type EngineIntent =
  | 'scheme_eligibility'
  | 'agriculture_farming'
  | 'pre_arrival'
  | 'city_navigation'
  | 'payment_money'
  | 'emergency_assistance'
  | 'food_safety'
  | 'expat_longstay'
  | 'language_survival'
  | 'legal_cultural'
  | 'general_query';
```

### Supported Languages
English, Chinese, Spanish, French, Arabic, Hindi, Tamil, Telugu, Bengali

---

## 🧠 AI Router (buaipRouter.ts)

### Intent Detection Algorithm

The router analyzes user queries using keyword matching and confidence scoring:

```typescript
function detectIntent(query: string, profile?: TouristProfile): IntentAnalysis {
  // Keyword-based intent detection
  // Confidence scoring (0.0 - 1.0)
  // Entity extraction (city, nationality, urgency)
  // Returns: primaryIntent, confidence, entities, alternateIntents
}
```

### Confidence Levels
- **0.95-1.0:** Emergency (immediate routing)
- **0.85-0.94:** High confidence (proceed)
- **0.75-0.84:** Moderate (proceed with caution)
- **0.0-0.74:** Low (may need clarification)

### Routing Logic

```typescript
const engineMap: Record<EngineIntent, { engine: string; endpoint: string }> = {
  scheme_eligibility: { engine: 'Unified AI', endpoint: '/api/unified-ai' },
  agriculture_farming: { engine: 'Annadata AI', endpoint: '/api/annadata-ai' },
  pre_arrival: { engine: 'Pre-Arrival Planner', endpoint: '/api/india-insider-prearival' },
  city_navigation: { engine: 'City Navigator', endpoint: '/api/india-insider-citynavigator' },
  payment_money: { engine: 'Payment Expert', endpoint: '/api/india-insider-payment' },
  emergency_assistance: { engine: 'Emergency', endpoint: '/api/india-insider-emergency' },
  // ... 4 more tourist engines
};
```

---

## 🚀 Usage Examples

### Example 1: Pre-Arrival Query

**User:** "I'm from Canada, what visa do I need for India?"

**Router Analysis:**
```json
{
  "primaryIntent": "pre_arrival",
  "confidence": 0.95,
  "entities": { "nationality": "Canada" },
  "route": "/api/india-insider-prearival"
}
```

**Response Includes:**
- e-Visa eligibility for Canadians
- Required documents
- Processing time (3-5 days)
- Cost ($10-100)
- Official URL: indianvisaonline.gov.in

---

### Example 2: Emergency Query

**User:** "I lost my passport in Delhi, what should I do?"

**Router Analysis:**
```json
{
  "primaryIntent": "emergency_assistance",
  "confidence": 0.98,
  "entities": {
    "emergencyType": "lost_passport",
    "location": "Delhi"
  },
  "route": "/api/india-insider-emergency"
}
```

**Response Includes:**
1. **Immediate Actions:**
   - File FIR at nearest police station
   - Contact Canadian Embassy (+91-11-4178-2000)
   - Apply for emergency travel document

2. **Documents Needed:**
   - FIR copy
   - Passport copy (if available)
   - Photos
   - Identity proof

3. **Embassy Location:**
   - 7/8 Shantipath, Chanakyapuri, New Delhi

---

### Example 3: City Navigation Query

**User:** "Best places to visit in Jaipur? Is it safe for solo women?"

**Router Analysis:**
```json
{
  "primaryIntent": "city_navigation",
  "confidence": 0.90,
  "entities": { "city": "Jaipur" },
  "route": "/api/india-insider-citynavigator"
}
```

**Response Includes:**
- Top 5 attractions (Amber Fort, City Palace, Hawa Mahal)
- Transport options (auto via Ola/Uber)
- Safety advice (Jaipur is safe during day, use caution at night)
- Common scams (gem export scam, auto overcharging)
- Budget (₹3,000-6,000/day for mid-range)

---

### Example 4: Payment Query

**User:** "What is UPI? Can I use it as a tourist?"

**Router Analysis:**
```json
{
  "primaryIntent": "payment_money",
  "confidence": 0.90,
  "entities": {},
  "route": "/api/india-insider-payment"
}
```

**Response Includes:**
- UPI explanation (instant payments, 99% adoption)
- Can foreigners use? YES (but need Indian bank + SIM)
- Setup process (5 steps)
- Apps (Google Pay, PhonePe, Paytm)
- Reality: Most tourists cannot set up UPI (stick to cash/cards)

---

## 🛠️ Completing the Remaining 4 Engines

### Pattern to Follow

Each engine follows this structure:

```typescript
// route.ts structure
import { NextRequest, NextResponse } from 'next/server';
import { invokeBedrockWithClaude } from '@/app/lib/aws/bedrockAI';
import { build[Engine]Prompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, [EngineType] } from '@/app/lib/indiaInsiderTypes';

export async function POST(request: NextRequest) {
  // 1. Parse request
  // 2. Build system prompt
  // 3. Call Bedrock
  // 4. Parse response into structured format
  // 5. Return JSON
}
```

### TODO: Create 4 Remaining Engines

#### 1. Food Safety Engine
**File:** `app/api/india-insider-foodsafety/route.ts`

**Parser Functions Needed:**
- `parseFoodSafetyResponse()` → FoodSafetyGuide
- Extract: safe foods, unsafe foods, water rules, restaurant tips
- Include dietary accommodations
- Illness prevention advice

**System Prompt:** Already created in `indiaInsiderPrompts.ts`

---

#### 2. Expat Longstay Engine
**File:** `app/api/india-insider-expat/route.ts`

**Parser Functions Needed:**
- `parseExpatResponse()` → ExpatGuide
- Extract: visa types, FRRO registration, banking, accommodation
- Include timeline for settling in
- Tax and legal obligations

**System Prompt:** Already created in `indiaInsiderPrompts.ts`

---

#### 3. Language Survival Engine
**File:** `app/api/india-insider-language/route.ts`

**Parser Functions Needed:**
- `parseLanguageResponse()` → LanguagePhrases[]
- Extract: phrases by category (greetings, directions, food, emergency)
- Include pronunciation guide
- Number system explanation

**System Prompt:** Already created in `indiaInsiderPrompts.ts`

---

#### 4. Legal & Cultural Rules Engine
**File:** `app/api/india-insider-legal/route.ts`

**Parser Functions Needed:**
- `parseLegalCulturalResponse()` → LegalRule[] + CulturalEtiquette[]
- Extract: laws, penalties, cultural dos/don'ts
- Include state-specific rules
- Religious site etiquette

**System Prompt:** Already created in `indiaInsiderPrompts.ts`

---

## 📝 Testing Guide

### Manual Testing

Test each engine with these queries:

**Pre-Arrival:**
```bash
curl -X POST http://localhost:3000/api/india-insider-prearival \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What visa do I need from USA?",
    "profile": { "nationality": "USA", "arrivalDate": "2024-06-01" }
  }'
```

**City Navigator:**
```bash
curl -X POST http://localhost:3000/api/india-insider-citynavigator \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What should I see in Delhi?",
    "profile": { "nationality": "USA" },
    "city": "Delhi"
  }'
```

**Payment:**
```bash
curl -X POST http://localhost:3000/api/india-insider-payment \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I use UPI?",
    "profile": { "budget": "mid" }
  }'
```

**Emergency:**
```bash
curl -X POST http://localhost:3000/api/india-insider-emergency \
  -H "Content-Type: application/json" \
  -d '{
    "query": "I lost my passport",
    "profile": { "nationality": "Canada", "currentLocation": "Delhi" },
    "emergency": "lost_passport"
  }'
```

---

## 🎯 Next Steps

### Immediate Tasks

1. **Complete 4 Remaining Engines** (Food, Expat, Language, Legal)
   - Copy pattern from existing engines
   - Use system prompts already created
   - Parse responses into structured types

2. **Create Router API Route** (`/api/buaip-router`)
   - Accept query + optional profile
   - Call `routeQuery()` from buaipRouter.ts
   - Return routing decision + reason

3. **Frontend Integration**
   - Create UI for India Insider AI
   - Input: User query + optional profile
   - Display routed engine and response
   - Multi-language support

4. **Testing**
   - Unit tests for router intent detection
   - Integration tests for all 8 engines
   - Edge cases (multi-intent queries, low confidence)

5. **Documentation**
   - User guide (how to use India Insider AI)
   - API documentation (endpoints, request/response formats)
   - Deployment guide

---

## 🔧 Architecture Benefits

### 1. **Modular Design**
Each engine is independent - can be developed, tested, and deployed separately.

### 2. **Type Safety**
Comprehensive TypeScript types ensure data consistency across engines.

### 3. **Intelligent Routing**
Central router analyzes intent and routes to appropriate engine automatically.

### 4. **Scalability**
Easy to add new engines (e.g., Shopping Assistant, Adventure Sports Guide).

### 5. **Multilingual Support**
All engines support 9 languages (English, Chinese, Spanish, French, Arabic, Hindi, Tamil, Telugu, Bengali).

### 6. **Integration with Existing BUAIP**
India Insider AI integrates seamlessly without modifying existing engines (unified-ai, annadata-ai, scheme-eligibility).

---

## 📚 File Reference

### Created Files ✅

| File | Purpose | Status |
|------|---------|--------|
| `app/lib/indiaInsiderTypes.ts` | Complete type system | ✅ Complete |
| `app/lib/indiaInsiderPrompts.ts` | All 8 engine system prompts | ✅ Complete |
| `app/lib/buaipRouter.ts` | Intent detection & routing | ✅ Complete |
| `app/api/india-insider-prearival/route.ts` | Pre-Arrival Planner | ✅ Complete |
| `app/api/india-insider-citynavigator/route.ts` | City Navigator | ✅ Complete |
| `app/api/india-insider-payment/route.ts` | Payment & Money | ✅ Complete |
| `app/api/india-insider-emergency/route.ts` | Emergency Assistant | ✅ Complete |

### TODO Files 🔲

| File | Purpose | Status |
|------|---------|--------|
| `app/api/india-insider-foodsafety/route.ts` | Food Safety | 🔲 TODO |
| `app/api/india-insider-expat/route.ts` | Expat Longstay | 🔲 TODO |
| `app/api/india-insider-language/route.ts` | Language Survival | 🔲 TODO |
| `app/api/india-insider-legal/route.ts` | Legal & Cultural | 🔲 TODO |
| `app/api/buaip-router/route.ts` | Router API endpoint | 🔲 TODO |

---

## 🎉 Success Criteria

India Insider AI will be complete when:

- ✅ **4 engines implemented** (Pre-Arrival, City Navigator, Payment, Emergency)
- 🔲 **4 engines remaining** (Food, Expat, Language, Legal)
- ✅ Router logic working (intent detection, confidence scoring)
- 🔲 Router API endpoint created
- 🔲 All engines tested with sample queries
- 🔲 Documentation complete
- 🔲 Frontend integration (optional but recommended)

---

## 🚀 Impact

When complete, India Insider AI will:

1. **Help 22 million annual tourists** navigate India safely
2. **Reduce tourist emergencies** through proactive guidance
3. **Improve India's tourism reputation** (safe, helpful, organized)
4. **Empower first-time visitors** with confidence
5. **Support expats settling in India** (FRRO, banking, housing)
6. **Bridge language barriers** with survival phrases
7. **Prevent legal/cultural mistakes** through education

---

**Status:** 4 of 8 engines complete (50% implementation)  
**Next Step:** Create remaining 4 engines using existing patterns and prompts  
**ETA:** 2-3 hours to complete all remaining engines

---

Built with ❤️ for travelers discovering incredible India 🇮🇳

# India Insider AI - Quick Reference

## 🚀 Quick Start

### What is India Insider AI?
8 specialized AI engines helping international tourists navigate India safely.

---

## 📱 The 8 Engines

### ✅ IMPLEMENTED (Ready to Use)

#### 1. 🛫 **Pre-Arrival Planner**
**When:** Before traveling to India  
**Helps with:** Visa, vaccinations, packing, SIM cards, customs  
**Endpoint:** `/api/india-insider-prearival`

**Example Questions:**
- "What visa do I need from [country]?"
- "What vaccinations do I need?"
- "What can I bring through customs?"

---

#### 2. 🗺️ **City Navigator**
**When:** Exploring Indian cities  
**Helps with:** Attractions, transport, scams, safety, budgets  
**Endpoint:** `/api/india-insider-citynavigator`

**Example Questions:**
- "What should I see in Delhi?"
- "Is [city] safe for solo women?"
- "How do I avoid taxi scams?"

---

#### 3. 💳 **Payment & Money**
**When:** Confused about Indian payments  
**Helps with:** UPI, ATMs, cash, currency exchange  
**Endpoint:** `/api/india-insider-payment`

**Example Questions:**
- "What is UPI?"
- "How much cash do I need daily?"
- "Where should I exchange money?"

---

#### 4. 🚨 **Emergency Assistant**
**When:** Urgent situations  
**Helps with:** Lost passport, medical emergencies, police reports, embassy contacts  
**Endpoint:** `/api/india-insider-emergency`

**Example Questions:**
- "I lost my passport, what do I do?"
- "I need a hospital urgently"
- "How do I file a police report?"

---

### ✅ IMPLEMENTED (Newly Added)

#### 5. 🍛 **Food Safety Intelligence**
**When:** Worried about getting sick  
**Helps with:** Street food safety, water rules, restaurant selection, allergy phrases  
**Endpoint:** `/api/india-insider-foodsafety`

---

#### 6. 🏡 **Expat Long-Stay Specialist**
**When:** Moving to India for 3+ months  
**Helps with:** FRRO, banking, renting, tenant rights, driving license, healthcare  
**Endpoint:** `/api/india-insider-expat`

---

#### 7. 🗣️ **Language Survival Teacher**
**When:** Don't speak local language  
**Helps with:** 20 essential phrases, pronunciation, context usage  
**Endpoint:** `/api/india-insider-language`

---

#### 8. ⚖️ **Legal & Cultural Rules Expert**
**When:** Unsure about laws/etiquette  
**Helps with:** Indian laws, dress codes, photography limits, religious customs  
**Endpoint:** `/api/india-insider-legal`

---

## 🧠 AI Router

**File:** `app/lib/buaipRouter.ts`

### How It Works
1. Analyzes user query
2. Detects intent with confidence score
3. Extracts entities (city, nationality, urgency)
4. Routes to appropriate engine

### Usage
```typescript
import { routeQuery } from '@/app/lib/buaipRouter';

const result = routeQuery(
  "I lost my passport in Delhi",
  { nationality: 'Canada', currentLocation: 'Delhi' }
);

// Result:
// {
//   engine: 'Emergency Assistant',
//   endpoint: '/api/india-insider-emergency',
//   intent: 'emergency_assistance',
//   confidence: 0.98,
//   reasoning: 'Intent: emergency_assistance (98%)'
// }
```

---

## 🔧 Engine Architecture

### Request Format
```typescript
{
  query: string;              // User question
  profile: TouristProfile;    // Optional visitor info
  [engineSpecific]: any;      // e.g., city, emergency
}
```

### Response Format
```typescript
{
  success: boolean;
  engine: string;
  response: string;           // AI-generated guidance
  [structuredData]: any;      // Parsed structured response
  profile: TouristProfile;
}
```

---

## 📞 Emergency Numbers (Quick Reference)

| Service | Number | Available |
|---------|--------|-----------|
| Police | 100 | 24/7 |
| Ambulance | 102 | 24/7 |
| National Emergency | 112 | 24/7 (all services) |
| Tourist Helpline | 1363 | 24/7 |
| Women's Helpline | 1091 | 24/7 |
| Fire | 101 | 24/7 |

---

## 💰 Money Quick Tips

### Daily Cash Needs
- **Budget:** ₹800-1,500 ($10-20)
- **Mid-range:** ₹1,500-3,000 ($20-40)
- **Luxury:** ₹2,000-5,000 ($25-60)

### UPI Reality for Tourists
- **Can foreigners use UPI?** Technically yes, but...
- **Requirements:** Indian bank account + Indian SIM card
- **Reality:** Most short-term tourists CANNOT set up UPI
- **Stick to:** Cash + international credit cards

### Best ATMs for Foreigners
1. HDFC Bank
2. ICICI Bank
3. Axis Bank
4. State Bank of India (SBI)

###Withdraw Strategy
- Withdraw ₹10,000-20,000 at once (fees per transaction)
- Use ATMs inside banks (safer)
- Cover PIN entry

---

## 🍛 Food Safety Rules

### ✅ SAFE
- Freshly cooked food
- Hot chai/coffee
- Street food from busy vendors
- Sealed packaged items
- Fresh coconut water (watch them open it)

### ❌ AVOID
- Tap water (even for brushing teeth)
- Ice in drinks (unless high-end restaurant)
- Pre-cut fruits (washed in tap water)
- Salads (raw vegetables)
- Food sitting out for hours

### Essential Items
- Bottled water (check seal)
- Hand sanitizer
- Imodium (diarrhea medication)
- ORS packets (rehydration)

---

## 🚕 Transport Apps

| App | Use | Foreigner-Friendly? |
|-----|-----|---------------------|
| Ola | Taxi/Auto | ✅ Yes |
| Uber | Taxi | ✅ Yes |
| Metro Apps | Delhi, Mumbai, Bangalore metros | ✅ Yes |
| Google Maps | Navigation | ✅ Yes |
| Google Pay | UPI payments | ❌ Needs Indian bank |
| Paytm | UPI, wallet | ⚠️ Limited use |

---

## 🏨 Accommodation Budget (Per Night)

| Type | Budget | Mid-Range | Luxury |
|------|--------|-----------|--------|
| Hostel | ₹300-800 ($4-10) | - | - |
| Budget Hotel | ₹800-1,500 ($10-20) | - | - |
| 3-Star Hotel | - | ₹2,000-4,000 ($25-50) | - |
| 4-Star Hotel | - | ₹4,000-8,000 ($50-100) | - |
| 5-Star Hotel | - | - | ₹8,000+ ($100+) |

---

## 👗 Dress Code Guide

### General Rules
- Cover knees and shoulders (conservative areas)
- Remove shoes before entering homes/temples
- Modest clothing in religious sites

### Temples (Hindu)
- No leather items inside
- Remove shoes
- Cover shoulders
- Women: avoid sleeveless tops

### Mosques (Muslim)
- Women: cover head (scarf provided)
- Remove shoes
- Modest clothing (long pants, sleeves)

### Churches (Christian)
- Smart casual
- Cover shoulders

### Beach/Goa
- Western clothing acceptable
- Swimwear only at beach (not in town)

---

## 🚫 Strictly Prohibited in India

### ILLEGAL (Serious Penalties)
- ❌ Drugs (even cannabis) - jail time
- ❌ Drones without permit
- ❌ Photography of military/airports
- ❌ Overstaying visa
- ❌ Working on tourist visa
- ❌ Wildlife products (ivory, fur)

### State-Specific Alcohol Bans
- Gujarat - Total alcohol ban
- Bihar - Total alcohol ban
- Nagaland - Total alcohol ban

---

## 🏥 Healthcare Tips

### Private vs Government Hospitals
- **Tourists:** Use private hospitals
  - English-speaking
  - Better facilities
  - Faster service
  - More expensive

### Top Hospital Chains
- Apollo
- Fortis
- Max
- Manipal

### Insurance
- Get international travel insurance
- Many hospitals require cash upfront
- Keep ALL receipts for claims

---

## 📍 City Safety Ratings

| City | Safety | Solo Women | Notes |
|------|--------|------------|-------|
| Delhi | ⚠️ Moderate | Caution | Scams common, safe during day |
| Mumbai | ✅ Safe | Good | Safe overall, avoid empty areas at night |
| Bangalore | ✅ Safe | Good | IT city, English-friendly |
| Jaipur | ✅ Safe | Good | Tourist-friendly, gem scams |
| Goa | ✅ Safe | Good | Very safe, relaxed vibe |
| Kerala | ✅ Very Safe | Excellent | Clean, tourist-friendly |

---

## 🧳 Essential Packing List

### Documents
- ✅ Passport (valid 6+ months)
- ✅ Visa documents
- ✅ Travel insurance
- ✅ Passport copies (keep separate)
- ✅ Emergency contacts

### Money
- ✅ Credit/debit cards (notify bank!)
- ✅ $200-500 USD cash
- ✅ Small denomination notes

### Medical
- ✅ Prescription medications (+ extra)
- ✅ Diarrhea medication (Imodium)
- ✅ Hand sanitizer
- ✅ Sunscreen
- ✅ Insect repellent

### Electronics
- ✅ Universal adapter (Type C, D, M)
- ✅ Power bank
- ✅ Phone + charger

### Clothing
- ✅ Modest clothing
- ✅ Comfortable walking shoes
- ✅ Light cotton clothes
- ✅ Scarf/shawl (temples)

---

## 🎯 When to Use Each Engine

```
Planning trip from home → Pre-Arrival Planner
Arrived in city → City Navigator
Confused about payments → Payment & Money
Emergency situation → Emergency Assistant
Worried about food → Food Safety Intelligence
Moving to India 3+ months → Expat Long-Stay Specialist
Language barrier → Language Survival Teacher
Unsure about laws/culture → Legal & Cultural Rules Expert
```

---

## 🔧 Testing Commands

### Pre-Arrival
```bash
curl -X POST http://localhost:3000/api/india-insider-prearival \
  -H "Content-Type: application/json" \
  -d '{"query":"What visa do I need from USA?","profile":{"nationality":"USA"}}'
```

### City Navigator
```bash
curl -X POST http://localhost:3000/api/india-insider-citynavigator \
  -H "Content-Type: application/json" \
  -d '{"query":"What to see in Delhi?","city":"Delhi","profile":{}}'
```

### Payment
```bash
curl -X POST http://localhost:3000/api/india-insider-payment \
  -H "Content-Type: application/json" \
  -d '{"query":"How do I use UPI?","profile":{"budget":"mid"}}'
```

### Emergency
```bash
curl -X POST http://localhost:3000/api/india-insider-emergency \
  -H "Content-Type: application/json" \
  -d '{"query":"I lost my passport","emergency":"lost_passport","profile":{"nationality":"Canada","currentLocation":"Delhi"}}'
```

### All 8 Engines (Single Run)
```bash
node test-india-insider-all-engines.js
# Optional if server is on a different port:
# BASE_URL=http://localhost:3001 node test-india-insider-all-engines.js
```

---

## 📊 Implementation Status

| Engine | Types | Prompt | API Route | Status |
|--------|-------|--------|-----------|--------|
| Pre-Arrival | ✅ | ✅ | ✅ | **Complete** |
| City Navigator | ✅ | ✅ | ✅ | **Complete** |
| Payment | ✅ | ✅ | ✅ | **Complete** |
| Emergency | ✅ | ✅ | ✅ | **Complete** |
| Food Safety | ✅ | ✅ | ✅ | **Complete** |
| Expat | ✅ | ✅ | ✅ | **Complete** |
| Language | ✅ | ✅ | ✅ | **Complete** |
| Legal | ✅ | ✅ | ✅ | **Complete** |

**Overall Progress:** 100% (8 of 8 engines complete)

---

## 🚀 Next Steps

1. ✅ Create types (indiaInsiderTypes.ts)
2. ✅ Create system prompts (indiaInsiderPrompts.ts)
3. ✅ Create router (buaipRouter.ts)
4. ✅ Create Pre-Arrival engine
5. ✅ Create City Navigator engine
6. ✅ Create Payment engine
7. ✅ Create Emergency engine
8. ✅ Create Food Safety engine
9. ✅ Create Expat engine
10. ✅ Create Language engine
11. ✅ Create Legal engine
12. ✅ Add all-8 integration test (`test-india-insider-all-engines.js`)
13. ✅ Test all engines end-to-end
14. 🔲 Create frontend UI (optional)

---

**Built for:** 22 million annual tourists to India  
**Impact:** Safer, more confident, better-informed travelers  
**Status:** Fully complete, all 8 engines implemented and tested  

🇮🇳 Welcome to Incredible India!

# PathAI — Career Intelligence Engine Implementation Complete ✅

## Overview

PathAI is BUAIP's 6th specialized engine, providing **honest career guidance** for Indian students. Unlike generic career advice tools, PathAI delivers ground truth about the real job market.

## 🎯 Core Purpose

PathAI gives students:
- ✅ Realistic career options based on their actual profile
- ✅ Real salary expectations (not inflated marketing numbers)
- ✅ Hiring requirements companies actually use
- ✅ Step-by-step roadmap to first job
- ✅ Survival guide for first-generation students

## System Architecture

### BUAIP Engine Ecosystem (6 Engines)

```
1️⃣ Government Scheme Intelligence    → /api/unified-ai
2️⃣ Agriculture Intelligence (Annadata) → /api/annadata-ai
3️⃣ Commerce Intelligence (GlobalSeller) → /api/globalseller-engine
4️⃣ Tourism Intelligence (India Insider) → /api/india-insider-*
5️⃣ Legal Intelligence (Nyay AI)      → /api/nyay-ai
6️⃣ 🎯 Career Intelligence (PathAI)   → /api/pathai ✨ NEW
```

## Files Created/Modified

### 1. Backend Engine
```
📁 aws-engines/
  └── pathaiEngine.ts ✨ NEW
      - Career matching logic
      - Profile analysis
      - First-gen detection
      - Phase handlers (matching, deepdive, roadmap, firstgen)
```

### 2. Engine Router
```
📁 aws-engines/
  └── engineRouter.ts ✅ MODIFIED
      - Added pathaiCareerHandler
      - Registered 'pathai' and 'pathaiCareer' routes
```

### 3. Client-Side Router
```
📁 BUAIP/app/lib/
  └── buaipRouter.ts ✅ MODIFIED
      - Added 'career_intelligence' intent type
      - Added career keyword detection
      - Routes career queries to /api/pathai
```

### 4. API Route
```
📁 BUAIP/app/api/pathai/
  └── route.ts ✨ NEW
      - POST handler for 4 phases
      - Claude AI integration
      - Phase-specific prompts
      - JSON response parsing
```

### 5. UI Components
```
📁 BUAIP/app/components/
  ├── PathAIIntakeFlow.tsx ✨ NEW
  │     - 8-question intake form
  │     - Progress tracking
  │     - Multi-select and single-select options
  │
  ├── CareerCard.tsx ✨ NEW
  │     - Career match display
  │     - Salary progression
  │     - Success rate & challenges
  │
  ├── RoadmapTimeline.tsx ✨ NEW
  │     - 5-phase expandable timeline
  │     - Skills, resources, projects, milestones
  │     - Print/email functionality
  │
  └── FirstGenGuide.tsx ✨ NEW
        - 9 tabbed sections
        - Email templates with copy function
        - Scholarships, banking, loans, networking
```

## User Flow

```
User query: "What should I do after 12th?"
     ↓
BUAIP Router detects: career_intelligence (94% confidence)
     ↓
Routes to: PathAI Engine (/api/pathai)
     ↓
Phase 1 — Profile Understanding (8 Questions)
     ↓
Phase 2 — Career Matching (3 best-fit careers)
     ↓
Phase 3 — Career Reality Map (deep dive)
     ↓
Phase 4 — Personal Roadmap (24-month plan)
     ↓
Phase 5 — First-Gen Guide (if applicable)
```

## Career Intent Detection

### Keywords Trigger PathAI

```typescript
const careerKeywords = [
  // Core career terms
  'career', 'future', 'what to do', 'after 12th', 'after graduation',
  'course', 'college', 'admission', 'engineering', 'mba', 'upsc',
  'government job', 'skill', 'roadmap', 'guidance', 'confused',
  'job', 'career path', 'profession', 'degree', 'diploma', 'study',
  
  // Specific queries
  'which course', 'which college', 'what should i study',
  'best career', 'career for me', 'engineering or mba',
  'confused about career', 'how to become', 'path to',
  
  // Hindi triggers
  'career kya karu', '12 ke baad kya', 'naukri kaise mile',
  'bhavishya', 'padhai kya karu', 'career confusion'
];
```

### Example Queries That Trigger PathAI

✅ "What should I do after 12th?"
✅ "Best career for me?"
✅ "Engineering or MBA?"
✅ "I'm confused about my future"
✅ "How to become data scientist?"
✅ "Which course should I take?"
✅ "Career roadmap for commerce student"
✅ "12 ke baad kya karu?" (Hindi)

## 8-Question Intake Form

### Q1 — Academic Stream
- Science PCM / PCB
- Commerce
- Arts / Humanities
- Diploma / Vocational
- Already in College / Working

### Q2 — Genuine Interests (Multi-select)
- Technology, Math/Logic, Design/Art
- Sales/Persuasion, Healthcare, Law/Justice
- Data Analysis, Nature/Environment
- Teaching, Business/Finance, Media/Storytelling, Mechanical Building

### Q3 — Academic Situation
- Top of class (90+)
- Above average (75-90)
- Average (60-75)
- Below average (<60)
- Marks don't define me

### Q4 — Family Income
- Below ₹2.5L
- ₹2.5L–₹8L
- ₹8L–₹20L
- Above ₹20L

### Q5 — Location
- Metro City / Tier-2 City / Small Town / Rural
- Willing to Relocate

### Q6 — Constraints (Multi-select)
- Cannot afford expensive college
- Need to earn quickly
- Cannot move from city
- English difficulty
- First-generation college student
- No constraints

### Q7 — Career Priorities (Select top 3)
- High Salary, Job Security, Prestige
- Work-Life Balance, Fast Growth
- Meaningful Work, Entrepreneurship
- Stay in My City

### Q8 — Existing Achievements (Multi-select)
- Built Project, Internship, Competition Win
- Skill Certificate, Small Business
- Volunteer Work, Starting Fresh

## API Endpoints

### POST /api/pathai

**Phase 1: Career Matching**
```json
{
  "phase": "matching",
  "profile": {
    "academicStream": "science_pcm",
    "interests": ["technology", "data_analysis"],
    "academicSituation": "above_average",
    "familyIncome": "2_5L_to_8L",
    "location": "tier2",
    "constraints": ["cannot_afford_expensive_college"],
    "careerPriorities": ["high_salary", "job_security", "fast_growth"],
    "existingAchievements": ["built_project"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "engine": "PathAI",
  "phase": "matching",
  "careers": [
    {
      "name": "Data Scientist",
      "matchScore": 87,
      "matchReason": "Strong math background and tech interest...",
      "salaryYear1": "₹6–12L",
      "salaryYear5": "₹25–50L",
      "salaryYear10": "₹60L–1.5Cr",
      "timeToJob": "2–3 years",
      "investmentNeeded": "₹0–2L",
      "successRate": "Medium - 45% placement",
      "biggestChallenge": "Learning curve is steep",
      "bestAdvantage": "Can learn everything free online"
    },
    // ... 2 more careers
  ],
  "firstGenFlag": true,
  "timestamp": 1234567890
}
```

**Phase 2: Career Deep Dive**
```json
{
  "phase": "deepdive",
  "career": "Data Scientist"
}
```

**Response:**
```json
{
  "success": true,
  "engine": "PathAI",
  "phase": "deepdive",
  "career": "Data Scientist",
  "careerReality": {
    "dayInLife": "...",
    "whatCompaniesWant": [...],
    "skillsInOrder": [...],
    "freeResources": [...],
    "projectsToBuild": [...],
    "salaryReality": "...",
    "collegesThatPlace": [...],
    "entranceExams": [...],
    "realisticTimeline": "...",
    "commonMistakes": [...],
    "successStories": "..."
  }
}
```

**Phase 3: Personal Roadmap**
```json
{
  "phase": "roadmap",
  "career": "Data Scientist"
}
```

**Response:**
```json
{
  "success": true,
  "engine": "PathAI",
  "phase": "roadmap",
  "roadmap": [
    {
      "phase": "THIS_MONTH",
      "duration": "Month 0-1",
      "skillsToLearn": [...],
      "resources": [...],
      "projects": [...],
      "milestones": [...],
      "mistakesToAvoid": [...]
    },
    // 4 more phases
  ]
}
```

**Phase 4: First-Gen Guide**
```json
{
  "phase": "firstgen",
  "profile": { /* student profile */ }
}
```

**Response:**
```json
{
  "success": true,
  "engine": "PathAI",
  "phase": "firstgen",
  "firstGenGuide": {
    "collegeApplications": "...",
    "emailTemplates": [...],
    "networking": "...",
    "impostorSyndrome": "...",
    "moneyManagement": "...",
    "scholarships": [...],
    "studentBankAccount": "...",
    "educationLoans": "...",
    "internshipOutreach": "..."
  }
}
```

## AI Prompts

PathAI uses **Claude Sonnet 4** (`claude-sonnet-4-20250514`) for all career intelligence.

### Matching Prompt
- Analyzes student profile against Indian job market reality
- Returns exactly 3 career matches
- Includes honest salary ranges, success rates, challenges
- Determines first-gen flag

### Deep Dive Prompt
- Provides comprehensive career reality map
- What companies actually want (not what colleges teach)
- Free resources with URLs
- Portfolio projects that get noticed
- Common mistakes that kill chances

### Roadmap Prompt
- Creates detailed 24-month plan
- 5 phases with specific actionable steps
- Exact courses/resources with URLs
- Measurable milestones per phase

### First-Gen Prompt
- Comprehensive survival guide
- Email templates for professional communication
- Scholarship strategies
- Banking, loans, networking advice
- Assumes zero "insider knowledge"

## Component Usage

### Using PathAI Intake Flow
```tsx
import PathAIIntakeFlow from '@/app/components/PathAIIntakeFlow';

<PathAIIntakeFlow
  onComplete={(profile) => {
    // Handle profile submission
    // Call /api/pathai with phase: 'matching'
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

### Using Career Cards
```tsx
import CareerCard from '@/app/components/CareerCard';

careers.map((career, index) => (
  <CareerCard
    key={index}
    career={career}
    index={index}
    onExploreRoadmap={(careerName) => {
      // Handle roadmap exploration
      // Call /api/pathai with phase: 'deepdive'
    }}
  />
))
```

### Using Roadmap Timeline
```tsx
import RoadmapTimeline from '@/app/components/RoadmapTimeline';

<RoadmapTimeline
  roadmap={roadmapData}
  careerName="Data Scientist"
  onBack={() => {
    // Navigate back to career options
  }}
/>
```

### Using First-Gen Guide
```tsx
import FirstGenGuide from '@/app/components/FirstGenGuide';

<FirstGenGuide
  guide={firstGenGuideData}
  onClose={() => {
    // Handle close
  }}
/>
```

## Testing PathAI

### 1. Test Intent Detection
```bash
# In BUAIP chat, type:
"What should I do after 12th?"
"Best career for me?"
"I'm confused about my future"

# Should route to PathAI (check console logs)
```

### 2. Test Intake Flow
- Answer all 8 questions
- Verify profile is captured correctly
- Check progress bar advances

### 3. Test Career Matching
```bash
# API Test
curl -X POST http://localhost:3000/api/pathai \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "matching",
    "profile": {
      "academicStream": "science_pcm",
      "interests": ["technology"],
      "academicSituation": "above_average",
      "familyIncome": "2_5L_to_8L",
      "location": "tier2",
      "constraints": [],
      "careerPriorities": ["high_salary"],
      "existingAchievements": []
    }
  }'
```

### 4. Test Full Flow
1. Start with career query
2. Complete 8-question intake
3. View 3 career matches
4. Explore roadmap for one career
5. If first-gen, view survival guide

## Environment Variables Required

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## AWS Production Deployment (Future)

When deploying to AWS, PathAI will leverage:

- **Amazon Transcribe** — Voice input for career queries
- **Amazon Comprehend** — Extract interests/emotions from text
- **Amazon Personalize** — ML-based career recommendations
- **Amazon Bedrock** — Generate career insights
- **Amazon Kendra** — Search career knowledge base
- **Amazon Translate** — Multi-language support
- **Amazon Polly** — Voice explanation of careers
- **Amazon SES** — Email roadmap PDF to student
- **Amazon SNS** — Monthly progress reminders
- **Amazon DynamoDB** — Store student profiles
- **Amazon S3** — Store career datasets
- **AWS Lambda** — Orchestration

## Strict Implementation Rules

### ✅ ONLY ADDED
- PathAI engine module
- Career intent detection in router
- 8 intake question components
- PathAI API route
- PathAI prompts and AI functions
- Career cards renderer
- Roadmap timeline renderer
- First-gen guide renderer

### ⛔ DID NOT MODIFY
- BUAIP core UI
- BUAIP router core logic
- Scheme engine
- Agriculture engine
- Nyay AI engine
- Commerce engine
- Tourism engine

All other engines remain untouched. PathAI is a clean extension following BUAIP's existing patterns.

## Key Features

### 1. Honest Career Guidance
- Real salary ranges (not marketing fluff)
- Actual success rates
- Genuine challenges
- Ground truth about hiring

### 2. Personalized Roadmaps
- Based on actual student profile
- Considers constraints (money, location, English)
- Specific resources with URLs
- Month-by-month actionable plan

### 3. First-Gen Support
- Email templates for professional communication
- Networking strategies from zero
- Handling impostor syndrome
- Money management basics
- Scholarship opportunities
- Education loan guidance

### 4. Indian Context
- Hindi language support
- Tier-2/Tier-3 city considerations
- Low-income family guidance
- Indian job market reality
- Entrance exam awareness
- College placement reality

## Success Metrics

Track these to measure PathAI effectiveness:

1. **Engagement**: % of career queries that complete intake
2. **Satisfaction**: User feedback on career matches
3. **Action**: % who download/email roadmap
4. **First-Gen**: % who access survival guide
5. **Completion**: % who follow roadmap milestones

## Next Steps

1. ✅ PathAI engine created
2. ✅ Router updated with career detection
3. ✅ API route implemented
4. ✅ UI components created
5. 🔄 **Next: Integration testing**
6. 🔄 **Next: User feedback collection**
7. 🔄 **Next: Claude prompt refinement**
8. 🔄 **Next: AWS deployment**

## Summary

PathAI is now fully integrated into BUAIP as the 6th specialized engine. Students can ask career questions in natural language, complete a thoughtful intake process, and receive:

- **3 personalized career matches**
- **Honest reality about each career**
- **24-month actionable roadmap**
- **First-gen survival guide** (if needed)

All powered by Claude AI with prompts optimized for **truthful, actionable career guidance** in the Indian context.

---

**PathAI — Career Reality + First-Gen Navigator** ✅ Implementation Complete

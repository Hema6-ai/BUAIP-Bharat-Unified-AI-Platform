# PathAI Quick Reference Guide

## 🎯 What is PathAI?

PathAI is BUAIP's **6th specialized engine** providing honest career guidance for Indian students. Unlike generic tools, PathAI delivers **ground truth** about the real job market.

## Quick Start

### 1. User Types Career Query
```
"What should I do after 12th?"
"Best career for me?"
"Engineering or MBA?"
"I'm confused about my future"
```

### 2. BUAIP Auto-Routes to PathAI
- Detection confidence: 88-94%
- Keywords: career, future, after 12th, confused, course, etc.
- Hindi support: "career kya karu", "12 ke baad kya"

### 3. PathAI Flow (5 Phases)
```
Phase 1: Profile Intake (8 Questions)
    ↓
Phase 2: Career Matching (3 Best-Fit Careers)
    ↓
Phase 3: Career Reality Map (Deep Dive)
    ↓
Phase 4: Personal Roadmap (24-Month Plan)
    ↓
Phase 5: First-Gen Guide (If Applicable)
```

## Files at a Glance

| File | Purpose | Status |
|------|---------|--------|
| `aws-engines/pathaiEngine.ts` | Backend engine logic | ✅ NEW |
| `aws-engines/engineRouter.ts` | Engine registration | ✅ MODIFIED |
| `app/lib/buaipRouter.ts` | Intent detection | ✅ MODIFIED |
| `app/api/pathai/route.ts` | API endpoint | ✅ NEW |
| `app/components/PathAIIntakeFlow.tsx` | 8-question form | ✅ NEW |
| `app/components/CareerCard.tsx` | Career display | ✅ NEW |
| `app/components/RoadmapTimeline.tsx` | Roadmap view | ✅ NEW |
| `app/components/FirstGenGuide.tsx` | Survival guide | ✅ NEW |

## API Quick Test

### Test Career Matching
```bash
curl -X POST http://localhost:3000/api/pathai \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "matching",
    "profile": {
      "academicStream": "science_pcm",
      "interests": ["technology", "data_analysis"],
      "academicSituation": "above_average",
      "familyIncome": "2_5L_to_8L",
      "location": "tier2",
      "constraints": ["cannot_afford_expensive_college"],
      "careerPriorities": ["high_salary", "fast_growth", "job_security"],
      "existingAchievements": ["built_project"]
    }
  }'
```

### Test Deep Dive
```bash
curl -X POST http://localhost:3000/api/pathai \
  -H "Content-Type: application/json" \
  -d '{
    "phase": "deepdive",
    "career": "Data Scientist"
  }'
```

## 8 Intake Questions

1. **Academic Stream** (single) — PCM, PCB, Commerce, Arts, Diploma, College, Working
2. **Interests** (multi) — Technology, Math, Design, Sales, Healthcare, Law, etc.
3. **Academic Situation** (single) — Top 90+, Above avg, Average, Below avg, Marks don't define
4. **Family Income** (single) — <2.5L, 2.5L-8L, 8L-20L, >20L
5. **Location** (single) — Metro, Tier-2, Small town, Rural, Willing to relocate
6. **Constraints** (multi) — Afford, Earn quickly, Can't move, English, First-gen, None
7. **Career Priorities** (multi, top 3) — Salary, Security, Prestige, Balance, Growth, Meaning, Entrepreneurship, Stay
8. **Achievements** (multi) — Project, Internship, Competition, Certificate, Business, Volunteer, Fresh

## Career Card Output

Each career shows:
- **Match Score** (%)
- **Match Reason** (why it fits)
- **Salary Journey** (Year 1, 5, 10)
- **Time to Job** (realistic timeline)
- **Investment** (₹ needed)
- **Success Rate** (honest %)
- **Biggest Challenge**
- **Best Advantage**
- **Explore Roadmap** button

## Roadmap Structure

5 phases, each with:
- **Skills to Learn** (priority order)
- **Resources** (with URLs)
- **Projects to Build** (portfolio)
- **Milestones** (measurable goals)
- **Mistakes to Avoid** (common pitfalls)

Phases:
1. THIS_MONTH (Month 0-1)
2. MONTHS_2_TO_6
3. MONTHS_7_TO_12
4. MONTHS_13_TO_18
5. MONTHS_19_TO_24

## First-Gen Guide Tabs

9 sections:
1. 🎓 **College Applications** — Step-by-step, fee waivers, documents
2. ✉️ **Email Templates** — Professional communication examples
3. 🤝 **Networking** — Building connections from zero
4. 💪 **Confidence** — Overcoming impostor syndrome
5. 💰 **Money** — Student budgeting
6. 🎁 **Scholarships** — Accessible opportunities
7. 🏦 **Banking** — Zero-balance accounts
8. 💳 **Loans** — When to take, how to repay
9. 💼 **Internships** — Cold outreach strategies

## Career Keywords (Auto-Detection)

**English:**
- career, future, what to do, after 12th, course, college, admission
- engineering, mba, upsc, government job, skill, roadmap, guidance
- confused, job, career path, profession, degree, diploma, study
- which course, best career, how to become, career options

**Hindi:**
- career kya karu, 12 ke baad kya, naukri kaise mile
- bhavishya, padhai kya karu, career confusion

## Environment Setup

Add to `.env.local`:
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

## Integration Points

### In Chat Interface
When user asks career question:
1. Router detects `career_intelligence` intent
2. Routes to `/api/pathai`
3. Show intake flow
4. Display results in chat

### Standalone Page (Future)
Create dedicated page: `/app/pathai/page.tsx`

## Component Examples

### Use Intake Flow
```tsx
import PathAIIntakeFlow from '@/app/components/PathAIIntakeFlow';

<PathAIIntakeFlow
  onComplete={(profile) => {
    // Submit to API
    fetch('/api/pathai', {
      method: 'POST',
      body: JSON.stringify({ phase: 'matching', profile })
    });
  }}
/>
```

### Display Career Cards
```tsx
import CareerCard from '@/app/components/CareerCard';

{careers.map((career, i) => (
  <CareerCard
    key={i}
    career={career}
    index={i}
    onExploreRoadmap={(name) => {
      // Fetch deepdive
    }}
  />
))}
```

## Testing Checklist

- [ ] Type "What should I do after 12th?" in chat
- [ ] Router detects career_intelligence intent
- [ ] Intake flow shows (8 questions, progress bar)
- [ ] Complete all questions
- [ ] 3 career cards appear
- [ ] Click "Explore Roadmap"
- [ ] Roadmap shows 5 phases
- [ ] Expand/collapse works
- [ ] If first-gen, guide appears
- [ ] Email templates copyable

## Debug Tips

### Router Not Detecting Career Intent?
Check `app/lib/buaipRouter.ts`:
- Ensure `career_intelligence` added to type
- Verify keywords array
- Check confidence threshold (should be 88-94%)

### API Errors?
Check:
- `ANTHROPIC_API_KEY` in `.env.local`
- Claude API quota/limits
- Console logs in `/api/pathai/route.ts`

### UI Not Rendering?
- Import components correctly
- Check state management
- Verify data structure matches types

## AI Model

**Model:** `claude-sonnet-4-20250514`
**Max Tokens:** 3000 per phase
**Response:** Structured JSON

## Future AWS Deployment

Will use:
- Lambda (orchestration)
- Bedrock (AI)
- DynamoDB (profiles)
- S3 (datasets)
- SES (email roadmaps)
- SNS (progress reminders)
- Transcribe (voice input)
- Translate (multilingual)

## Key Principles

1. **Honesty** — Real salaries, success rates, challenges
2. **Actionable** — Specific resources, projects, steps
3. **Realistic** — Match to actual profile constraints
4. **Indian Context** — Tier-2/3 cities, low income, first-gen
5. **Ground Truth** — What companies actually want

## Support

For issues or questions:
- Check [PATHAI_ENGINE_COMPLETE.md](PATHAI_ENGINE_COMPLETE.md) for full docs
- Review console logs for routing/API errors
- Test API endpoints directly with curl

---

**PathAI** — Honest career guidance that actually works ✅

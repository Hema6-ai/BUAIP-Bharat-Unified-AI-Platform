# Policy Engine - Quick Reference

## 🚀 Quick Start

### 1. Start Dev Server
```bash
npm run dev
```

### 2. View Policy Analysis
```
http://localhost:3000/admin-dashboard
```

### 3. Access API
```bash
curl http://localhost:3000/api/policy-analysis | jq .
```

---

## 📊 What the Policy Engine Does

### Input
- 5,000 synthetic citizen records from `public/government_usage_dataset.csv`
- Fields: user, district, scheme, applied, approved, income band, etc.

### Processing
- Aggregates by district and income band
- Computes application & approval rates
- Detects policy gaps via 4 rule-based logic
- Generates human-readable insights

### Output
```json
{
  "districtInsights": [
    {
      "district": "Mumbai",
      "applicationRate": 0.62,
      "approvalRate": 0.68,
      "policyGaps": [
        {
          "type": "equity_gap",
          "severity": "high",
          "details": "Low-income approval 25% vs Middle 48%"
        }
      ],
      "recommendations": [
        "Establish support for low-income applicants"
      ]
    }
  ],
  "utilizationRanking": [...],
  "underservedSegments": [...],
  "policyGapsSummary": {...}
}
```

---

## 🎯 The 4 Policy Gap Rules

| Rule | Trigger | Impact | Example |
|------|---------|--------|---------|
| **Low Awareness** | app_rate < 40% | Citizens don't know about schemes | "District X: 15% apply - need awareness campaign" |
| **Eligibility Barrier** | apr_rate < 50% | Complex requirements/docs | "District Y: 32% approved - simplify eligibility" |
| **Equity Gap** | low_income < middle_income | Vulnerable excluded | "Low-income: 25% vs Middle: 48%" |
| **Trust Deficit** | scheme_shown > 20 & app < 30% | Citizens don't trust scheme | "Samarth Scheme: Shown 35 times but 8% apply" |

---

## 📁 File Structure

```
app/
├── lib/
│   └── policyEngine.ts          # Core logic (1,100 lines)
├── api/
│   └── policy-analysis/
│       └── route.ts             # GET endpoint
├── components/
│   └── PolicyAnalysisViewer.tsx # Dashboard (700 lines)
└── admin-dashboard/
    └── page.tsx                 # Viewer integration

public/
└── government_usage_dataset.csv  # 5,000 records
```

---

## 🔧 API Reference

### GET `/api/policy-analysis`

Returns complete analysis (takes ~200ms).

```bash
curl "http://localhost:3000/api/policy-analysis?district=Mumbai"
```

**Response Fields**:
- `timestamp` - Analysis run time
- `totalRecords` - 5000 (dataset size)
- `uniqueDistricts` - 148 analyzed
- `districtInsights` - Per-district analysis
- `utilizationRanking` - Performance ranking (1-148)
- `underservedSegments` - Vulnerable populations
- `recommendations` - System-level actions
- `policyGapsSummary` - Gap categorization

---

## 💡 Example Insights Generated

### For a District with Equity Gap
```
"District X: Low-income citizens have 40% lower approval rates 
than middle-income counterparts. 

ACTION: Establish dedicated support centers with document 
assistance and multilingual guidance."
```

### For a Low-Trust Scheme
```
"Samarth Scheme shown 35 times but only 8% of viewers applied.

ACTION: Launch beneficiary testimonials and success stories to 
build trust and address misconceptions."
```

### Systemic Recommendation
```
"24 districts show <40% application rate (low awareness).

ACTION: Launch state-level mass media campaign highlighting 
scheme benefits and eligibility criteria."
```

---

## 📈 Key Metrics Explained

| Metric | Formula | What It Means |
|--------|---------|---------------|
| **Application Rate** | applied ÷ total | % who took action after seeing scheme |
| **Approval Rate** | approved ÷ applied | % who were successfully approved |
| **Overall Score** | (app × 0.4) + (apr × 0.6) | Weighted district performance (60% weight on approval) |

---

## 🎯 Dashboard Features

### Overview Tab
- Key statistics (total records, districts, gaps detected)
- Top 5 performing districts
- System-level recommendations

### Districts Tab
- Select any of 148 districts
- View application/approval rates
- See detected policy gaps
- Read district-specific recommendations

### Gaps Tab
- Low Awareness Zones (list of districts)
- Eligibility Barriers (list of districts)
- Equity Gaps (where vulnerable excluded)
- Trust Deficit Schemes (list of schemes)

### Recommendations Tab
- Ranked by applicability
- District-specific action items
- Actionable language

---

## 🔍 Understanding the Outputs

### `districtInsights` Array
One entry per district. Each contains:
- Basic metrics (app rate, approval rate)
- Detected policy gaps
- Top 3 schemes shown
- Recommendations for that district

### `utilizationRanking` Array
Districts ranked 1-148 by overall performance score.

```
Rank 1: Mumbai (score 0.66)
Rank 2: Hyderabad (score 0.64)
...
Rank 148: District Z (score 0.12)
```

### `underservedSegments` Array
Income bands with lower approval rates:
```
{
  "district": "East Garo Hills",
  "incomeBand": "Low",
  "approvalRate": 0.35,
  "supportNeeded": "Simplified documentation, guided assistance"
}
```

### `policyGapsSummary` Object
Lists all districts/schemes with issues:
```json
{
  "lowAwarenessZones": ["Godda", "Zunheboto", ...],
  "eligibilityBarriers": ["Champa", "Dhalai", ...],
  "equityGaps": ["East Garo Hills", ...],
  "trustDeficitSchemes": ["ADIP Scheme", ...]
}
```

---

## 🚨 Severity Levels

### Low
- Issue affects small percentage
- Manageable within current resources
- Standard intervention sufficient

### Medium
- Affects 20-50% in affected segment
- Requires targeted intervention
- Should address within 1-2 months

### High
- Affects >50% or vulnerable population
- Requires urgent intervention
- Critical for equity & inclusion
- Escalate to leadership

---

## 🛠️ How It Works (Technical)

1. **CSV Load** → Parse 5,000 records
2. **Aggregation** → Group by district+income_band
3. **Metrics** → Calculate rates (app, approval)
4. **Rule Check** → Apply 4 gap detection rules
5. **Scoring** → Assign severity
6. **Ranking** → Score and rank districts
7. **Insights** → Generate recommendations
8. **Output** → Return structured JSON

**Time**: ~200ms total

**Approach**: Pure statistics + rule-based logic (no ML)

---

## 🔄 Next Steps

### Immediate
- ✅ View admin-dashboard to see policy analysis
- ✅ Test `/api/policy-analysis` endpoint
- ✅ Review detected policy gaps

### Short-term (Next)
- Integrate with Bedrock AI for natural language insights
- Add real-time monitoring dashboard
- Create policy action tracker

### Long-term (Future)
- Connect to live citizen application data
- Monitor policy impact over time
- Predict which districts will cross thresholds
- Automated escalations

---

## 📞 Support

- **Technical Details**: `POLICY_ENGINE_GUIDE.md`
- **Implementation**: `POLICY_ENGINE_IMPLEMENTATION.md`
- **Citizen Dashboard**: `CITIZEN_DASHBOARD_GUIDE.md`
- **General Help**: `QUICK_START.md`

---

## 🎓 Key Concepts

**Governance Intelligence**: Using data to understand how government schemes reach citizens.

**Policy Gaps**: Specific problems preventing citizens from accessing schemes (awareness, eligibility, trust, equity).

**Applied AI Reasoning**: Smart rules that detect patterns without machine learning.

**Actionable Insights**: Turning data into specific recommendations for improvement.

---

## ✨ Example: Complete Flow

1. **Admin opens** `http://localhost:3000/admin-dashboard`
2. **System loads** 5,000 citizen records
3. **Engine analyzes** in ~200ms
4. **Detects** 12 low-awareness districts + 5 trust-deficit schemes + 6 equity gaps
5. **Admin clicks on** "Godda" district
6. **Sees**:
   - 18% application rate (Low Awareness detected)
   - 0% approval rate for low-income (Equity Gap detected)
   - Recommendation: "Launch awareness campaign and support low-income applicants"
7. **Admin notes** and schedules action
8. **Days later**, sees improvement in data

---

**Policy Engine Ready to Power Governance Intelligence! 🚀**

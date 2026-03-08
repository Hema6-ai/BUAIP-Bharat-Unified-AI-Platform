# Policy Engine - Governance Analytics Module

## Overview

The **Policy Engine** (`app/lib/policyEngine.ts`) is an applied AI reasoning module that analyzes government welfare scheme utilization data to detect policy gaps, inefficiencies, and opportunities.

**Key Principle**: This is NOT machine learning — it's **structured reasoning using statistics + rule-based logic**.

## Architecture

### Core Components

1. **Data Loading & Parsing**
   - Reads `public/government_usage_dataset.csv` (5,000 citizen records)
   - Parses CSV with robust error handling
   - Validates required fields

2. **Data Aggregation**
   - Groups by district, income band, scheme
   - Computes key metrics (application rate, approval rate)
   - Builds breakdown matrices

3. **Policy Gap Detection**
   - Rule-based logic to identify 4 types of gaps
   - Severity scoring (low/medium/high)
   - Context-aware details

4. **Insight Generation**
   - Translates raw metrics into human-readable insights
   - Generates actionable recommendations
   - Prioritizes by segment and severity

## Data Processing Pipeline

```
CSV Load
  ↓
Parse & Validate
  ↓
Aggregate by District
  ↓
Calculate Metrics
  ↓
Detect Policy Gaps (4 rules)
  ↓
Generate Insights & Recommendations
  ↓
Return Structured Output
```

## Key Metrics Computed

### At District Level

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| **Application Rate** | applied / total users | % of citizens who applied for schemes |
| **Approval Rate** | approved / applied | % of applications that were approved |
| **Scheme Popularity** | count | How many times a scheme was shown to citizens |
| **Income Band Breakdown** | segmented by Low/Middle/High | Per-segment approval/application rates |

### Scheme Level

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| **Visibility** | times_shown | How widely a scheme is advertised |
| **Application Rate** | times_applied / times_shown | Conversion from awareness to application |
| **Approval Rate** | times_approved / times_applied | Final success rate |

## Policy Gap Detection Rules

### 1. Low Awareness Zone
**Trigger**: `application_rate < 40%`

```typescript
if (metrics.applicationRate < 0.4) {
  severity = metrics.applicationRate < 0.2 ? "high" : "medium";
  details = `Only ${rate}% of citizens applying for schemes`;
}
```

**Implication**: Citizens aren't aware of scheme benefits or eligibility.

**Recommendations**:
- Mass awareness campaigns
- Local grassroots outreach
- Partner with NGOs
- Mobile enrollment units

---

### 2. Eligibility Barrier
**Trigger**: `approval_rate < 50%`

```typescript
if (metrics.approvalRate < 0.5 && metrics.appliedCount > 0) {
  severity = metrics.approvalRate < 0.3 ? "high" : "medium";
  details = `Only ${rate}% of applications approved`;
}
```

**Implication**: Complex eligibility criteria or incomplete documentation required.

**Recommendations**:
- Simplify eligibility requirements
- Conduct eligibility workshops
- Dedicated document verification
- Application assistance centers

---

### 3. Equity Gap
**Trigger**: `low_income_approval < middle_income_approval`

```typescript
if (lowIncomApprovalRate < middleIncomeApprovalRate) {
  severity = lowIncomApprovalRate === 0 ? "high" : "medium";
  metric = middleIncomeApprovalRate - lowIncomApprovalRate;
}
```

**Implication**: Schemes not serving most vulnerable populations equally.

**Recommendations**:
- Targeted support for low-income applicants
- Language/literacy support
- Community liaisons
- Financial assistance (application fees waived)

---

### 4. Trust Deficit Scheme
**Trigger**: `(scheme_visibility > 20) AND (application_rate < 30%)`

```typescript
if (stats.timesShown > 20 && stats.applicationRate < 0.3) {
  severity = stats.applicationRate < 0.15 ? "high" : "medium";
  details = `"${scheme}" shown many times but ${rate}% apply`;
}
```

**Implication**: Scheme is well-known but citizens don't trust it or don't see themselves as eligible.

**Recommendations**:
- Success story campaigns
- Testimonials from beneficiaries
- Trust-building initiatives
- Address misconceptions

---

## API Endpoints

### GET `/api/policy-analysis`

Returns complete policy landscape analysis.

**Response**:
```json
{
  "timestamp": "2026-03-01T12:00:00Z",
  "totalRecords": 5000,
  "uniqueDistricts": 148,
  "districtInsights": [
    {
      "district": "Mumbai",
      "state": "Maharashtra",
      "applicationRate": 0.62,
      "approvalRate": 0.68,
      "totalUsers": 45,
      "policyGaps": [],
      "topSchemes": [
        {"name": "Ayushman Bharat PM-JAY", "count": 12}
      ],
      "recommendations": ["Launch targeted schemes..."]
    }
  ],
  "utilizationRanking": [
    {
      "district": "Mumbai",
      "applicationRate": 0.62,
      "approvalRate": 0.68,
      "overallScore": 0.66,
      "ranking": 1
    }
  ],
  "underservedSegments": [
    {
      "district": "Godda",
      "incomeBand": "Low",
      "approvalRate": 0.35,
      "gapReason": "Lower approval compared to higher income",
      "supportNeeded": "Simplified docs, guided assistance"
    }
  ],
  "recommendations": ["Launch state-level campaign..."],
  "policyGapsSummary": {
    "lowAwarenessZones": ["Godda", "Zunheboto"],
    "eligibilityBarriers": ["Champa", "Dhalai"],
    "equityGaps": ["East Garo Hills"],
    "trustDeficitSchemes": ["ADIP Scheme", "Samarth Scheme"]
  }
}
```

## Type Definitions

```typescript
interface PolicyEngineOutput {
  timestamp: string;
  totalRecords: number;
  uniqueDistricts: number;
  
  districtInsights: DistrictInsight[];  // Per-district analysis
  utilizationRanking: UtilizationRank[]; // Performance ranking
  underservedSegments: UnderservedSegment[]; // At-risk groups
  recommendations: string[];  // System-level actions
  policyGapsSummary: {
    lowAwarenessZones: string[];
    eligibilityBarriers: string[];
    equityGaps: string[];
    trustDeficitSchemes: string[];
  };
}

interface DistrictInsight {
  district: string;
  state: string;
  applicationRate: number;      // 0-1
  approvalRate: number;         // 0-1
  totalUsers: number;
  policyGaps: PolicyGap[];
  topSchemes: Array<{name: string; count: number}>;
  recommendations: string[];    // Action items
}

interface PolicyGap {
  type: "low_awareness" | "eligibility_barrier" | "equity_gap" | "trust_deficit";
  district?: string;
  severity: "low" | "medium" | "high";
  details: string;              // Human-readable description
  affectedSegment?: string;     // Relevant for equity/trust gaps
  metric?: number;              // Supporting quantitative data
}
```

## Usage Examples

### From API Route

```typescript
import { analyzePolicyLandscape } from "@/app/lib/policyEngine";
import { NextResponse } from "next/server";

export async function GET() {
  const analysis = await analyzePolicyLandscape();
  return NextResponse.json(analysis);
}
```

### From Server Component

```typescript
import { getDistrictInsights, getTopPerformingDistricts } from "@/app/lib/policyEngine";

export async function DistrictPanel() {
  const insights = await getDistrictInsights("Mumbai");
  const topDistricts = await getTopPerformingDistricts(5);
  
  return (
    <div>
      <h2>{insights.district}</h2>
      <p>Application Rate: {insights.applicationRate * 100}%</p>
    </div>
  );
}
```

### Utility Functions

```typescript
// Get insights for one district
const insight = await getDistrictInsights("Godda");

// Get top 5 performing districts
const topPerformers = await getTopPerformingDistricts(5);

// Get all underserved segments
const vulnerable = await getUnderservedSegments();

// Get all detected gaps
const gaps = await getPolicyGapDetection();
```

## Dashboard Integration

The **Admin Dashboard** (`/admin-dashboard`) displays the policy engine output via the **PolicyAnalysisViewer** component.

### Features

- **Overview Tab**: Key metrics, top performers, critical concerns
- **Districts Tab**: Per-district drill-down, gaps, recommendations
- **Gaps Tab**: Categorized policy gap summary
- **Recommendations Tab**: Actionable insights by district

## Data Source

**File**: `public/government_usage_dataset.csv`

**Schema**:
| Field | Type | Values |
|-------|------|--------|
| user_id | string | USR000001-USR005000 |
| state | string | 26 Indian states |
| district | string | 148 districts |
| category_selected | string | 7 domains |
| scheme_shown | string | 70 schemes |
| applied | enum | "Yes" / "No" |
| approved | enum | "Yes" / "No" |
| income_band | enum | "Low" / "Middle" / "High" |
| age_group | string | "18-25", "26-40", "41-60", "60+" |
| timestamp | ISO 8601 | Last 12 months |

**Records**: 5,000 synthetic behavioral records

## Performance Characteristics

- **CSV Parse Time**: < 100ms (5000 records)
- **Aggregation Time**: < 50ms
- **Gap Detection Time**: < 10ms
- **Total Analysis Time**: ~200ms

All operations run **synchronously** - suitable for server-side rendering and API routes.

## Future Enhancements

1. **Temporal Analysis**
   - Trend detection (improving/declining rates)
   - Seasonal patterns
   - Impact of policy changes

2. **Comparative Analytics**
   - District-to-district comparison
   - State-level benchmarking
   - Scheme performance comparison

3. **Predictive Rules**
   - If trend continues, will district cross threshold?
   - Which schemes likely to fail?
   - When will equity gap widen?

4. **Integration with Bedrock AI**
   - Natural language explanation of gaps
   - Policy recommendation generation
   - Citizen-facing insights

5. **Real-time Monitoring**
   - Stream updates from database
   - Alert on critical threshold breaches
   - Automated escalations

## Technical Notes

- **Encoding**: UTF-8 CSV parsing with quote handling
- **Math Precision**: IEEE 754 floating point (sufficient for percentages)
- **Memory**: ~2-3MB for 5,000 records (acceptable for API routes)
- **TypeScript**: Strict mode throughout, full type safety

## Configuration

The Policy Engine requires no external configuration - it reads directly from the CSV file at:

```
process.cwd() + "/public/government_usage_dataset.csv"
```

Ensure the file exists before running analysis.

## Error Handling

```typescript
try {
  const analysis = await analyzePolicyLandscape();
} catch (error) {
  console.error("Error in policy analysis:", error);
  return NextResponse.json(
    { error: "Failed to analyze policy landscape" },
    { status: 500 }
  );
}
```

All errors are logged and gracefully returned to the client.

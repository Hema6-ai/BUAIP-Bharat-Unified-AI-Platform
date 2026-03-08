import { readFileSync } from "fs";
import { join } from "path";

interface UsageRecord {
  user_id: string;
  state: string;
  district: string;
  category_selected: string;
  scheme_shown: string;
  applied: "Yes" | "No";
  approved: "Yes" | "No";
  income_band: "Low" | "Middle" | "High";
  age_group: "18-25" | "26-40" | "41-60" | "60+";
  timestamp: string;
}

interface DistrictAggregate {
  district: string;
  state: string;
  totalUsers: number;
  appliedUsers: number;
  approvedUsers: number;
  lowApplied: number;
  lowApproved: number;
  middleApplied: number;
  middleApproved: number;
  schemeCount: Record<string, number>;
}

interface SchemeAggregate {
  shown: number;
  applied: number;
}

interface DistrictInsight {
  district: string;
  state: string;
  flags: string[];
  recommendation: string;
  application_rate: number;
  approval_rate: number;
}

interface UtilizationRankingItem {
  scheme: string;
  usageScore: number;
}

interface UnderservedSegment {
  income_band: "Low" | "Middle" | "High";
  issue: string;
}

export interface GovernanceInsights {
  districtInsights: DistrictInsight[];
  utilizationRanking: UtilizationRankingItem[];
  underservedSegments: UnderservedSegment[];
  recommendations: string[];
  analysisTimestamp: string;
}

const DATASET_PATH = join(process.cwd(), "public", "government_usage_dataset.csv");
const TRUST_DEFICIT_BASELINE = 0.4;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function loadUsageDataset(): UsageRecord[] {
  const fileContent = readFileSync(DATASET_PATH, "utf-8").trim();
  if (!fileContent) {
    return [];
  }

  const lines = fileContent.split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const [
      user_id,
      state,
      district,
      category_selected,
      scheme_shown,
      applied,
      approved,
      income_band,
      age_group,
      timestamp,
    ] = parseCsvLine(line);

    return {
      user_id,
      state,
      district,
      category_selected,
      scheme_shown,
      applied: applied === "Yes" ? "Yes" : "No",
      approved: approved === "Yes" ? "Yes" : "No",
      income_band: ["Low", "Middle", "High"].includes(income_band)
        ? (income_band as "Low" | "Middle" | "High")
        : "Middle",
      age_group: ["18-25", "26-40", "41-60", "60+"].includes(age_group)
        ? (age_group as "18-25" | "26-40" | "41-60" | "60+")
        : "26-40",
      timestamp,
    };
  });
}

function aggregateDataset(records: UsageRecord[]) {
  const districtMap = new Map<string, DistrictAggregate>();
  const schemeMap = new Map<string, SchemeAggregate>();

  for (const record of records) {
    const districtKey = `${record.state}::${record.district}`;
    if (!districtMap.has(districtKey)) {
      districtMap.set(districtKey, {
        district: record.district,
        state: record.state,
        totalUsers: 0,
        appliedUsers: 0,
        approvedUsers: 0,
        lowApplied: 0,
        lowApproved: 0,
        middleApplied: 0,
        middleApproved: 0,
        schemeCount: {},
      });
    }

    const districtStats = districtMap.get(districtKey)!;
    districtStats.totalUsers += 1;

    if (!districtStats.schemeCount[record.scheme_shown]) {
      districtStats.schemeCount[record.scheme_shown] = 0;
    }
    districtStats.schemeCount[record.scheme_shown] += 1;

    if (!schemeMap.has(record.scheme_shown)) {
      schemeMap.set(record.scheme_shown, { shown: 0, applied: 0 });
    }

    const schemeStats = schemeMap.get(record.scheme_shown)!;
    schemeStats.shown += 1;

    if (record.applied === "Yes") {
      districtStats.appliedUsers += 1;
      schemeStats.applied += 1;

      if (record.income_band === "Low") {
        districtStats.lowApplied += 1;
      }
      if (record.income_band === "Middle") {
        districtStats.middleApplied += 1;
      }
    }

    if (record.approved === "Yes") {
      districtStats.approvedUsers += 1;

      if (record.income_band === "Low") {
        districtStats.lowApproved += 1;
      }
      if (record.income_band === "Middle") {
        districtStats.middleApproved += 1;
      }
    }
  }

  return { districtMap, schemeMap };
}

function createDistrictInsights(
  districtMap: Map<string, DistrictAggregate>,
  schemeMap: Map<string, SchemeAggregate>,
  totalRecords: number
): DistrictInsight[] {
  const trustDeficitThreshold = Math.max(20, Math.floor(totalRecords * 0.02));

  return Array.from(districtMap.values())
    .map((districtStats) => {
      const applicationRate =
        districtStats.totalUsers > 0
          ? districtStats.appliedUsers / districtStats.totalUsers
          : 0;
      const approvalRate =
        districtStats.appliedUsers > 0
          ? districtStats.approvedUsers / districtStats.appliedUsers
          : 0;

      const lowIncomeApprovalRate =
        districtStats.lowApplied > 0
          ? districtStats.lowApproved / districtStats.lowApplied
          : 0;
      const middleIncomeApprovalRate =
        districtStats.middleApplied > 0
          ? districtStats.middleApproved / districtStats.middleApplied
          : 0;

      const flags: string[] = [];

      if (applicationRate < 0.4) {
        flags.push("Low Awareness Zone");
      }

      if (districtStats.appliedUsers > 0 && approvalRate < 0.5) {
        flags.push("Eligibility Barrier Detected");
      }

      if (
        districtStats.lowApplied > 0 &&
        districtStats.middleApplied > 0 &&
        lowIncomeApprovalRate < middleIncomeApprovalRate
      ) {
        flags.push("Equity Gap");
      }

      const trustDeficitSchemes = Object.keys(districtStats.schemeCount).filter(
        (scheme) => {
          const schemeStats = schemeMap.get(scheme);
          if (!schemeStats) return false;
          const schemeApplicationRate =
            schemeStats.shown > 0 ? schemeStats.applied / schemeStats.shown : 0;
          return (
            schemeStats.shown >= trustDeficitThreshold &&
            schemeApplicationRate < TRUST_DEFICIT_BASELINE
          );
        }
      );

      if (trustDeficitSchemes.length > 0) {
        flags.push("Trust Deficit Scheme");
      }

      let recommendation = "Sustain current enrollment support and monitor trends.";
      if (flags.includes("Eligibility Barrier Detected")) {
        recommendation =
          "Simplify documentation and conduct assisted enrollment drives.";
      } else if (flags.includes("Low Awareness Zone")) {
        recommendation =
          "Increase district-level awareness outreach through local facilitation centers.";
      } else if (flags.includes("Trust Deficit Scheme")) {
        recommendation =
          "Run trust-building campaigns with grievance support and transparent status tracking.";
      }

      return {
        district: districtStats.district,
        state: districtStats.state,
        flags,
        recommendation,
        application_rate: applicationRate,
        approval_rate: approvalRate,
      };
    })
    .sort((a, b) => b.flags.length - a.flags.length || a.district.localeCompare(b.district));
}

function createUtilizationRanking(
  schemeMap: Map<string, SchemeAggregate>,
  totalRecords: number
): UtilizationRankingItem[] {
  if (totalRecords === 0) {
    return [];
  }

  return Array.from(schemeMap.entries())
    .map(([scheme, stats]) => ({
      scheme,
      usageScore: stats.shown / totalRecords,
    }))
    .sort((a, b) => b.usageScore - a.usageScore)
    .slice(0, 10);
}

function createUnderservedSegments(records: UsageRecord[]): UnderservedSegment[] {
  const byIncome = {
    Low: { applied: 0, approved: 0 },
    Middle: { applied: 0, approved: 0 },
    High: { applied: 0, approved: 0 },
  };

  for (const record of records) {
    if (record.applied === "Yes") {
      byIncome[record.income_band].applied += 1;
    }
    if (record.approved === "Yes") {
      byIncome[record.income_band].approved += 1;
    }
  }

  const rates = {
    Low: byIncome.Low.applied > 0 ? byIncome.Low.approved / byIncome.Low.applied : 0,
    Middle:
      byIncome.Middle.applied > 0
        ? byIncome.Middle.approved / byIncome.Middle.applied
        : 0,
    High: byIncome.High.applied > 0 ? byIncome.High.approved / byIncome.High.applied : 0,
  };

  const segments: UnderservedSegment[] = [];

  if (rates.Low < rates.Middle) {
    segments.push({
      income_band: "Low",
      issue: "Lower approval probability",
    });
  }

  if (rates.Middle < rates.High) {
    segments.push({
      income_band: "Middle",
      issue: "Moderate approval drop versus high-income applicants",
    });
  }

  if (segments.length === 0) {
    segments.push({
      income_band: "Low",
      issue: "No major income disparity detected in current sample",
    });
  }

  return segments;
}

function createRecommendations(districtInsights: DistrictInsight[]): string[] {
  const hasLowAwareness = districtInsights.some((item) =>
    item.flags.includes("Low Awareness Zone")
  );
  const hasEligibilityBarrier = districtInsights.some((item) =>
    item.flags.includes("Eligibility Barrier Detected")
  );
  const hasEquityGap = districtInsights.some((item) => item.flags.includes("Equity Gap"));
  const hasTrustDeficit = districtInsights.some((item) =>
    item.flags.includes("Trust Deficit Scheme")
  );

  const recommendations: string[] = [];

  if (hasLowAwareness) {
    recommendations.push("Increase awareness campaigns in flagged districts.");
  }
  if (hasEligibilityBarrier) {
    recommendations.push("Simplify eligibility verification process.");
  }
  if (hasEquityGap) {
    recommendations.push("Deploy assisted documentation support for low-income applicants.");
  }
  if (hasTrustDeficit) {
    recommendations.push("Improve trust through transparent application tracking and field facilitation.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Maintain current implementation and continue district-level monitoring.");
  }

  return recommendations;
}

export function getGovernanceInsights(): GovernanceInsights {
  const records = loadUsageDataset();
  const { districtMap, schemeMap } = aggregateDataset(records);
  const districtInsights = createDistrictInsights(districtMap, schemeMap, records.length);
  const utilizationRanking = createUtilizationRanking(schemeMap, records.length);
  const underservedSegments = createUnderservedSegments(records);
  const recommendations = createRecommendations(districtInsights);

  return {
    districtInsights,
    utilizationRanking,
    underservedSegments,
    recommendations,
    analysisTimestamp: new Date().toISOString(),
  };
}

export function analyzePolicyLandscape(): GovernanceInsights {
  return getGovernanceInsights();
}

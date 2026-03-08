"use client";

import { useEffect, useMemo, useState } from "react";
import { AIBadge } from "./AIBadge";
import type { GovernanceInsights } from "@/app/lib/policyEngine";

interface GovernmentDashboardProps {
  insights: GovernanceInsights;
}

interface GovernanceExplainResponse {
  explanation: string;
}

interface GovernanceAIInsight {
  underservedSegment: string;
  districtRiskAlerts: Array<{
    district: string;
    risk: string;
    severity: "Low" | "Medium" | "High";
  }>;
  policyGap: string;
  reformRecommendations: string[];
  riskSeverityLevel: "Low" | "Medium" | "High";
  confidence: number;
  timestamp: string;
  language: string;
}

const EXPLANATION_CACHE_KEY = "governance_explanation_session_cache_v1";

export default function GovernmentDashboard({ insights }: GovernmentDashboardProps) {
  const [advisorExplanation, setAdvisorExplanation] = useState<string>("");
  const [advisorLoading, setAdvisorLoading] = useState(true);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [governanceInsight, setGovernanceInsight] = useState<GovernanceAIInsight | null>(null);
  const [governanceLoading, setGovernanceLoading] = useState(true);
  const [governanceError, setGovernanceError] = useState<string | null>(null);

  useEffect(() => {
    const loadGovernanceInsight = async () => {
      setGovernanceLoading(true);
      setGovernanceError(null);

      try {
        const response = await fetch("/api/governance-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analyticsSummary: JSON.stringify(insights),
            language: "English",
            districtData: insights.districtInsights,
            schemeData: insights.utilizationRanking,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to load governance AI insights");
        }

        const data = (await response.json()) as GovernanceAIInsight;
        setGovernanceInsight(data);
      } catch (error) {
        setGovernanceError(error instanceof Error ? error.message : "Unable to load governance AI insights");
      } finally {
        setGovernanceLoading(false);
      }
    };

    void loadGovernanceInsight();
  }, [insights]);

  useEffect(() => {
    const loadExplanation = async () => {
      if (typeof window !== "undefined") {
        const cached = window.sessionStorage.getItem(EXPLANATION_CACHE_KEY);
        if (cached) {
          setAdvisorExplanation(cached);
          setAdvisorLoading(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/governance-explain");
        if (!response.ok) {
          throw new Error("Failed to load AI policy explanation");
        }

        const data: GovernanceExplainResponse = await response.json();
        setAdvisorExplanation(data.explanation);

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(EXPLANATION_CACHE_KEY, data.explanation);
        }
      } catch (error) {
        setAdvisorError(error instanceof Error ? error.message : "Unable to load AI Policy Advisor");
      } finally {
        setAdvisorLoading(false);
      }
    };

    loadExplanation();
  }, []);

  const getSeverityClass = (severity: "Low" | "Medium" | "High") => {
    if (severity === "High") {
      return "bg-red-100 text-red-800 border-red-300";
    }

    if (severity === "Medium") {
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }

    return "bg-green-100 text-green-800 border-green-300";
  };

  const topFlaggedDistrict = insights.districtInsights[0];
  const secondaryDistrict = insights.districtInsights[1] ?? insights.districtInsights[0];

  const topUnderserved = insights.underservedSegments[0];
  const secondaryUnderserved = insights.underservedSegments.slice(1, 3);

  const analysisTimestamp = useMemo(
    () => new Date(insights.analysisTimestamp).toLocaleString(),
    [insights.analysisTimestamp]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Government Dashboard</h1>
          <p className="text-lg text-gray-600">
            AI-powered governance intelligence for public welfare schemes
          </p>
          <p className="text-sm text-slate-500 mt-3">Analysis Timestamp: {analysisTimestamp}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">District Intelligence</h2>
                <p className="text-sm text-gray-500 mt-1">Performance insights across regions</p>
              </div>
              <AIBadge />
            </div>

            <div className="space-y-6">
              {topFlaggedDistrict && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-orange-900">Priority District</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        {topFlaggedDistrict.district}, {topFlaggedDistrict.state}
                      </p>
                    </div>
                    <span className="bg-orange-200 text-orange-900 text-xs font-bold px-2 py-1 rounded">
                      {topFlaggedDistrict.flags.length || 0} FLAGS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600">Application Rate</div>
                      <div className="text-lg font-bold text-orange-900">
                        {(topFlaggedDistrict.application_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600">Approval Rate</div>
                      <div className="text-lg font-bold text-orange-900">
                        {(topFlaggedDistrict.approval_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-orange-800 mt-3">
                    Flags: {topFlaggedDistrict.flags.join(", ") || "No critical flags"}
                  </p>
                </div>
              )}

              {secondaryDistrict && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-green-900">District Snapshot</h3>
                      <p className="text-sm text-green-700 mt-1">
                        {secondaryDistrict.district}, {secondaryDistrict.state}
                      </p>
                    </div>
                    <span className="bg-green-200 text-green-900 text-xs font-bold px-2 py-1 rounded">
                      {(secondaryDistrict.flags.length || 0) > 0 ? "MONITOR" : "STABLE"}
                    </span>
                  </div>
                  <p className="text-sm text-green-800">{secondaryDistrict.recommendation}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Scheme Intelligence</h2>
                <p className="text-sm text-gray-500 mt-1">Utilization rankings and metrics</p>
              </div>
              <AIBadge />
            </div>

            <div className="space-y-3">
              {insights.utilizationRanking.slice(0, 5).map((item, idx) => (
                <div
                  key={item.scheme}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">#{idx + 1} {item.scheme}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Usage Score: {(item.usageScore * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full">
                      <span className="text-sm font-bold text-blue-900">{idx + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Underserved Segments</h2>
                <p className="text-sm text-gray-500 mt-1">Populations requiring support</p>
              </div>
              <AIBadge />
            </div>

            <div className="space-y-4">
              {topUnderserved && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-red-900">
                        {topUnderserved.income_band} Income Segment
                      </h3>
                      <p className="text-sm text-red-700 mt-2">{topUnderserved.issue}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-900">PRIORITY</div>
                      <div className="text-xs text-red-700">Intervention</div>
                    </div>
                  </div>
                </div>
              )}

              {secondaryUnderserved.map((segment) => (
                <div
                  key={`${segment.income_band}-${segment.issue}`}
                  className="bg-yellow-50 rounded-lg p-4 border border-yellow-200"
                >
                  <h4 className="font-semibold text-yellow-900">{segment.income_band} Income</h4>
                  <p className="text-xs text-yellow-700 mt-1">{segment.issue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Policy Recommendations</h2>
                <p className="text-sm text-gray-500 mt-1">AI-generated action items</p>
              </div>
              <AIBadge />
            </div>

            <div className="space-y-3">
              {insights.recommendations.length > 0 ? (
                insights.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-sm text-indigo-900">{rec}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-800">No critical recommendations at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl shadow-xl p-8 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">AI Governance Intelligence</h2>
            <AIBadge />
          </div>

          {governanceLoading ? (
            <p className="text-sm text-slate-600 mb-4">Loading structured AI governance insights...</p>
          ) : governanceError ? (
            <p className="text-sm text-red-700 mb-4">{governanceError}</p>
          ) : governanceInsight ? (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200">
                <div>
                  <p className="text-sm text-slate-600">Overall Risk Severity</p>
                  <p className="text-base font-semibold text-slate-900">{governanceInsight.riskSeverityLevel}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded border ${getSeverityClass(governanceInsight.riskSeverityLevel)}`}>
                  {governanceInsight.riskSeverityLevel}
                </span>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-900 mb-1">Underserved Segment</p>
                <p className="text-sm text-slate-700">{governanceInsight.underservedSegment}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-900 mb-2">District Risk Alerts</p>
                <div className="space-y-2">
                  {governanceInsight.districtRiskAlerts.map((alert) => (
                    <div key={`${alert.district}-${alert.risk}`} className="flex items-start justify-between gap-3 border border-slate-200 rounded p-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{alert.district}</p>
                        <p className="text-xs text-slate-600">{alert.risk}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${getSeverityClass(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-900 mb-1">Policy Gap</p>
                <p className="text-sm text-slate-700">{governanceInsight.policyGap}</p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-900 mb-2">Reform Recommendations</p>
                <ul className="space-y-1">
                  {governanceInsight.reformRecommendations.map((recommendation, index) => (
                    <li key={`${recommendation}-${index}`} className="text-sm text-slate-700">• {recommendation}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Policy Advisor Narrative</h3>

          {advisorLoading ? (
            <p className="text-sm text-slate-600">Loading AI policy explanation...</p>
          ) : advisorError ? (
            <p className="text-sm text-red-700">{advisorError}</p>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {advisorExplanation}
            </p>
          )}
        </div>

        <div className="mt-8 bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">💡 Note:</span> Dashboard metrics are deterministic
            and dataset-driven. AI is used only to explain existing policy insights.
          </p>
        </div>
      </div>
    </div>
  );
}

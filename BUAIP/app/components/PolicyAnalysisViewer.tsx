"use client";

import { useState, useEffect } from "react";

interface PolicyAnalysis {
  timestamp: string;
  totalRecords: number;
  uniqueDistricts: number;
  districtInsights: Array<{
    district: string;
    state: string;
    applicationRate: number;
    approvalRate: number;
    totalUsers: number;
    policyGaps: Array<{
      type: string;
      severity: string;
      details: string;
    }>;
    topSchemes: Array<{ name: string; count: number }>;
    recommendations: string[];
  }>;
  utilizationRanking: Array<{
    district: string;
    applicationRate: number;
    approvalRate: number;
    ranking: number;
  }>;
  recommendations: string[];
  policyGapsSummary: {
    lowAwarenessZones: string[];
    eligibilityBarriers: string[];
    equityGaps: string[];
    trustDeficitSchemes: string[];
  };
}

export default function PolicyAnalysisViewer() {
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "districts" | "gaps" | "recommendations"
  >("overview");
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch("/api/policy-analysis");
        if (!response.ok) throw new Error("Failed to fetch analysis");
        const data = await response.json();
        setAnalysis(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 flex items-center justify-center">
        <div className="text-xl text-blue-700 font-semibold">
          Analyzing policy landscape...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
        <div className="text-center">No analysis data available</div>
      </div>
    );
  }

  const selectedDistrictData = analysis.districtInsights.find(
    (d) => d.district === selectedDistrict
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100 mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Government Policy Analytics Engine
          </h1>
          <p className="text-lg text-gray-600">
            AI-powered reasoning for governance intelligence
          </p>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <StatCard
              label="Total Records"
              value={analysis.totalRecords.toLocaleString()}
              color="blue"
            />
            <StatCard
              label="Districts Analyzed"
              value={analysis.uniqueDistricts}
              color="indigo"
            />
            <StatCard
              label="Policy Gaps Detected"
              value={
                analysis.policyGapsSummary.lowAwarenessZones.length +
                analysis.policyGapsSummary.eligibilityBarriers.length +
                analysis.policyGapsSummary.equityGaps.length
              }
              color="orange"
            />
            <StatCard
              label="At-Risk Schemes"
              value={analysis.policyGapsSummary.trustDeficitSchemes.length}
              color="red"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(
              [
                "overview",
                "districts",
                "gaps",
                "recommendations",
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-blue-50 border-b-2 border-blue-600 text-blue-900"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8">
            {activeTab === "overview" && (
              <OverviewTab analysis={analysis} />
            )}
            {activeTab === "districts" && (
              <DistrictsTab
                analysis={analysis}
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                selectedDistrictData={selectedDistrictData}
              />
            )}
            {activeTab === "gaps" && <GapsTab analysis={analysis} />}
            {activeTab === "recommendations" && (
              <RecommendationsTab analysis={analysis} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ analysis }: { analysis: PolicyAnalysis }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InsightCard
          title="Top Performing Districts"
          items={analysis.utilizationRanking.slice(0, 5).map((d) => ({
            label: `${d.district} (#${d.ranking})`,
            value: `App: ${(d.applicationRate * 100).toFixed(1)}% | Apr: ${(
              d.approvalRate * 100
            ).toFixed(1)}%`,
          }))}
          color="green"
        />
        <InsightCard
          title="Critical Concerns"
          items={[
            {
              label: "Low Awareness Zones",
              value: analysis.policyGapsSummary.lowAwarenessZones.length,
            },
            {
              label: "Eligibility Barriers",
              value: analysis.policyGapsSummary.eligibilityBarriers.length,
            },
            {
              label: "Equity Gaps",
              value: analysis.policyGapsSummary.equityGaps.length,
            },
          ]}
          color="red"
        />
      </div>

      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-bold text-blue-900 mb-4">
          System-Level Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.length > 0 ? (
            analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-600 mr-3">•</span>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-500">No system-level recommendations</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function DistrictsTab({
  analysis,
  selectedDistrict,
  setSelectedDistrict,
  selectedDistrictData,
}: {
  analysis: PolicyAnalysis;
  selectedDistrict: string | null;
  setSelectedDistrict: (d: string) => void;
  selectedDistrictData?: (typeof analysis.districtInsights)[0];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Select a District
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {analysis.districtInsights.map((d) => (
            <button
              key={d.district}
              onClick={() => setSelectedDistrict(d.district)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedDistrict === d.district
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="font-semibold text-sm">{d.district}</div>
              <div className="text-xs text-gray-600 mt-1">
                App: {(d.applicationRate * 100).toFixed(0)}%
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedDistrictData && (
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Application Rate"
              value={`${(selectedDistrictData.applicationRate * 100).toFixed(1)}%`}
              color="blue"
            />
            <MetricCard
              label="Approval Rate"
              value={`${(selectedDistrictData.approvalRate * 100).toFixed(1)}%`}
              color="green"
            />
            <MetricCard
              label="Total Users"
              value={selectedDistrictData.totalUsers}
              color="indigo"
            />
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2">Top Schemes</h4>
            <div className="space-y-1">
              {selectedDistrictData.topSchemes.map((s) => (
                <div
                  key={s.name}
                  className="flex justify-between text-sm text-gray-700"
                >
                  <span>{s.name}</span>
                  <span className="font-semibold">{s.count} views</span>
                </div>
              ))}
            </div>
          </div>

          {selectedDistrictData.policyGaps.length > 0 && (
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Policy Gaps</h4>
              <div className="space-y-2">
                {selectedDistrictData.policyGaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className="text-sm bg-white p-2 rounded border-l-4 border-orange-500"
                  >
                    <div className="font-semibold text-orange-900">
                      {gap.type.replace(/_/g, " ").toUpperCase()}
                    </div>
                    <div className="text-gray-700">{gap.details}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDistrictData.recommendations.length > 0 && (
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <h4 className="font-bold text-green-900 mb-2">
                District Recommendations
              </h4>
              <ul className="space-y-1">
                {selectedDistrictData.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start">
                    <span className="mr-2">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GapsTab({ analysis }: { analysis: PolicyAnalysis }) {
  const gaps = analysis.policyGapsSummary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <GapCard
        title="Low Awareness Zones"
        items={gaps.lowAwarenessZones}
        color="orange"
        description="Districts with <40% application rate"
      />
      <GapCard
        title="Eligibility Barriers"
        items={gaps.eligibilityBarriers}
        color="red"
        description="Districts with <50% approval rate"
      />
      <GapCard
        title="Equity Gaps"
        items={gaps.equityGaps}
        color="yellow"
        description="Low-income approval disparity detected"
      />
      <GapCard
        title="Trust Deficit Schemes"
        items={gaps.trustDeficitSchemes}
        color="purple"
        description="High visibility but low application"
      />
    </div>
  );
}

function RecommendationsTab({ analysis }: { analysis: PolicyAnalysis }) {
  const districtRecs = analysis.districtInsights
    .filter((d) => d.recommendations.length > 0)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {districtRecs.length > 0 ? (
        districtRecs.map((district) => (
          <div
            key={district.district}
            className="bg-blue-50 rounded-lg p-4 border border-blue-200"
          >
            <h4 className="font-bold text-blue-900 mb-2">
              {district.district}, {district.state}
            </h4>
            <ul className="space-y-1">
              {district.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-600 mr-2">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p className="text-gray-500">No recommendations available</p>
      )}
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-900",
    orange: "bg-orange-50 border-orange-200 text-orange-900",
    red: "bg-red-50 border-red-200 text-red-900",
  };

  return (
    <div
      className={`rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}
    >
      <div className="text-sm font-semibold opacity-75">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  const colorClasses = {
    blue: "border-blue-500 text-blue-900",
    green: "border-green-500 text-green-900",
    indigo: "border-indigo-500 text-indigo-900",
  };

  return (
    <div className={`border-l-4 pl-4 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="text-sm font-semibold opacity-75">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function InsightCard({
  title,
  items,
  color,
}: {
  title: string;
  items: Array<{ label: string; value: string | number }>;
  color: string;
}) {
  const bgClasses = {
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
  };

  return (
    <div
      className={`rounded-lg p-6 border ${bgClasses[color as keyof typeof bgClasses] || bgClasses.green}`}
    >
      <h3 className={`text-lg font-bold ${color === "green" ? "text-green-900" : "text-red-900"} mb-4`}>
        {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx}>
            <div className="text-sm font-semibold text-gray-700">
              {item.label}
            </div>
            <div className="text-lg font-bold text-gray-900">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapCard({
  title,
  items,
  color,
  description,
}: {
  title: string;
  items: string[];
  color: string;
  description: string;
}) {
  const colorClasses = {
    orange: "bg-orange-50 border-orange-200 text-orange-900",
    red: "bg-red-50 border-red-200 text-red-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
  };

  return (
    <div
      className={`rounded-lg p-6 border ${colorClasses[color as keyof typeof colorClasses] || colorClasses.orange}`}
    >
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm opacity-75 mb-4">{description}</p>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center text-sm">
              <span className="mr-2">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-50">None detected</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useLanguage } from "@/app/lib/languageContext";

interface Scheme {
  scheme_name: string;
  domain: string;
  ministry: string;
  description: string;
  target_beneficiaries: string;
  eligibility_criteria: string;
  age_limit: string;
  income_limit: string;
  required_documents: string;
  benefits: string;
  application_mode: string;
  official_apply_link: string;
  state_applicability: string;
  timeline: string;
}

interface SchemeAssistancePanelProps {
  scheme: Scheme;
  initialRegion?: string;
  onClose: () => void;
}

type QueryType = "eligibility" | "requirements" | "application" | "general";

export default function SchemeAssistancePanel({
  scheme,
  initialRegion,
  onClose,
}: SchemeAssistancePanelProps) {
  const { language } = useLanguage();
  const [queryType, setQueryType] = useState<QueryType>("general");
  const [userAge, setUserAge] = useState("");
  const [userIncomeBand, setUserIncomeBand] = useState<string>("");
  const [userState, setUserState] = useState(initialRegion || "");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetAssistance = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const requestBody = {
        scheme_name: scheme.scheme_name,
        query_type: queryType,
        user_inputs: {
          age: userAge ? parseInt(userAge) : undefined,
          income_band: userIncomeBand || undefined,
          state: userState || undefined,
          category: scheme.domain,
        },
        language,
      };

      const res = await fetch("/api/scheme-assistance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error("Failed to get assistance");
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred while fetching"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Panel Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Assistance Panel */}
      <div className="fixed bottom-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-l border-indigo-100 max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between border-b border-purple-300">
          <h3 className="text-lg font-bold">AI Scheme Assistant</h3>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-700 rounded-lg p-1 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Query Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What would you like to know?
            </label>
            <select
              value={queryType}
              onChange={(e) => setQueryType(e.target.value as QueryType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
            >
              <option value="general">General Information</option>
              <option value="eligibility">Check Eligibility</option>
              <option value="requirements">View Requirements</option>
              <option value="application">Application Process</option>
            </select>
          </div>

          {/* Conditional Input Fields */}
          {(queryType === "eligibility" || queryType === "general") && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Age (Optional)
                </label>
                <input
                  type="number"
                  value={userAge}
                  onChange={(e) => setUserAge(e.target.value)}
                  placeholder="e.g., 35"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Income Band (Optional)
                </label>
                <select
                  value={userIncomeBand}
                  onChange={(e) => setUserIncomeBand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 bg-white"
                >
                  <option value="">Select income band</option>
                  <option value="Low">Low</option>
                  <option value="Middle">Middle</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  State (Optional)
                </label>
                <input
                  type="text"
                  value={userState}
                  onChange={(e) => setUserState(e.target.value)}
                  placeholder="e.g., Maharashtra"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </>
          )}

          {/* Get Assistance Button */}
          <button
            onClick={handleGetAssistance}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              loading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {loading ? "Getting Response..." : "Get Assistance"}
          </button>

          {/* Response */}
          {response && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">
                Assistant Response:
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {response}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Note */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-xs text-blue-700">
            <p className="font-semibold mb-1">Note:</p>
            <p>
              This AI assistant provides general guidance. Always verify official
              requirements on the scheme's official website.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

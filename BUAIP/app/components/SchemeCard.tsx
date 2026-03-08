'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { EligibilityResult } from '@/app/lib/schemeEligibilityTypes';

interface SchemeCardProps {
  scheme: EligibilityResult;
  index: number;
  isPartialMatch?: boolean;
}

export default function SchemeCard({ scheme, index, isPartialMatch }: SchemeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-green-500 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-orange-600 bg-orange-50';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Perfect Match';
    if (score >= 80) return 'Excellent Match';
    if (score >= 70) return 'Good Match';
    return 'Partial Match';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{scheme.schemeName}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">{scheme.benefits[0]}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Eligibility Score */}
            <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${getScoreColor(scheme.eligibilityScore)}`}>
              <div className="text-lg sm:text-xl font-bold">{scheme.eligibilityScore}%</div>
              <div className="text-xs font-medium">{getScoreLabel(scheme.eligibilityScore)}</div>
            </div>

            {/* Expand Icon */}
            <motion.svg
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="w-5 h-5 text-gray-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-gray-200 bg-gray-50"
        >
          <div className="p-4 sm:p-5 space-y-4">
            {/* Eligibility Explanation */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Why You Qualify</h4>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{scheme.explanation}</p>
            </div>

            {/* Matched Criteria */}
            {scheme.matchedCriteria.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-700 mb-2 text-sm">✓ Your Strengths</h4>
                <ul className="space-y-1">
                  {scheme.matchedCriteria.map((criteria, i) => (
                    <li key={i} className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">✓</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unmatched Criteria */}
            {scheme.unmatchedCriteria.length > 0 && (
              <div>
                <h4 className="font-semibold text-orange-700 mb-2 text-sm">⚠ Potential Barriers</h4>
                <ul className="space-y-1">
                  {scheme.unmatchedCriteria.map((criteria, i) => (
                    <li key={i} className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-600 font-bold mt-0.5">!</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">💰 Benefits</h4>
              <ul className="space-y-1">
                {scheme.benefits.map((benefit, i) => (
                  <li key={i} className="text-xs sm:text-sm text-gray-700">• {benefit}</li>
                ))}
              </ul>
            </div>

            {/* Documents Required */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">📄 Documents Needed</h4>
              <ul className="space-y-1">
                {scheme.filesRequired.map((file, i) => (
                  <li key={i} className="text-xs sm:text-sm text-gray-700">• {file}</li>
                ))}
              </ul>
            </div>

            {/* Application Mode & Link */}
            <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600">Application Mode</p>
                  <p className="font-semibold text-gray-900 text-sm capitalize">{scheme.applicationMode}</p>
                </div>
                <a
                  href={scheme.applicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors text-center"
                >
                  Apply Now →
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

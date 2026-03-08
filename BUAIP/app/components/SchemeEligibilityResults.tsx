'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { EligibilityAnalysis } from '@/app/lib/schemeEligibilityTypes';
import SchemeCard from './SchemeCard';

interface SchemeEligibilityResultsProps {
  analysis: EligibilityAnalysis & { specialRecommendations?: string[] };
  onRestart: () => void;
}

export default function SchemeEligibilityResults({
  analysis,
  onRestart,
}: SchemeEligibilityResultsProps) {
  const totalEligible = analysis.eligibleSchemes.length;
  const totalPartial = analysis.partiallyEligibleSchemes.length;
  const allSchemes = [...analysis.eligibleSchemes, ...analysis.partiallyEligibleSchemes];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Summary Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 sm:p-8 rounded-lg shadow-lg"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">🎉 Your Eligibility Analysis</h2>
        
        {/* Profile Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-blue-100 text-xs sm:text-sm">State</p>
            <p className="font-bold text-white text-sm sm:text-base">{analysis.profileSummary.state}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-blue-100 text-xs sm:text-sm">Occupation</p>
            <p className="font-bold text-white text-sm sm:text-base capitalize">
              {analysis.profileSummary.occupation?.replace('_', ' ')}
            </p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-blue-100 text-xs sm:text-sm">Age</p>
            <p className="font-bold text-white text-sm sm:text-base">{analysis.profileSummary.age}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-blue-100 text-xs sm:text-sm">Income</p>
            <p className="font-bold text-white text-sm sm:text-base">
              ₹{(analysis.profileSummary.annualHouseholdIncome || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-20 p-4 rounded-lg text-center">
            <p className="text-4xl sm:text-5xl font-bold text-white">{totalEligible}</p>
            <p className="text-blue-100 text-sm sm:text-base mt-1">Fully Eligible Schemes</p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-lg text-center">
            <p className="text-4xl sm:text-5xl font-bold text-white">{totalPartial}</p>
            <p className="text-blue-100 text-sm sm:text-base mt-1">Partially Eligible</p>
          </div>
        </div>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-amber-50 border-l-4 border-amber-500 p-4 sm:p-5 rounded-lg"
      >
        <h3 className="font-bold text-amber-900 mb-3 text-base sm:text-lg">📋 Next Steps</h3>
        <ul className="space-y-2">
          {analysis.nextSteps.map((step, i) => (
            <li key={i} className="text-xs sm:text-sm text-amber-800 flex items-start gap-2">
              <span className="text-amber-600 font-bold mt-0.5">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Special Recommendations */}
      {analysis.specialRecommendations && analysis.specialRecommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-purple-50 border-l-4 border-purple-500 p-4 sm:p-5 rounded-lg"
        >
          <h3 className="font-bold text-purple-900 mb-3 text-base sm:text-lg">⭐ Special Opportunities</h3>
          <ul className="space-y-2">
            {analysis.specialRecommendations.map((rec, i) => (
              <li key={i} className="text-xs sm:text-sm text-purple-800 flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Fully Eligible Schemes */}
      {totalEligible > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-4">✓ You're Eligible For ({totalEligible})</h3>
          <div className="space-y-3">
            {analysis.eligibleSchemes.map((scheme, i) => (
              <SchemeCard key={scheme.schemeId} scheme={scheme} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Partially Eligible Schemes */}
      {totalPartial > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="pt-4 border-t-2 border-gray-200"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-orange-600 mb-4">⚠ Check These Too ({totalPartial})</h3>
          <p className="text-sm text-gray-600 mb-4">
            You may qualify for these schemes with some additional requirements. Always verify eligibility on the official website.
          </p>
          <div className="space-y-3">
            {analysis.partiallyEligibleSchemes.map((scheme, i) => (
              <SchemeCard key={scheme.schemeId} scheme={scheme} index={i + totalEligible} isPartialMatch />
            ))}
          </div>
        </motion.div>
      )}

      {/* No Schemes */}
      {allSchemes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 p-8 rounded-lg text-center border-2 border-gray-200"
        >
          <p className="text-lg text-gray-700 mb-4">
            No schemes match your current profile based on our database.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            This may be temporary. Check back soon for newly added schemes or verify the details with official portals.
          </p>
          <button
            onClick={onRestart}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Update Profile
          </button>
        </motion.div>
      )}

      {/* Action Buttons */}
      {allSchemes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-gray-200"
        >
          <button
            onClick={onRestart}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Update My Profile
          </button>
          <a
            href="https://www.myscheme.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors text-center"
          >
            Explore All Schemes →
          </a>
        </motion.div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          💡 <strong>Note:</strong> This analysis is based on general eligibility criteria. Government schemes update frequently. Always verify eligibility on official government websites before applying.
        </p>
      </div>
    </div>
  );
}

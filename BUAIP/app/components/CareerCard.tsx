"use client";

import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface CareerMatch {
  name: string;
  matchScore: number;
  matchReason: string;
  salaryYear1: string;
  salaryYear5: string;
  salaryYear10: string;
  timeToJob: string;
  investmentNeeded: string;
  successRate: string;
  biggestChallenge: string;
  bestAdvantage: string;
}

interface CareerCardProps {
  career: CareerMatch;
  index: number;
  onExploreRoadmap: (careerName: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CareerCard({ career, index, onExploreRoadmap }: CareerCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            🎯 {career.name}
          </h3>
          <p className="text-sm text-gray-600">{career.matchReason}</p>
        </div>
        
        <div className={`flex flex-col items-center px-4 py-2 rounded-lg border-2 ${getScoreColor(career.matchScore)}`}>
          <div className="text-2xl font-bold">{career.matchScore}%</div>
          <div className="text-xs font-medium">Match</div>
        </div>
      </div>

      {/* Salary Progression */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 Salary Journey</h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-gray-600 mb-1">Year 1</div>
            <div className="text-sm md:text-base font-bold text-gray-900">{career.salaryYear1}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Year 5</div>
            <div className="text-sm md:text-base font-bold text-gray-900">{career.salaryYear5}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 mb-1">Year 10</div>
            <div className="text-sm md:text-base font-bold text-gray-900">{career.salaryYear10}</div>
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">⏱️ Time to First Job</div>
          <div className="text-sm font-semibold text-gray-900">{career.timeToJob}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">💸 Investment</div>
          <div className="text-sm font-semibold text-gray-900">{career.investmentNeeded}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">📊 Success Rate</div>
          <div className="text-sm font-semibold text-gray-900">{career.successRate}</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">✨ Best Advantage</div>
          <div className="text-xs font-medium text-gray-900 line-clamp-2">{career.bestAdvantage}</div>
        </div>
      </div>

      {/* Challenge */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
        <div className="text-xs font-semibold text-orange-700 mb-1">⚠️ Biggest Challenge</div>
        <div className="text-sm text-orange-900">{career.biggestChallenge}</div>
      </div>

      {/* Action Button */}
      <motion.button
        onClick={() => onExploreRoadmap(career.name)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
      >
        Explore Roadmap →
      </motion.button>
    </motion.div>
  );
}

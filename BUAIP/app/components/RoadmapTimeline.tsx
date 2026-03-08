"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface RoadmapPhase {
  phase: string;
  duration: string;
  skillsToLearn: string[];
  resources: string[];
  projects: string[];
  milestones: string[];
  mistakesToAvoid: string[];
}

interface RoadmapTimelineProps {
  roadmap: RoadmapPhase[];
  careerName: string;
  onBack?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RoadmapTimeline({ roadmap, careerName, onBack }: RoadmapTimelineProps) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);

  const getPhaseColor = (index: number) => {
    const colors = [
      'border-blue-500 bg-blue-50',
      'border-purple-500 bg-purple-50',
      'border-green-500 bg-green-50',
      'border-yellow-500 bg-yellow-50',
      'border-pink-500 bg-pink-50',
    ];
    return colors[index % colors.length];
  };

  const getPhaseIcon = (index: number) => {
    const icons = ['🎯', '📚', '🚀', '💪', '🏆'];
    return icons[index % icons.length];
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2 text-sm font-medium"
        >
          ← Back to Career Options
        </button>
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          🛤️ Your Roadmap to {careerName}
        </h2>
        <p className="text-gray-600">
          A step-by-step 24-month plan to break into this career. Click each phase to expand.
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {roadmap.map((phase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`border-l-4 ${getPhaseColor(index).split(' ')[0]} bg-white rounded-lg shadow-md overflow-hidden`}
          >
            {/* Phase Header */}
            <button
              onClick={() => setExpandedPhase(expandedPhase === index ? null : index)}
              className="w-full p-4 md:p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getPhaseIcon(index)}</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">
                      {phase.phase.replace(/_/g, ' ').replace(/MONTHS/g, 'Months')}
                    </h3>
                    <p className="text-sm text-gray-600">{phase.duration}</p>
                  </div>
                </div>
                
                <motion.svg
                  animate={{ rotate: expandedPhase === index ? 180 : 0 }}
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedPhase === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-4 md:p-6 space-y-6">
                    {/* Skills to Learn */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>📖</span> Skills to Learn
                      </h4>
                      <ul className="space-y-2">
                        {phase.skillsToLearn.map((skill, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-blue-600 font-bold mt-0.5">•</span>
                            <span>{skill}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Resources */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>🔗</span> Resources
                      </h4>
                      <ul className="space-y-2">
                        {phase.resources.map((resource, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-purple-600 font-bold mt-0.5">→</span>
                            <span>{resource}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Projects */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span>🛠️</span> Projects to Build
                      </h4>
                      <ul className="space-y-2">
                        {phase.projects.map((project, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <span>{project}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Milestones */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <span>🎯</span> Milestones
                      </h4>
                      <ul className="space-y-2">
                        {phase.milestones.map((milestone, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                            <span className="text-green-600 font-bold mt-0.5">✓</span>
                            <span>{milestone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mistakes to Avoid */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                        <span>⚠️</span> Mistakes to Avoid
                      </h4>
                      <ul className="space-y-2">
                        {phase.mistakesToAvoid.map((mistake, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                            <span className="text-red-600 font-bold mt-0.5">✗</span>
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => window.print()}
          className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
        >
          📄 Copy Roadmap
        </button>
        
        <button
          onClick={() => {
            // Email functionality would be implemented here
            alert('Email roadmap functionality coming soon!');
          }}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📧 Email Roadmap
        </button>
      </div>
    </div>
  );
}

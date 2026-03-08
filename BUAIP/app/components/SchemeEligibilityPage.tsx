'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SchemeWizardForm from './SchemeWizardForm';
import SchemeEligibilityResults from './SchemeEligibilityResults';
import { CitizenProfile, EligibilityAnalysis } from '@/app/lib/schemeEligibilityTypes';

type PageState = 'welcome' | 'form' | 'results' | 'loading';

interface SchemeEligibilityPageProps {
  onClose?: () => void;
}

export default function SchemeEligibilityPage({ onClose }: SchemeEligibilityPageProps) {
  const [state, setState] = useState<PageState>('welcome');
  const [analysis, setAnalysis] = useState<EligibilityAnalysis & { specialRecommendations?: string[] } | null>(null);

  const handleFormSubmit = async (profile: CitizenProfile) => {
    setState('loading');
    try {
      const response = await fetch('/api/scheme-eligibility', {
        method: 'POST',
        headers:{ 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenProfile: profile }),
      });

      const result = await response.json();
      if (result.success) {
        setAnalysis(result.data);
        setState('results');
      } else {
        alert('Error: ' + result.error);
        setState('form');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze profile');
      setState('form');
    }
  };

  const handleRestart = () => {
    setState('welcome');
    setAnalysis(null);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-6 sm:py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            🏛️ Government Scheme Finder
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover which government schemes you're eligible for based on your profile
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-6 sm:p-8"
        >
          {state === 'welcome' && (
            <WelcomeScreen onStart={() => setState('form')} />
          )}

          {state === 'form' && (
            <SchemeWizardForm onSubmit={handleFormSubmit} isLoading={false} />
          )}

          {(state === 'loading' || state === 'results') && (
            <>
              {state === 'loading' && <LoadingScreen />}
              {state === 'results' && analysis && (
                <SchemeEligibilityResults analysis={analysis} onRestart={handleRestart} />
              )}
            </>
          )}
        </motion.div>

        {/* Close Button */}
        {onClose && (
          <div className="text-center mt-6">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              ✕ Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="text-6xl">🇮🇳</div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
          Welcome to BUAIP Scheme Finder
        </h2>
        <p className="text-gray-600 text-base sm:text-lg mb-4">
          India has <strong>thousands of government schemes</strong> designed to help citizens. 
          We'll help you find the ones you qualify for.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-semibold text-gray-900">Answer Questions</p>
          <p className="text-sm text-gray-600 mt-1">Quick profile in 5 steps</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-3xl mb-2">🤖</div>
          <p className="font-semibold text-gray-900">AI Analysis</p>
          <p className="text-sm text-gray-600 mt-1">Instant eligibility matching</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl mb-2">📢</div>
          <p className="font-semibold text-gray-900">Get Results</p>
          <p className="text-sm text-gray-600 mt-1">See all eligible schemes</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          ✓ Covers schemes from all major departments: Agriculture, Education, Social Welfare, 
          Employment, Health, and more.
        </p>
        <p className="text-sm text-gray-600">
          ✓ Whether you're a farmer, student, entrepreneur, or worker — we'll find what you qualify for.
        </p>
      </div>

      <motion.button
        onClick={onStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg transition-shadow text-lg"
      >
        Start Finding Schemes →
      </motion.button>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-6"
    >
      <div className="text-5xl">🔍</div>
      <h3 className="text-xl font-bold text-gray-900">Analyzing Your Profile</h3>
      <p className="text-gray-600 text-center max-w-md">
        Matching your profile against our database of government schemes...
      </p>

      {/* Animated Dots */}
      <div className="flex gap-2 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 0.6,
              delay: i * 0.1,
              repeat: Infinity,
            }}
            className="w-3 h-3 bg-blue-500 rounded-full"
          />
        ))}
      </div>

      <p className="text-sm text-gray-500">This should take just a few seconds...</p>
    </motion.div>
  );
}

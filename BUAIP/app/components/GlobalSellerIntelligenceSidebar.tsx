"use client";

import React from 'react';

interface GlobalSellerIntelligenceSidebarProps {
  mode: 'global' | 'india';
  setMode: (mode: 'global' | 'india') => void;
  setActiveModule: (moduleId: string) => void;
  setAnalysisResults: (value: any) => void;
}

export default function GlobalSellerIntelligenceSidebar({
  mode,
  setMode,
  setActiveModule,
  setAnalysisResults,
}: GlobalSellerIntelligenceSidebarProps) {
  return (
    <div className="mb-4 rounded-xl border border-white/15 bg-white/5 p-3">
      <div className="text-sm font-bold text-white">🌍 GLOBAL SELLER INTELLIGENCE</div>
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => {
            setMode('global');
            setActiveModule('market');
            setAnalysisResults(null);
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            mode === 'global'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
        >
          GLOBAL
        </button>
        <button
          onClick={() => {
            setMode('india');
            setActiveModule('i1');
            setAnalysisResults(null);
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
            mode === 'india'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
              : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
          }`}
        >
          INDIA
        </button>
      </div>
      <div className="mt-2 text-[11px] text-gray-300">
        {mode === 'global' ? 'Showing 7 global modules' : 'Showing 10 India modules'}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EngineSelectorProps {
  selectedEngine: string;
  onEngineChange: (engine: string) => void;
}

const ENGINES = [
  { id: 'auto', label: 'Auto (BUAIP Decides)', icon: '🤖' },
  { id: 'scheme', label: 'Scheme Eligibility', icon: '🏛️' },
  { id: 'annadata', label: 'ANNADATA (Agriculture)', icon: '🌾' },
  { id: 'nyaya', label: 'NYAYA (Legal Assistant)', icon: '⚖️' },
  { id: 'udyog', label: 'UDYOG (Entrepreneurship)', icon: '🏪' },
  { id: 'globalseller', label: 'GlobalSeller (Export AI)', icon: '🌍' },
  { id: 'atithi', label: 'ATITHI (Travel AI)', icon: '🧳' },
];

export default function EngineSelector({
  selectedEngine,
  onEngineChange,
}: EngineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentEngine = ENGINES.find((e) => e.id === selectedEngine) || ENGINES[0];

  return (
    <div className="mb-4">
      <div className="relative w-full">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-left text-xs sm:text-sm font-medium text-gray-900"
          whileHover={{ borderColor: '#d1d5db' }}
          whileTap={{ scale: 0.99 }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg">{currentEngine.icon}</span>
            <span className="truncate text-xs sm:text-sm">Engine: {currentEngine.label}</span>
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? 'rotate-0' : 'rotate-180'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.button>

        {/* Dropdown Menu - Opens Upward */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-xl py-2 z-50 max-h-80 overflow-y-auto"
            >
              {ENGINES.map((engine, index) => (
                <motion.button
                  key={engine.id}
                  onClick={() => {
                    onEngineChange(engine.id);
                    setIsOpen(false);
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-gray-50 ${
                    selectedEngine === engine.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  <span>{engine.icon}</span>
                  <span>{engine.label}</span>
                  {selectedEngine === engine.id && (
                    <span className="ml-auto">✓</span>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

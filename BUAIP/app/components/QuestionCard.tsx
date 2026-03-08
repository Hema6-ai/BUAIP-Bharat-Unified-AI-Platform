"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface QuestionCardProps {
  question: string;
  options: string[];
  onSelect: (option: string) => void;
  index?: number;
}

export default function QuestionCard({
  question,
  options,
  onSelect,
  index = 0,
}: QuestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm"
    >
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
        {question}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {options.map((option, idx) => (
          <motion.button
            key={idx}
            onClick={() => onSelect(option)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, duration: 0.2 }}
            whileHover={{ scale: 1.02, backgroundColor: '#eff6ff' }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left font-medium"
          >
            {option}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

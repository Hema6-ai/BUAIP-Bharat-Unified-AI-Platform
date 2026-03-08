"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface ResultCardProps {
  title: string;
  description?: string;
  items: {
    label: string;
    value: string | string[];
  }[];
  action?: {
    label: string;
    url: string;
  };
  index?: number;
}

export default function ResultCard({
  title,
  description,
  items,
  action,
  index = 0,
}: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.3 }}
      className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}

      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {item.label}
            </label>
            <div className="text-sm text-gray-600">
              {Array.isArray(item.value) ? (
                <ul className="list-disc list-inside space-y-1">
                  {item.value.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p>{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {action && (
        <motion.a
          href={action.url}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          {action.label}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-4-6l6 6m0 0l-6 6m6-6H3"
            />
          </svg>
        </motion.a>
      )}
    </motion.div>
  );
}

"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface EngineRoutingIndicatorProps {
  engine: string;
  show: boolean;
}

const ENGINE_LABELS: Record<string, string> = {
  scheme: 'Scheme Eligibility Engine',
  annadata: 'ANNADATA Agriculture Intelligence Engine',
  nyaya: 'NYAYA Legal Assistant Engine',
  udyog: 'UDYOG Entrepreneurship Engine',
  globalseller: 'GlobalSeller Export AI Engine',
  atithi: 'ATITHI Travel AI Engine',
};

export default function EngineRoutingIndicator({
  engine,
  show,
}: EngineRoutingIndicatorProps) {
  if (!show) return null;

  const label = ENGINE_LABELS[engine] || 'BUAIP';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
    >
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      <p className="text-xs md:text-sm text-blue-700 font-medium">
        Routing request to <span className="font-semibold">{label}</span>
      </p>
    </motion.div>
  );
}

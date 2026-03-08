"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/app/lib/useTranslation';

export default function TypingIndicator() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 text-gray-600 text-sm"
    >
      <div className="flex gap-1">
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
      </div>
      <span>{t('chat_typing_indicator')}</span>
    </motion.div>
  );
}

"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslation } from '@/app/lib/useTranslation';

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

const PROMPT_SUGGESTION_KEYS = [
  'chat_example_prompt_1',
  'chat_example_prompt_2',
  'chat_example_prompt_3',
  'chat_example_prompt_4',
  'chat_example_prompt_5',
  'chat_example_prompt_6',
];

export default function WelcomeScreen({ onPromptSelect }: WelcomeScreenProps) {
  const { t } = useTranslation();
  const promptSuggestions = PROMPT_SUGGESTION_KEYS.map((key) => t(key));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-full gap-8 text-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative w-20 h-20"
      >
        <Image
          src="/BUAIP_logo.png"
          alt="BUAIP Logo"
          fill
          className="object-contain drop-shadow-lg"
        />
      </motion.div>

      {/* Greeting Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="max-w-2xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {t('chat_welcome_title')}
        </h1>
        <p className="text-lg text-gray-600">
          {t('chat_welcome_description')}
        </p>
      </motion.div>

      {/* Prompt Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4 sm:px-6"
      >
        {promptSuggestions.map((prompt, index) => (
          <motion.button
            key={index}
            onClick={() => onPromptSelect(prompt)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <p className="text-xs sm:text-sm leading-relaxed">{prompt}</p>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}

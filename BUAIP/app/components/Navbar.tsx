"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '@/app/lib/languageContext';
import { useTranslation } from '@/app/lib/useTranslation';
import {
  SUPPORTED_LANGUAGE_GROUPS,
  getLanguageOption,
  getLocalizedDisplayLanguageName,
  type SupportedLanguageCode,
} from '@/app/lib/languageConfig';

interface NavbarProps {
  onLanguageChange?: (language: string) => void;
  onLogoClick?: () => void;
}

export default function Navbar({ onLanguageChange, onLogoClick }: NavbarProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedLanguage = getLanguageOption(language);
  const selectedLanguageLabel = getLocalizedDisplayLanguageName(language, language);

  const regionLabels: Record<string, string> = {
    India: t('navbar_region_india'),
    International: t('navbar_region_international'),
  };

  const handleLanguageSelect = (lang: SupportedLanguageCode) => {
    setLanguage(lang);
    setIsDropdownOpen(false);
    onLanguageChange?.(lang);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Left Side - Logo and Title */}
        <div 
          onClick={onLogoClick}
          className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
            <Image
              src="/BUAIP_logo.png"
              alt="BUAIP Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate">BUAIP</div>
            <div className="text-xs text-gray-500 hidden sm:block truncate">
              {t('navbar_platform_subtitle')}
            </div>
          </div>
        </div>

        {/* Right Side - Language Selector */}
        <div className="relative flex-shrink-0">
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-xs sm:text-sm font-medium text-gray-700"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="hidden sm:inline">{t('header_language')}: {selectedLanguageLabel}</span>
            <span className="sm:hidden">{selectedLanguageLabel}</span>
            <svg
              className={`w-4 h-4 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
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

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-2"
            >
              <div className="px-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t('navbar_select_language')}
              </div>
              {SUPPORTED_LANGUAGE_GROUPS.map((group) => (
                <div key={group.region} className="py-1">
                  <div className="px-4 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                    {regionLabels[group.region] || group.region}
                  </div>
                  {group.languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code as SupportedLanguageCode)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        language === lang.code
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {getLocalizedDisplayLanguageName(lang.code as SupportedLanguageCode, language)}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </nav>
  );
}

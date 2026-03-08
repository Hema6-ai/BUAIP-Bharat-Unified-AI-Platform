"use client";

import React from 'react';
import { useTranslation } from '@/app/lib/useTranslation';

export default function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-logo">BUAIP</div>
      <p>{t('loading_platform')}</p>
    </div>
  );
}

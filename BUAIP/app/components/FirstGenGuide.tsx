"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface FirstGenGuide {
  collegeApplications: string;
  emailTemplates: Array<{ purpose: string; template: string }>;
  networking: string;
  impostorSyndrome: string;
  moneyManagement: string;
  scholarships: string[];
  studentBankAccount: string;
  educationLoans: string;
  internshipOutreach: string;
}

interface FirstGenGuideProps {
  guide: FirstGenGuide;
  onClose?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FirstGenGuide({ guide, onClose }: FirstGenGuideProps) {
  const [activeTab, setActiveTab] = useState<string>('applications');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const tabs = [
    { id: 'applications', label: '🎓 College Applications', icon: '🎓' },
    { id: 'templates', label: '✉️ Email Templates', icon: '✉️' },
    { id: 'networking', label: '🤝 Networking', icon: '🤝' },
    { id: 'impostor', label: '💪 Confidence', icon: '💪' },
    { id: 'money', label: '💰 Money', icon: '💰' },
    { id: 'scholarships', label: '🎁 Scholarships', icon: '🎁' },
    { id: 'banking', label: '🏦 Banking', icon: '🏦' },
    { id: 'loans', label: '💳 Loans', icon: '💳' },
    { id: 'internships', label: '💼 Internships', icon: '💼' },
  ];

  const copyToClipboard = (text: string, purpose: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(purpose);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'applications':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">College Applications Guide</h3>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.collegeApplications}
            </div>
          </div>
        );

      case 'templates':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Professional Email Templates</h3>
            <p className="text-gray-600 mb-6">
              Copy and customize these templates for your needs. Always personalize them before sending!
            </p>
            <div className="space-y-4">
              {guide.emailTemplates.map((template, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{template.purpose}</h4>
                    <button
                      onClick={() => copyToClipboard(template.template, template.purpose)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      {copiedTemplate === template.purpose ? '✓ Copied!' : '📋 Copy'}
                    </button>
                  </div>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white p-3 rounded border border-gray-200">
                    {template.template}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        );

      case 'networking':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Building Your Network from Zero</h3>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.networking}
            </div>
          </div>
        );

      case 'impostor':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Overcoming Impostor Syndrome</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-900 text-sm">
                <strong>Remember:</strong> You belong here. Your background is your strength, not a weakness.
              </p>
            </div>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.impostorSyndrome}
            </div>
          </div>
        );

      case 'money':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Student Money Management</h3>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.moneyManagement}
            </div>
          </div>
        );

      case 'scholarships':
        return (
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Accessible Scholarships</h3>
            <p className="text-gray-600 mb-6">
              These scholarships are actually accessible to students from all backgrounds:
            </p>
            <ul className="space-y-3">
              {guide.scholarships.map((scholarship, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <span className="text-green-600 font-bold text-lg">✓</span>
                  <span className="text-gray-700">{scholarship}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        );

      case 'banking':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Student Bank Accounts</h3>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.studentBankAccount}
            </div>
          </div>
        );

      case 'loans':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Education Loans - The Real Story</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-900 text-sm">
                <strong>Caution:</strong> Only take loans if you have a clear repayment plan. Research thoroughly.
              </p>
            </div>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.educationLoans}
            </div>
          </div>
        );

      case 'internships':
        return (
          <div className="prose max-w-none">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Getting Your First Internship</h3>
            <div className="text-gray-700 whitespace-pre-line leading-relaxed">
              {guide.internshipOutreach}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        {onClose && (
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2 text-sm font-medium"
          >
            ← Back
          </button>
        )}
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          🌟 First-Generation Student Survival Guide
        </h2>
        <p className="text-gray-600">
          Everything you need to know that nobody told you. You've got this!
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label.replace(/🎓|✉️|🤝|💪|💰|🎁|🏦|💳|💼/g, '').trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm"
      >
        {renderContent()}
      </motion.div>

      {/* Encouragement Footer */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <h4 className="font-bold text-purple-900 mb-2">💪 You're Not Alone</h4>
        <p className="text-purple-800 text-sm">
          Being a first-generation student is tough, but thousands have walked this path before you and succeeded. 
          Your determination and fresh perspective are valuable assets. Keep learning, stay humble, and don't be afraid to ask for help.
        </p>
      </div>
    </div>
  );
}

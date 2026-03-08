'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CitizenProfile } from '@/app/lib/schemeEligibilityTypes';

interface SchemeWizardFormProps {
  onSubmit: (profile: CitizenProfile) => void;
  isLoading?: boolean;
}

const STEPS = [
  { id: 'personal', title: 'Personal Information', icon: '👤' },
  { id: 'occupation', title: 'Occupation & Work', icon: '💼' },
  { id: 'income', title: 'Income Details', icon: '💰' },
  { id: 'category', title: 'Social Category', icon: '📋' },
  { id: 'special', title: 'Special Conditions', icon: '⭐' },
];

const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Ladakh',
  'Puducherry',
];

export default function SchemeWizardForm({ onSubmit, isLoading }: SchemeWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<Partial<CitizenProfile>>({
    specialConditions: {
      disability: false,
      widow: false,
      singleParent: false,
      veteran: false,
      artisan: false,
      smallBusinessOwner: false,
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSpecialConditionChange = (condition: string, value: boolean) => {
    setProfile((prev) => {
      const currentConditions = prev.specialConditions || {
        disability: false,
        widow: false,
        singleParent: false,
        veteran: false,
        artisan: false,
        smallBusinessOwner: false,
      };
      return {
        ...prev,
        specialConditions: {
          ...currentConditions,
          [condition]: value,
        },
      };
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (isCompleteProfile(profile)) {
      onSubmit(profile as CitizenProfile);
    }
  };

  const isCompleteProfile = (p: Partial<CitizenProfile>): p is CitizenProfile => {
    return (
      p.age !== undefined &&
      p.gender !== undefined &&
      p.state !== undefined &&
      p.district !== undefined &&
      p.occupation !== undefined &&
      p.annualHouseholdIncome !== undefined &&
      p.socialCategory !== undefined &&
      p.educationLevel !== undefined &&
      p.landOwnership !== undefined &&
      p.specialConditions !== undefined
    );
  };

  const stepContent = {
    personal: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            min="1"
            max="120"
            value={profile.age || ''}
            onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your age"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {(['male', 'female', 'other', 'prefer_not_to_say'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => handleInputChange('gender', gender)}
                className={`py-2 rounded-lg font-medium transition-colors ${
                  profile.gender === gender
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {gender === 'prefer_not_to_say' ? 'Prefer not to say' : gender.charAt(0).toUpperCase() + gender.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select
            value={profile.state || ''}
            onChange={(e) => handleInputChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select your state</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <input
            type="text"
            value={profile.district || ''}
            onChange={(e) => handleInputChange('district', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your district"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Area Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['rural', 'semi-urban', 'urban'] as const).map((area) => (
              <button
                key={area}
                onClick={() => handleInputChange('areaType', area)}
                className={`py-2 rounded-lg font-medium text-sm transition-colors ${
                  profile.areaType === area
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {area === 'semi-urban' ? 'Semi-Urban' : area.charAt(0).toUpperCase() + area.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),

    occupation: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">What best describes your occupation?</label>
          <div className="grid grid-cols-1 gap-2">
            {([
              'student',
              'farmer',
              'entrepreneur',
              'worker',
              'self_employed',
              'govt_employee',
              'unemployed',
              'senior_citizen',
              'other',
            ] as const).map((occ) => (
              <button
                key={occ}
                onClick={() => handleInputChange('occupation', occ)}
                className={`p-3 rounded-lg font-medium text-left transition-colors ${
                  profile.occupation === occ
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {occ === 'self_employed'
                  ? 'Self-Employed'
                  : occ === 'govt_employee'
                    ? 'Government Employee'
                    : occ === 'senior_citizen'
                      ? 'Senior Citizen'
                      : occ.charAt(0).toUpperCase() + occ.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {profile.occupation === 'farmer' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Land Ownership Status</label>
            <div className="grid grid-cols-1 gap-2">
              {(['owns_land', 'tenant_farmer', 'landless'] as const).map((land) => (
                <button
                  key={land}
                  onClick={() => handleInputChange('landOwnership', land)}
                  className={`p-3 rounded-lg font-medium text-left transition-colors ${
                    profile.landOwnership === land
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {land === 'owns_land' ? 'Own Land' : land === 'tenant_farmer' ? 'Tenant Farmer' : 'Landless'}
                </button>
              ))}
            </div>
          </div>
        )}

        {profile.occupation === 'entrepreneur' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Stage</label>
            <div className="grid grid-cols-1 gap-2">
              {(['idea', 'startup', 'existing', 'msme'] as const).map((stage) => (
                <button
                  key={stage}
                  onClick={() => handleInputChange('businessStage', stage)}
                  className={`p-3 rounded-lg font-medium text-left transition-colors ${
                    profile.businessStage === stage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    ),

    income: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Household Income (₹)</label>
          <input
            type="number"
            value={profile.annualHouseholdIncome || ''}
            onChange={(e) => handleInputChange('annualHouseholdIncome', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 300000"
          />
          <p className="text-xs text-gray-500 mt-1">Total combined family income</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">BPL Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['bpl', 'apl', 'not_sure'] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleInputChange('bplStatus', status)}
                className={`py-2 rounded-lg font-medium text-sm transition-colors ${
                  profile.bplStatus === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'not_sure' ? 'Not Sure' : status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),

    category: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Social Category</label>
          <div className="grid grid-cols-1 gap-2">
            {(['general', 'obc', 'sc', 'st', 'ews', 'minority', 'prefer_not_to_say'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => handleInputChange('socialCategory', cat)}
                className={`p-3 rounded-lg font-medium text-left transition-colors ${
                  profile.socialCategory === cat
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'prefer_not_to_say' ? 'Prefer Not to Say' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Education Level</label>
          <div className="grid grid-cols-1 gap-2">
            {(['no_formal', 'school', 'college', 'graduate', 'postgraduate'] as const).map((edu) => (
              <button
                key={edu}
                onClick={() => handleInputChange('educationLevel', edu)}
                className={`p-3 rounded-lg font-medium text-left transition-colors ${
                  profile.educationLevel === edu
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {edu === 'no_formal'
                  ? 'No Formal Education'
                  : edu.charAt(0).toUpperCase() + edu.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    ),

    special: (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Do any of these conditions apply to you?</label>
          <div className="space-y-3">
            {[
              { id: 'disability', label: '♿ Person with Disability' },
              { id: 'widow', label: '🤍 Widow' },
              { id: 'singleParent', label: '👨‍👧 Single Parent' },
              { id: 'veteran', label: '🎖️ Veteran / Ex-Serviceman' },
              { id: 'artisan', label: '🎨 Artisan / Craftsperson' },
              { id: 'smallBusinessOwner', label: '🏪 Small Business Owner' },
            ].map(({ id, label }) => (
              <label key={id} className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-200">
                <input
                  type="checkbox"
                  checked={(profile.specialConditions as any)?.[id] || false}
                  onChange={(e) => handleSpecialConditionChange(id, e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 font-medium text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${
                  idx <= currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
                animate={{ scale: idx === currentStep ? 1.1 : 1 }}
              >
                {step.icon}
              </motion.div>
              <p className={`text-xs sm:text-sm font-medium mt-2 text-center ${
                idx <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {step.title}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 w-full h-1 bg-gray-200 rounded-full relative overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-white p-6 rounded-lg border border-gray-200 mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">{STEPS[currentStep].title}</h2>
          {stepContent[STEPS[currentStep].id as keyof typeof stepContent]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex gap-3 justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          ← Previous
        </button>

        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Next →
          </button>
        ) : (
          <motion.button
            onClick={handleSubmit}
            disabled={!isCompleteProfile(profile) || isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-2 rounded-lg font-bold bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Find My Schemes ✨'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

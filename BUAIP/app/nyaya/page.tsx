'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight, Send, Scale } from 'lucide-react';
import { askEngine, type EngineResponse } from '@/src/lib/engineApi';

interface NyayaRequest {
  state: string;
  issueType: string;
  description: string;
  language: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const ISSUE_TYPES = [
  { id: 'police', label: '🚔 Police Complaint (FIR, Criminal)' },
  { id: 'consumer', label: '🛍️ Consumer Issue (Fraud, Bad Service)' },
  { id: 'civil', label: '🏠 Land / Property Dispute' },
  { id: 'workplace', label: '💼 Workplace Harassment (Gender, Discrimination)' },
  { id: 'government', label: '📋 Government Service Delay' },
  { id: 'rti', label: '📄 RTI Request (Right to Information)' },
  { id: 'other', label: '❓ Other Safety / Rights Issue' }
];

export default function NyayaPage() {
  const router = useRouter();
  const [form, setForm] = useState<NyayaRequest>({
    state: '',
    issueType: '',
    description: '',
    language: 'en'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, string> = {};
    if (!form.state) newErrors.state = 'Please select your state';
    if (!form.issueType) newErrors.issueType = 'Please select the issue type';
    if (!form.description || form.description.trim().length < 20) {
      newErrors.description = 'Please describe what happened (at least 20 characters)';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      // Construct natural language query for AWS backend
      const issueLabel = ISSUE_TYPES.find(t => t.id === form.issueType)?.label || form.issueType;
      const query = `I am from ${form.state}. I have a ${issueLabel} issue. ${form.description}`;
      
      const response: EngineResponse = await askEngine('nyaya', query);
      
      // Store response in sessionStorage for the guidance page
      const data = {
        guidance: response.answer,
        steps: [],
        resources: []
      };
      sessionStorage.setItem('nyaya_response', JSON.stringify(data));
      sessionStorage.setItem('nyaya_request', JSON.stringify(form));
      
      // Redirect to guidance page
      router.push('/nyaya/guidance');
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Could not get guidance. Please try again.' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-purple-600" />
            <h1 className="text-4xl font-bold text-gray-900">NYAYA</h1>
          </div>
          <p className="text-gray-700 text-lg font-medium mb-2">Legal & Rights Assistant</p>
          <p className="text-gray-600">
            Get guidance on your rights. No legal knowledge needed. No fees. No lawyers yet.
          </p>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">This is a helpdesk, not a lawyer.</p>
              <p>We help you understand your rights and prepare documents. Our AI uses common sense, not case law.</p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* State Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                1️⃣ Which state are you in?
              </label>
              <select
                value={form.state}
                onChange={(e) => {
                  setForm({ ...form, state: e.target.value });
                  setErrors({ ...errors, state: '' });
                }}
                className="w-full p-4 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:outline-none font-semibold text-gray-700"
              >
                <option value="">-- Select Your State --</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && <p className="text-red-600 text-sm mt-2">{errors.state}</p>}
            </div>

            {/* Issue Type Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                2️⃣ What's your issue type?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {ISSUE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, issueType: type.id });
                      setErrors({ ...errors, issueType: '' });
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left font-semibold ${
                      form.issueType === type.id
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {errors.issueType && <p className="text-red-600 text-sm mt-2">{errors.issueType}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                3️⃣ Tell us what happened
              </label>
              <p className="text-gray-600 text-sm mb-3">
                Be specific. What happened? When? Where? Who is involved? What do you want now?
              </p>
              <textarea
                value={form.description}
                onChange={(e) => {
                  setForm({ ...form, description: e.target.value });
                  setErrors({ ...errors, description: '' });
                }}
                placeholder="I was cheated by the shopkeeper. I bought a laptop for 50,000 rupees on 5 March 2026. The next day it would not start..."
                className="w-full p-4 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:outline-none font-semibold text-gray-700 h-32 resize-none"
              />
              {errors.description && <p className="text-red-600 text-sm mt-2">{errors.description}</p>}
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-3">
                4️⃣ What language do you prefer?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'ta', label: 'தமிழ்' }
                ].map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setForm({ ...form, language: lang.code })}
                    className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                      form.language === lang.code
                        ? 'border-purple-600 bg-purple-100 text-purple-900'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5" />
                {errors.submit}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Getting Guidance...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Get Guidance
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>Your information is private and secure.</p>
          <p className="mt-2">This service is free and available to all Indian citizens.</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { askEngine, type EngineResponse } from '@/src/lib/engineApi';

type UdyogLanguage = 'en' | 'te' | 'hi' | 'ta';

interface UdyogRequest {
  state: string;
  workType: string;
  monthlyIncomeRange?: string;
  goal: string;
  description: string;
  language: UdyogLanguage;
  followUpMessage?: string;
  journeyHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface UdyogResponse {
  explanation: string;
  stepsToTake: string[];
  governmentOptions: string[];
  documentsNeeded: string[];
  nextMilestone: string;
  voiceReadyText: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const WORK_TYPES = [
  'Street Vendor',
  'Small Shop',
  'Home Business',
  'Freelancer',
  'Farmer Side-Business',
  'Service Worker',
  'Other'
];

const GOALS = [
  'Get Loan',
  'Register Business',
  'Accept Digital Payments',
  'Manage Money Better',
  'Grow Business',
  'Just Exploring'
];

const INCOME_RANGES = [
  'Below ₹10,000',
  '₹10,000 - ₹25,000',
  '₹25,000 - ₹50,000',
  '₹50,000 - ₹1,00,000',
  'Above ₹1,00,000'
];

const defaultRequest: UdyogRequest = {
  state: '',
  workType: '',
  monthlyIncomeRange: '',
  goal: '',
  description: '',
  language: 'en',
};

export default function UdyogPage() {
  const [form, setForm] = useState<UdyogRequest>(defaultRequest);
  const [response, setResponse] = useState<UdyogResponse | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [journeyHistory, setJourneyHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedContext = sessionStorage.getItem('udyog_context');
    const savedResponse = sessionStorage.getItem('udyog_response');
    const savedHistory = sessionStorage.getItem('udyog_journey_history');

    if (savedContext) {
      setForm(JSON.parse(savedContext) as UdyogRequest);
    }
    if (savedResponse) {
      setResponse(JSON.parse(savedResponse) as UdyogResponse);
    }
    if (savedHistory) {
      setJourneyHistory(JSON.parse(savedHistory) as Array<{ role: 'user' | 'assistant'; content: string }>);
    }
  }, []);

  const canSubmit = useMemo(() => {
    return Boolean(form.state && form.workType && form.goal && form.description.trim().length >= 12);
  }, [form]);

  const languageLabel: Record<UdyogLanguage, string> = {
    en: 'English',
    hi: 'हिंदी',
    te: 'తెలుగు',
    ta: 'தமிழ்',
  };

  const runVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Please type your situation.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = form.language === 'en' ? 'en-IN' : form.language === 'hi' ? 'hi-IN' : form.language === 'te' ? 'te-IN' : 'ta-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setError(null);
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setError('Could not capture voice clearly. Please try again or type your situation.');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setForm((prev) => ({
        ...prev,
        description: prev.description ? `${prev.description} ${transcript}`.trim() : transcript,
      }));
    };

    recognition.start();
  };

  const saveSession = (nextResponse: UdyogResponse, nextHistory: Array<{ role: 'user' | 'assistant'; content: string }>) => {
    sessionStorage.setItem('udyog_context', JSON.stringify(form));
    sessionStorage.setItem('udyog_response', JSON.stringify(nextResponse));
    sessionStorage.setItem('udyog_journey_history', JSON.stringify(nextHistory.slice(-12)));
  };

  const callUdyog = async (payload: UdyogRequest, userMessage: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Construct natural language query for AWS backend
      const query = `I am in ${payload.state}, doing ${payload.workType} work. Monthly income range: ${payload.monthlyIncomeRange}. My goal is: ${payload.goal}. ${payload.description}${payload.journeyHistory?.length ? ' Previous conversation: ' + payload.journeyHistory.slice(-2).map(h => h.content).join(' ') : ''}`;
      
      const response: EngineResponse = await askEngine('udyog', query);

      // Create response in expected format
      const data: UdyogResponse = {
        explanation: response.answer,
        stepsToTake: [],
        governmentOptions: [],
        documentsNeeded: [],
        nextMilestone: 'Continue your journey',
        voiceReadyText: response.answer
      };
      const historyBuffer: Array<{ role: 'user' | 'assistant'; content: string }> = [...journeyHistory];
      historyBuffer.push({ role: 'user', content: userMessage });
      historyBuffer.push({ role: 'assistant', content: data.voiceReadyText || data.explanation });
      const nextHistory = historyBuffer.slice(-12);

      setResponse(data);
      setJourneyHistory(nextHistory);
      saveSession(data, nextHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const startGuidance = async () => {
    if (!canSubmit) {
      setError('Please fill state, type of work, goal, and describe your situation.');
      return;
    }

    await callUdyog(
      {
        ...form,
        journeyHistory,
      },
      form.description
    );
  };

  const continueJourney = async () => {
    if (!followUp.trim()) {
      setError('Please type your follow-up question.');
      return;
    }

    await callUdyog(
      {
        ...form,
        followUpMessage: followUp.trim(),
        journeyHistory,
      },
      followUp.trim()
    );

    setFollowUp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-cyan-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">UDYOG — Micro-Business & Financial Mentor</h1>
          <p className="mt-2 text-gray-600">
            Start small. Grow smart. We guide you step-by-step for Udyam registration, MUDRA loans, UPI setup, and basic money flow.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Tell us about your situation</h2>
          <p className="mt-1 text-sm text-gray-600">This is a mentor conversation, not a bank form.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">State</label>
              <select
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Type of work</label>
              <select
                value={form.workType}
                onChange={(e) => setForm((prev) => ({ ...prev, workType: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">Select type</option>
                {WORK_TYPES.map((work) => (
                  <option key={work} value={work}>{work}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Monthly income range (optional)</label>
              <select
                value={form.monthlyIncomeRange}
                onChange={(e) => setForm((prev) => ({ ...prev, monthlyIncomeRange: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">Select range</option>
                {INCOME_RANGES.map((income) => (
                  <option key={income} value={income}>{income}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Goal</label>
              <select
                value={form.goal}
                onChange={(e) => setForm((prev) => ({ ...prev, goal: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="">Select goal</option>
                {GOALS.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Describe your situation (text or voice)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Example: I run a small tea stall and want to take a small MUDRA loan, but I don’t know registration and documents."
              className="h-32 w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-cyan-500"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={runVoiceInput}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? 'Listening…' : 'Use Voice Input'}
              </button>
              <span className="text-xs text-gray-500">Language: {languageLabel[form.language]}</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Language</label>
            <div className="flex flex-wrap gap-2">
              {(['en', 'hi', 'te', 'ta'] as UdyogLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, language: lang }))}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    form.language === lang
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {languageLabel[lang]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={startGuidance}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-3 font-semibold text-white hover:from-cyan-700 hover:to-sky-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isLoading ? 'Generating Guidance…' : 'Start My UDYOG Journey'}
          </button>
        </div>

        {response && (
          <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900">Your UDYOG Journey Plan</h3>

            <div className="mt-4 rounded-xl bg-cyan-50 p-4">
              <p className="text-sm font-semibold text-cyan-900">What this means for you</p>
              <p className="mt-1 text-sm text-cyan-800">{response.explanation}</p>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-900">Steps to take</p>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {response.stepsToTake.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Government options</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {response.governmentOptions.map((option, index) => (
                    <li key={`${option}-${index}`}>{option}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Documents needed</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                  {response.documentsNeeded.length > 0 ? (
                    response.documentsNeeded.map((doc, index) => <li key={`${doc}-${index}`}>{doc}</li>)
                  ) : (
                    <li>No mandatory documents right now for this step.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">Next milestone</p>
              <p className="mt-1 text-sm text-sky-800">{response.nextMilestone}</p>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Voice-ready guidance</p>
              <p className="mt-1 text-sm text-gray-700">{response.voiceReadyText}</p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <p className="text-sm font-semibold text-gray-900">Journey Mode — continue from where you stopped</p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row">
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Example: Done with Udyam. What next?"
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={continueJourney}
                  disabled={isLoading}
                  className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {isLoading ? 'Continuing…' : 'Continue Journey'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

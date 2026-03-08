'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Copy, Download, Home, Volume2 } from 'lucide-react';

interface NyayaResponse {
  explanation: string;
  steps: string[];
  draftDocument?: string;
  voiceReadyText: string;
  intent: string;
  officesToApproach: string[];
  timelineExpected: string;
  reasoning: {
    analysis: string;
    keyPoints: string[];
  };
}

interface NyayaRequest {
  state: string;
  issueType: string;
  description: string;
  language: string;
}

export default function NyayaGuidancePage() {
  const router = useRouter();
  const [response, setResponse] = useState<NyayaResponse | null>(null);
  const [request, setRequest] = useState<NyayaRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Load from sessionStorage
    const storedResponse = sessionStorage.getItem('nyaya_response');
    const storedRequest = sessionStorage.getItem('nyaya_request');
    
    if (storedResponse) {
      setResponse(JSON.parse(storedResponse));
    }
    if (storedRequest) {
      setRequest(JSON.parse(storedRequest));
    }
    
    if (!storedResponse) {
      router.push('/nyaya');
    }
  }, [router]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!response) return;
    
    setSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(response.voiceReadyText);
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadDocument = () => {
    if (!response?.draftDocument) return;
    
    const element = document.createElement('a');
    const file = new Blob([response.draftDocument], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `NYAYA_${request?.issueType}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getIntentIcon = (intent: string): string => {
    const map: Record<string, string> = {
      complaint: '🚔',
      consumer: '🛍️',
      civil: '🏠',
      workplace: '💼',
      government: '📋',
      rti: '📄',
      guidance: '✋'
    };
    return map[intent] || '❓';
  };

  if (!response || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guidance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{getIntentIcon(response.intent)}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Guidance</h1>
              <p className="text-gray-600">{request.state}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>

        {/* Main Explanation Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-purple-600">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What This Means</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{response.explanation}</p>
        </div>

        {/* Voice-Ready Text Card */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl shadow-lg p-8 mb-6 border border-indigo-200">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Simplified Summary
            </h2>
            <button
              onClick={handleSpeak}
              disabled={speaking}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {speaking ? '🔊 Speaking...' : '🔊 Hear It'}
            </button>
          </div>
          <p className="text-gray-700 leading-relaxed">{response.voiceReadyText}</p>
        </div>

        {/* Action Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Action Steps</h2>
          <div className="space-y-4">
            {response.steps.map((step, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 font-bold">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 font-semibold">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Offices to Approach */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📍 Where to Go</h3>
            <ul className="space-y-2">
              {response.officesToApproach.map((office, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>{office}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
            <h3 className="text-lg font-bold text-gray-900 mb-4">⏰ Expected Timeline</h3>
            <p className="text-gray-700 leading-relaxed">{response.timelineExpected}</p>
            <p className="text-sm text-gray-600 mt-4 pt-4 border-t">
              Note: Timelines vary based on complexity and authority responsiveness.
            </p>
          </div>
        </div>

        {/* Key Points */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">🔍 Key Points</h3>
          <ul className="space-y-2">
            {response.reasoning.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-blue-800">
                <span className="font-bold">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Draft Document Section */}
        {response.draftDocument && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border-l-4 border-green-600">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">📄 Draft Document</h2>
            <p className="text-gray-600 mb-4">
              This is a ready-to-use formal document. Copy it, fill in the placeholders like [DATE], [AUTHORITY NAME], [CITIZEN NAME], and submit it.
            </p>

            {/* Document Preview */}
            <div className="bg-gray-50 p-6 rounded-lg mb-4 border border-gray-300 overflow-x-auto">
              <pre className="text-xs whitespace-pre-wrap text-gray-800 font-mono leading-relaxed max-h-96">
                {response.draftDocument}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleCopy(response.draftDocument!)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy Document'}
              </button>
              <button
                onClick={handleDownloadDocument}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download as Text
              </button>
            </div>
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6 mb-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="space-y-2 text-yellow-800 text-sm">
                <li>✓ Keep all proof documents (photos, messages, bills, etc.)</li>
                <li>✓ Submit documents in writing and keep copies</li>
                <li>✓ Get receipt/acknowledgment when submitting</li>
                <li>✓ Follow up regularly in person or by letter</li>
                <li>✓ If not satisfied, you can escalate to higher authority</li>
                <li>✓ Many services have free legal aid - ask at the office</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => router.push('/nyaya')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Ask Another Question
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-colors"
          >
            Back to Engines
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm pb-8">
          <p>This guidance is based on common law and procedures. Consult professionals for specific cases.</p>
          <p className="mt-2">NYAYA - Your Digital Legal Assistant. Free. Confidential. For All Indians.</p>
        </div>
      </div>
    </div>
  );
}

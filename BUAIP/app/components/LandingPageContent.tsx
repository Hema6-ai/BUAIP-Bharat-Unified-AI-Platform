// app/components/LandingPageContent.tsx
"use client";

import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";

export function LandingPageContent() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header with Language Switcher */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">BUAIP</h1>
            <p className="text-sm text-gray-600">Bharat Unified Access Intelligence Platform</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content - Engine Cards */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Choose Your Engine
            </h2>
            <p className="text-lg text-gray-600">
              Ten intelligent systems, one powerful platform
            </p>
          </div>

          {/* Cards Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Card 1: Scheme Eligibility Engine */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-200 hover:-translate-y-1">
              {/* Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Scheme Eligibility Engine
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Access government welfare schemes with clarity.
                Find eligibility, apply confidently, and track opportunities.
              </p>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/citizen-dashboard")}
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Citizen Access
                </button>
                <button
                  onClick={() => router.push("/admin-dashboard")}
                  className="w-full bg-white hover:bg-gray-50 text-indigo-600 font-semibold py-3 px-6 rounded-xl border-2 border-indigo-600 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Government Access
                </button>
              </div>
            </div>

            {/* Card 2: ANNADATA Farmer Engine */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-200 hover:-translate-y-1">
              {/* Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h10M12 4v16m0-16c-2.5 1.5-4 4-4 7s1.5 5.5 4 7c2.5-1.5 4-4 4-7s-1.5-5.5-4-7z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                ANNADATA — Farmer Intelligence Engine
              </h3>
              <p className="text-sm text-amber-700 font-medium mb-3">
                Real-time crop prices, weather alerts, and scheme guidance — in your own language.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Voice-first AI designed for farmers. Works even with low literacy, low connectivity, and basic smartphones.
              </p>

              {/* Button */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/app/annadata")}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Enter ANNADATA
                </button>
              </div>
            </div>

            {/* Card 4: NYAYA Legal & Rights Engine */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-200 hover:-translate-y-1">
              {/* Icon */}
              <div className="mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                NYAYA — Legal & Rights Assistant
              </h3>
              <p className="text-sm text-purple-700 font-medium mb-3">
                Understand your rights without legal knowledge.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                File complaints. Generate RTI applications. Know your rights. No lawyer needed. Clear, simple guidance in your language.
              </p>

              {/* Button */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/nyaya")}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Enter NYAYA
                </button>
              </div>
            </div>

            {/* Card 5: UDYOG Financial Inclusion Engine */}
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-gray-200 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2 0-3.5.9-3.5 2s1.5 2 3.5 2 3.5.9 3.5 2-1.5 2-3.5 2m0-10V6m0 12v-2m8-4a8 8 0 11-16 0 8 8 0 0116 0z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                UDYOG — Micro-Business & Financial Mentor
              </h3>
              <p className="text-sm text-cyan-700 font-medium mb-3">
                Start small. Grow smart.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Get guidance on Udyam registration, MUDRA loans, UPI setup, and basic business finance — in your language.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/udyog")}
                  className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-700 hover:to-sky-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Enter UDYOG
                </button>
              </div>
            </div>

            {/* Card 6: GLOBALSELLER AI E-Commerce Engine */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-blue-400/30 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0016 5.5V3.935m0 0a2.5 2.5 0 00-5 0m0 0a2.5 2.5 0 00-5 0m15 0A2.5 2.5 0 0021 5.5v.75a2.5 2.5 0 01-5 0V5.5m0 0h-5v1a2 2 0 01-4 0v-1h-5" />
                  </svg>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                🌍 GLOBALSELLER AI — Cross-Border E-Commerce
              </h3>
              <p className="text-sm text-blue-300 font-medium mb-3">
                Global Amazon selling made smart.
              </p>
              <p className="text-gray-100 mb-8 leading-relaxed">
                AI co-pilot for global Amazon selling. Market expansion, compliance, pricing, supplier intelligence, and launch strategy — in one dashboard. Solve all 7 cross-border problems.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/globalseller")}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Enter GLOBALSELLER AI
                </button>
              </div>
            </div>

            {/* Card 7: ATITHI AI India Access Assistant */}
            <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border border-teal-300/30 hover:-translate-y-1">
              <div className="mb-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h.5A2.5 2.5 0 0016 5.5V3.935m0 0a2.5 2.5 0 00-5 0m0 0a2.5 2.5 0 00-5 0m15 0A2.5 2.5 0 0021 5.5v.75a2.5 2.5 0 01-5 0V5.5m0 0h-5v1a2 2 0 01-4 0v-1h-5" />
                  </svg>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                🌏 ATITHI AI — India Access Assistant
              </h3>
              <p className="text-sm text-teal-100 font-medium mb-3">
                Your AI guide to India.
              </p>
              <p className="text-white/90 mb-8 leading-relaxed">
                Get help with travel, culture, safety, payments, and tourist destinations. Navigate India safely with AI-powered guidance in multiple languages.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/atithi")}
                  className="w-full bg-white hover:bg-teal-50 text-teal-700 font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Enter ATITHI AI
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InteractionMode = "voice" | "text";
type Language = "en" | "te" | "hi" | "ta";

interface FarmerProfile {
  id: string;
  state: string;
  district: string;
  crop: string;
  language: Language;
  interactionMode: InteractionMode;
  createdAt: string;
}

const ALL_INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const CROPS = ["Rice", "Wheat", "Cotton", "Maize", "Chilli", "Sugarcane", "Pulses", "Groundnut", "Millets", "Others"];

const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "te", label: "Telugu" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
];

export function AnnadataOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<"state" | "district" | "crop" | "language" | "mode">("state");

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [crop, setCrop] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("voice");

  useEffect(() => {
    const existing = localStorage.getItem("annadataProfile");
    if (existing) {
      router.push("/annadata/dashboard");
    }
  }, [router]);

  const handleStateSelect = (selectedState: string) => {
    setState(selectedState);
    setStep("district");
  };

  const handleDistrictContinue = () => {
    setStep("crop");
  };

  const handleCropSelect = (selectedCrop: string) => {
    setCrop(selectedCrop);
    setStep("language");
  };

  const handleLanguageSelect = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    setStep("mode");
  };

  const handleStart = () => {
    if (!state || !crop || !language || !interactionMode) return;

    const profile: FarmerProfile = {
      id: `farmer_${Date.now()}`,
      state,
      district: district.trim() || "Not specified",
      crop,
      language,
      interactionMode,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("annadataProfile", JSON.stringify(profile));
    router.push("/annadata/dashboard");
  };

  // Progress bar
  const stepIndex = { state: 0, district: 1, crop: 2, language: 3, mode: 4 };
  const currentStepIndex = stepIndex[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-5 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-3">🌾 ANNADATA</h1>
          <p className="text-lg text-gray-700">Agricultural Decision Intelligence</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                i <= currentStepIndex ? "bg-amber-500" : "bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step: State Selection */}
        {step === "state" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Which state are you farming in?</h2>
            <div className="max-h-80 overflow-y-auto grid grid-cols-2 gap-3">
              {ALL_INDIAN_STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStateSelect(s)}
                  className={`p-4 rounded-lg border-2 transition-all text-left font-semibold ${
                    state === s
                      ? "border-amber-500 bg-amber-100 text-amber-900"
                      : "border-gray-200 bg-white text-gray-800 hover:border-amber-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: District */}
        {step === "district" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{state}</h2>
            <p className="text-gray-600 mb-6">Which district are you in? (Optional)</p>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g., Guntur, Aurangabad, Patna"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:outline-none text-lg mb-8"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep("state")}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleDistrictContinue}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step: Crop Selection */}
        {step === "crop" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What is your primary crop?</h2>
            <div className="grid grid-cols-2 gap-3">
              {CROPS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCropSelect(c)}
                  className={`p-4 rounded-lg border-2 text-left font-semibold transition-all ${
                    crop === c
                      ? "border-amber-500 bg-amber-100 text-amber-900"
                      : "border-gray-200 bg-white text-gray-800 hover:border-amber-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep("district")}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => handleCropSelect(crop)}
                disabled={!crop}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step: Language Selection */}
        {step === "language" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Preferred Language</h2>
            <div className="grid grid-cols-2 gap-4">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => handleLanguageSelect(code)}
                  className={`p-6 rounded-lg border-2 transition-all font-semibold text-lg ${
                    language === code
                      ? "border-amber-500 bg-amber-100 text-amber-900"
                      : "border-gray-200 bg-white text-gray-800 hover:border-amber-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep("crop")}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => handleLanguageSelect(language)}
                className="flex-1 px-4 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step: Interaction Mode */}
        {step === "mode" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">How do you prefer to interact?</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setInteractionMode("voice")}
                className={`p-8 rounded-lg border-2 transition-all text-center ${
                  interactionMode === "voice"
                    ? "border-amber-500 bg-amber-100"
                    : "border-gray-200 bg-white hover:border-amber-300"
                }`}
              >
                <div className="text-5xl mb-4">🎤</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Voice Mode</h3>
                <p className="text-sm text-gray-700">Speak questions. Get voice responses.</p>
              </button>

              <button
                onClick={() => setInteractionMode("text")}
                className={`p-8 rounded-lg border-2 transition-all text-center ${
                  interactionMode === "text"
                    ? "border-amber-500 bg-amber-100"
                    : "border-gray-200 bg-white hover:border-amber-300"
                }`}
              >
                <div className="text-5xl mb-4">⌨️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Text Mode</h3>
                <p className="text-sm text-gray-700">Type questions. Get written responses.</p>
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep("language")}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button onClick={handleStart} className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:shadow-lg">
                Start Using ANNADATA →
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-600 text-sm">
          <p>Powered by Real Mandi Data + Claude AI</p>
        </div>
      </div>
    </div>
  );
}

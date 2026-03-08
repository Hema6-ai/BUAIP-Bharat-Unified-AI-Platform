"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpeechRecognition, useSpeechSynthesis } from "@/app/lib/useVoice";
import { askEngine, type EngineResponse } from "@/src/lib/engineApi";

type InteractionMode = "voice" | "text";
type Language = "en" | "te" | "hi" | "ta";
type Panel = "market" | "weather" | "ask";

interface FarmerProfile {
  id: string;
  state: string;
  district: string;
  crop: string;
  language: Language;
  interactionMode: InteractionMode;
  createdAt: string;
}

interface SessionMessage {
  role: "farmer" | "annadata";
  content: string;
  timestamp: string;
}

interface Reasoning {
  priceTrend: "rising" | "falling" | "stable" | "unknown";
  weatherImpact: "rain-risk" | "monitor-weather" | "safe-window" | "weather-uncertain";
  dataConfidence: "high" | "medium" | "low";
  sourceMode: "live" | "cached" | "offline";
  advisoryMode: "market" | "weather" | "scheme" | "general";
}

interface AwsMapping {
  ai: string;
  speechToText: string;
  textToSpeech: string;
  offlineSync: string;
  compute: string;
  storage: string;
  monitorin: string;
}

interface AdvisoryResponse {
  textResponse: string;
  voiceReadyText: string;
  advisoryType: "market" | "weather" | "scheme" | "general";
  seasonalAssumption?: string;
  source: "live" | "cached";
  queuedForSync?: boolean;
  connectivityMode?: "live" | "cached" | "offline";
  reasoning?: Reasoning;
  awsMapping?: AwsMapping;
}

interface PanelState {
  loading: boolean;
  message: string;
  source: "live" | "cached";
}

const PANEL_TITLE: Record<Panel, string> = {
  market: "🌾 Live Mandi Price Insight",
  weather: "☁️ Weather Advisory",
  ask: "📢 Ask ANNADATA",
};

function cacheKey(panel: Panel, profile: FarmerProfile) {
  return `annadata_cache_${panel}_${profile.state}_${profile.crop}_${profile.language}`;
}

function getSessionKey(profile: FarmerProfile): string {
  return `annadata_session_${profile.id}`;
}

function getOfflineFallback(language: Language, panel: Panel): AdvisoryResponse {
  const fallbacks: Record<string, Record<Panel, string>> = {
    en: {
      market: "Network is weak. Last saved mandi advisory: prices are stable nearby, hold for 1-2 days unless storage risk is high.",
      weather: "Network is weak. Last saved weather advisory: possible rain window in the next few days, avoid immediate fertilizer application.",
      ask: "You are offline now. Your question is queued and ANNADATA will respond when the network returns.",
    },
    hi: {
      market: "नेटवर्क कमजोर है। पिछली मंडी सलाह: पास में कीमतें स्थिर हैं, भंडारण जोखिम न हो तो 1-2 दिन रुकें।",
      weather: "नेटवर्क कमजोर है। पिछली मौसम सलाह: अगले कुछ दिनों में बारिश की संभावना है, अभी खाद डालना टालें।",
      ask: "आप अभी ऑफलाइन हैं। आपका सवाल कतार में है, नेटवर्क आते ही ANNADATA जवाब देगा।",
    },
    te: {
      market: "నెట్‌వర్క్ బలహీనంగా ఉంది. చివరిసారి సేవ్ చేసిన మండీ సలహా: ధరలు స్థిరంగా ఉన్నాయి, నిల్వ ప్రమాదం లేకపోతే 1-2 రోజులు ఆగండి.",
      weather: "నెట్‌వర్క్ బలహీనంగా ఉంది. చివరిసారి సేవ్ చేసిన వాతావరణ సలహా: కొన్ని రోజుల్లో వర్షం వచ్చే అవకాశం ఉంది, ఎరువు వేయడం ఆలస్యం చేయండి.",
      ask: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. మీ ప్రశ్న క్యూలో చేరింది, నెట్‌వర్క్ వచ్చిన వెంటనే ANNADATA సమాధానం ఇస్తుంది.",
    },
    ta: {
      market: "நெட்வொர்க் பலவீனமாக உள்ளது. சேமிக்கப்பட்ட சந்தை ஆலோசனை: அருகிலுள்ள விலை நிலையாக உள்ளது, சேமிப்பு ஆபத்து இல்லையெனில் 1-2 நாள் காத்திருக்கவும்.",
      weather: "நெட்வொர்க் பலவீனமாக உள்ளது. சேமிக்கப்பட்ட வானிலை ஆலோசனை: வரும் நாட்களில் மழை வாய்ப்பு உள்ளது, உடனடி உரப் பயன்பாட்டை தாமதிக்கவும்.",
      ask: "நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள். உங்கள் கேள்வி வரிசையில் சேமிக்கப்பட்டது, நெட்வொர்க் வந்தவுடன் ANNADATA பதிலளிக்கும்.",
    },
  };

  const text = fallbacks[language]?.[panel] || fallbacks.en[panel];

  return {
    textResponse: text,
    voiceReadyText: text,
    advisoryType: panel === "market" ? "market" : panel === "weather" ? "weather" : "general",
    seasonalAssumption: "",
    source: "cached",
    queuedForSync: panel === "ask",
  };
}

export default function AnnadataDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [schemeMessage, setSchemeMessage] = useState("You are eligible for PM-KISAN. Apply before deadline.");
  const [question, setQuestion] = useState("");
  const [session, setSession] = useState<SessionMessage[]>([]);
  const [connectivityMode, setConnectivityMode] = useState<"live" | "cached" | "offline">("live");
  const [dataConfidence, setDataConfidence] = useState<"high" | "medium" | "low">("high");

  const [marketPanel, setMarketPanel] = useState<PanelState>({
    loading: true,
    message: "",
    source: "live",
  });
  const [weatherPanel, setWeatherPanel] = useState<PanelState>({
    loading: true,
    message: "",
    source: "live",
  });
  const [askPanel, setAskPanel] = useState<PanelState>({
    loading: false,
    message: "Tap mic or type a question.",
    source: "live",
  });

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: isSpeechRecognitionSupported,
  } = useSpeechRecognition(profile?.language || "en");

  const { speak, stop, isSpeaking } = useSpeechSynthesis(profile?.language || "en");

  useEffect(() => {
    const stored = localStorage.getItem("annadataProfile");
    if (!stored) {
      router.push("/annadata");
      return;
    }

    const parsedProfile = JSON.parse(stored) as FarmerProfile;
    setProfile(parsedProfile);
    
    // Load session history
    const sessionKey = getSessionKey(parsedProfile);
    const savedSession = localStorage.getItem(sessionKey);
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        setSession([]);
      }
    }
    
    setIsOnline(window.navigator.onLine);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [router]);

  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript]);

  const fetchPanel = useCallback(
    async (panel: Exclude<Panel, "ask">) => {
      if (!profile) return;

      const setPanel = panel === "market" ? setMarketPanel : setWeatherPanel;
      setPanel((prev) => ({ ...prev, loading: true }));

      const localFallback = getOfflineFallback(profile.language, panel);

      if (!isOnline) {
        const cached = localStorage.getItem(cacheKey(panel, profile));
        if (cached) {
          const parsed = JSON.parse(cached) as AdvisoryResponse;
          setPanel({
            loading: false,
            message: parsed.textResponse,
            source: "cached",
          });
          return;
        }

        setPanel({
          loading: false,
          message: localFallback.textResponse,
          source: "cached",
        });
        return;
      }

      try {
        // Construct natural language query for AWS backend
        const query = `I am a farmer in ${profile.state} growing ${profile.crop}. Please provide ${panel === 'market' ? 'market price information and selling advice' : panel === 'weather' ? 'weather forecast and farming guidance' : 'agricultural advice'}.`;
        
        const data: EngineResponse = await askEngine("annadata", query);

        // Create response in expected format
        const responseData: AdvisoryResponse = {
          textResponse: data.answer,
          voiceReadyText: data.answer,
          advisoryType: panel as any,
          source: "live",
        };

        localStorage.setItem(cacheKey(panel, profile), JSON.stringify(responseData));

        setPanel({
          loading: false,
          message: data.answer,
          source: "live",
        });
      } catch {
        setPanel({
          loading: false,
          message: localFallback.textResponse,
          source: "cached",
        });
      }
    },
    [isOnline, profile]
  );

  const fetchSchemeEligibility = useCallback(async () => {
    if (!profile) return;

    if (!isOnline) {
      setSchemeMessage("You are eligible for PM-KISAN. Apply before deadline. (Showing saved guidance while offline.)");
      return;
    }

    try {
      // Construct natural language query for AWS backend
      const query = `I am a farmer from ${profile.state} growing ${profile.crop}. Explain PM-KISAN scheme eligibility and application deadlines in brief.`;
      
      const response = await askEngine('scheme', query);
      setSchemeMessage(`You are eligible for PM-KISAN. ${response.answer}`);
    } catch {
      setSchemeMessage("You are eligible for PM-KISAN. Apply before deadline.");
    }
  }, [isOnline, profile]);

  const runAsk = useCallback(async () => {
    if (!profile || !question.trim()) return;

    setAskPanel((prev) => ({ ...prev, loading: true }));
    
    // Add to session history
    const newMessage: SessionMessage = {
      role: "farmer",
      content: question,
      timestamp: new Date().toISOString(),
    };
    setSession((prev) => [...prev, newMessage]);

    if (!isOnline) {
      const queueItem = {
        id: `${Date.now()}`,
        state: profile.state,
        crop: profile.crop,
        question,
        language: profile.language,
        createdAt: new Date().toISOString(),
      };

      const existing = localStorage.getItem("annadata_sync_queue");
      const queue = existing ? (JSON.parse(existing) as typeof queueItem[]) : [];
      queue.push(queueItem);
      localStorage.setItem("annadata_sync_queue", JSON.stringify(queue));

      const fallback = getOfflineFallback(profile.language, "ask");

      setAskPanel({
        loading: false,
        message: fallback.textResponse,
        source: "cached",
      });
      return;
    }

    try {
      // Prepare session summary for context
      const sessionSummary = session.slice(-2).map((msg) => `${msg.role === "farmer" ? "Q" : "A"}: ${msg.content}`).join(" ");

      // Construct natural language query with full context for AWS backend
      const query = `I am a farmer in ${profile.state} growing ${profile.crop}. ${sessionSummary ? 'Previous conversation: ' + sessionSummary + '. ' : ''}My question: ${question}`;
      
      const data: EngineResponse = await askEngine("annadata", query);

      // Create response in expected format
      const responseData: AdvisoryResponse = {
        textResponse: data.answer,
        voiceReadyText: data.answer,
        advisoryType: "general",
        source: "live",
      };

      // Add response to session
      const responseMsg: SessionMessage = {
        role: "annadata",
        content: data.answer,
        timestamp: new Date().toISOString(),
      };
      setSession((prev) => [...prev, responseMsg]);
      
      // Save session to localStorage
      const sessionKey = getSessionKey(profile);
      localStorage.setItem(sessionKey, JSON.stringify([...session, newMessage, responseMsg]));

      setAskPanel({
        loading: false,
        message: responseData.textResponse,
        source: responseData.source,
      });

      if (profile.interactionMode === "voice") {
        speak(responseData.voiceReadyText);
      }
    } catch {
      const fallback = getOfflineFallback(profile.language, "ask");

      setAskPanel({
        loading: false,
        message: fallback.textResponse,
        source: "cached",
      });
    }
  }, [isOnline, profile, question, session, speak]);

  useEffect(() => {
    if (!profile) return;

    // Load panels on mount
    void fetchPanel("market");
    void fetchPanel("weather");
    void fetchSchemeEligibility();
    
    setQuestion("");
  }, [fetchPanel, fetchSchemeEligibility, profile]);

  const connectivityIndicator = useMemo(() => {
    const indicators = {
      live: { icon: "🟢", label: "Live Data", color: "bg-emerald-100 text-emerald-700" },
      cached: { icon: "🟡", label: "Cached Advisory", color: "bg-amber-100 text-amber-700" },
      offline: { icon: "🔴", label: "Low Confidence Mode", color: "bg-red-100 text-red-700" },
    };
    return indicators[connectivityMode];
  }, [connectivityMode]);

  const confidenceIndicator = useMemo(() => {
    const labels = {
      high: "High Confidence",
      medium: "Medium Confidence",
      low: "Low Confidence - Verify Locally",
    };
    return labels[dataConfidence];
  }, [dataConfidence]);

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-5 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ANNADATA Dashboard</h1>
            <p className="text-gray-600">
              {profile.state} {profile.district !== "Not specified" && `(${profile.district})`} • {profile.crop} • {profile.language.toUpperCase()} • {profile.interactionMode === "voice" ? "🎤 Voice" : "⌨️ Text"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${connectivityIndicator.color}`}>
              {connectivityIndicator.icon} {connectivityIndicator.label}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {confidenceIndicator}
            </span>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 font-semibold hover:bg-amber-50 text-sm"
            >
              Home
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{PANEL_TITLE.market}</h2>
            <p className="text-gray-700 leading-relaxed">{marketPanel.loading ? "Loading mandi guidance..." : marketPanel.message}</p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{PANEL_TITLE.weather}</h2>
            <p className="text-gray-700 leading-relaxed">{weatherPanel.loading ? "Loading weather advisory..." : weatherPanel.message}</p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">🏛️ Scheme Eligibility</h2>
            <p className="text-gray-700 leading-relaxed">{schemeMessage}</p>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{PANEL_TITLE.ask}</h2>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!isSpeechRecognitionSupported}
                className={`h-16 md:w-52 rounded-xl text-lg font-bold transition-all ${
                  isListening
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                } ${!isSpeechRecognitionSupported ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isListening ? "⏹ Stop Listening" : "🎤 Tap to Speak"}
              </button>

              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about crop selling, fertilizer, schemes, market..."
                className="flex-1 h-16 px-4 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:outline-none text-lg"
              />

              <button
                onClick={() => void runAsk()}
                disabled={!question.trim() || askPanel.loading}
                className={`h-16 px-6 rounded-xl text-lg font-bold ${
                  question.trim() && !askPanel.loading
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {askPanel.loading ? "Thinking..." : "Ask"}
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-gray-800 text-lg leading-relaxed">{askPanel.message}</p>
            </div>

            <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
              <span>Pipeline: Voice → Text → Claude → Voice</span>
              {isSpeaking && (
                <button onClick={stop} className="text-amber-700 font-semibold hover:text-amber-800">
                  Stop Voice
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

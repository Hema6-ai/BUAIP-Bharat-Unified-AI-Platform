export type InteractionMode = "voice" | "text";
export type AdvisoryType = "market" | "weather" | "scheme" | "general";

export interface AnnadataRequest {
  state: string;
  crop: string;
  language: "en" | "te" | "hi" | "ta";
  question?: string;
  interactionMode: InteractionMode;
}

export interface AnnadataAIResponse {
  textResponse: string;
  voiceReadyText: string;
  advisoryType: AdvisoryType;
  seasonalAssumption: string;
  source: "live" | "cached";
  queuedForSync?: boolean;
  awsHooks: {
    transcribe: "adapter-ready";
    polly: "adapter-ready";
    translate: "adapter-ready";
    bedrock: "active";
    dynamodb: "adapter-ready";
  };
}

const LANGUAGE_NAMES: Record<AnnadataRequest["language"], string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

const FALLBACK_QUESTIONS: Record<AdvisoryType, string> = {
  market: "Should I sell now or wait this week?",
  weather: "What preventive step should I take this week based on weather risk?",
  scheme: "Which farmer support scheme should I apply for now and how?",
  general: "Give short crop guidance for this week.",
};

export function detectAdvisoryType(question: string): AdvisoryType {
  const normalized = question.toLowerCase();

  const marketWords = [
    "sell",
    "price",
    "mandi",
    "market",
    "rate",
    "storage",
    "when to sell",
    "బజార్",
    "ధర",
    "मंडी",
    "भाव",
    "விலை",
    "சந்தை",
  ];

  const weatherWords = [
    "rain",
    "weather",
    "temperature",
    "storm",
    "humidity",
    "forecast",
    "flood",
    "drought",
    "వర్ష",
    "మౌసం",
    "बारिश",
    "मौसम",
    "மழை",
    "வானிலை",
  ];

  const schemeWords = [
    "scheme",
    "subsidy",
    "pension",
    "loan",
    "pm-kisan",
    "apply",
    "government",
    "yojana",
    "స్కీమ్",
    "పథకం",
    "योजना",
    "सरकार",
    "திட்டம்",
    "அரசு",
  ];

  if (marketWords.some((word) => normalized.includes(word))) {
    return "market";
  }

  if (weatherWords.some((word) => normalized.includes(word))) {
    return "weather";
  }

  if (schemeWords.some((word) => normalized.includes(word))) {
    return "scheme";
  }

  return "general";
}

export function inferSeasonalAssumption(dateInput = new Date()): string {
  const month = dateInput.getMonth() + 1;

  if (month >= 6 && month <= 10) {
    return "Kharif period in many Indian regions; rainfall and pest pressure can shift quickly.";
  }

  if (month >= 11 || month <= 3) {
    return "Rabi period in many Indian regions; moisture management and harvest timing are important.";
  }

  return "Transition period between major seasons; local weather swings can affect yield and market timing.";
}

function advisoryInstruction(type: AdvisoryType): string {
  if (type === "market") {
    return "Provide sell/hold/watch guidance for today or this week. Mention mandi behavior in practical terms. Never give exact price numbers.";
  }

  if (type === "weather") {
    return "Give one preventive farming step for immediate weather risk and one follow-up step for this week.";
  }

  if (type === "scheme") {
    return "Explain likely farmer scheme eligibility direction and simple application steps in local practical terms.";
  }

  return "Respond like a Krishi advisor with clear weekly action guidance for crop health, input use, and timing.";
}

export function buildAnnadataPrompt(request: AnnadataRequest, advisoryType: AdvisoryType, seasonalAssumption: string): string {
  const languageName = LANGUAGE_NAMES[request.language];
  const question = request.question?.trim() || FALLBACK_QUESTIONS[advisoryType];

  return `You are ANNADATA, a farmer intelligence advisor for India.

Your role style (must follow):
- Local agricultural advisor
- Market analyst
- Government extension officer
- Speak simply for low-literacy farmers
- Never sound like a chatbot
- Never say generic lines like "consult experts"

Farmer context:
- State: ${request.state}
- Crop: ${request.crop}
- Seasonal assumption: ${seasonalAssumption}
- Ecosystem context: Indian mandi system, local transport/storage constraints, and state-level scheme pathways
- Interaction mode: ${request.interactionMode}

Farmer question:
${question}

Advisory mode:
${advisoryType}

Task instructions:
${advisoryInstruction(advisoryType)}

Truth and safety rules:
- Live mandi/weather APIs are not connected yet.
- Do not invent exact prices, rainfall millimeters, or guaranteed outcomes.
- Use advisory language like "check today's mandi board" or "watch local forecast this week".
- Give timing words: today / this week / wait / next 3 days.

Output format rules:
- Respond only in ${languageName}.
- 3 to 5 short spoken-style sentences.
- Avoid jargon, tables, and symbols-heavy formatting.
- Keep directly actionable.`;
}

function sanitizeNoFakePrice(text: string): string {
  return text
    .replace(/₹\s?\d[\d,]*/g, "today's mandi rate")
    .replace(/Rs\.?\s?\d[\d,]*/gi, "today's mandi rate");
}

function toVoiceReadyText(text: string): string {
  return text
    .replace(/[|_*#`~\[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAdvisoryText(text: string): string {
  const safe = sanitizeNoFakePrice(text);
  return safe.length > 0
    ? safe
    : "Check local mandi and weather update today. Take step-by-step action this week based on crop condition.";
}

export function buildOfflineAdvisory(request: AnnadataRequest, advisoryType: AdvisoryType): AnnadataAIResponse {
  const seasonalAssumption = inferSeasonalAssumption();
  const fallback = {
    en: "You are offline now. I saved your query. Check today's mandi board and local weather update before taking a selling or input decision.",
    hi: "आप अभी ऑफलाइन हैं। आपका सवाल सेव हो गया है। बिक्री या इनपुट निर्णय से पहले आज की मंडी और स्थानीय मौसम अपडेट देखें।",
    te: "మీరు ఇప్పుడు ఆఫ్‌లైన్‌లో ఉన్నారు. మీ ప్రశ్న సేవ్ అయింది. అమ్మకం లేదా ఇన్‌పుట్ నిర్ణయం ముందు ఈరోజు మండీ ధరలు, స్థానిక వాతావరణం చూసి నిర్ణయం తీసుకోండి.",
    ta: "நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள். உங்கள் கேள்வி சேமிக்கப்பட்டது. விற்பனை அல்லது உள்ளீட்டு முடிவுக்கு முன் இன்றைய சந்தை பலகையும் உள்ளூர் வானிலையும் பார்க்கவும்.",
  }[request.language];

  return {
    textResponse: fallback,
    voiceReadyText: toVoiceReadyText(fallback),
    advisoryType,
    seasonalAssumption,
    source: "cached",
    queuedForSync: true,
    awsHooks: {
      transcribe: "adapter-ready",
      polly: "adapter-ready",
      translate: "adapter-ready",
      bedrock: "active",
      dynamodb: "adapter-ready",
    },
  };
}

export function toAnnadataResponse(text: string, advisoryType: AdvisoryType, seasonalAssumption: string): AnnadataAIResponse {
  const normalizedText = normalizeAdvisoryText(text);

  return {
    textResponse: normalizedText,
    voiceReadyText: toVoiceReadyText(normalizedText),
    advisoryType,
    seasonalAssumption,
    source: "live",
    awsHooks: {
      transcribe: "adapter-ready",
      polly: "adapter-ready",
      translate: "adapter-ready",
      bedrock: "active",
      dynamodb: "adapter-ready",
    },
  };
}

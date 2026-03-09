import { NextRequest, NextResponse } from "next/server";
import { callBedrock } from "@/app/lib/bedrock";
import { getAnnadataSignals, type AnnadataSignals } from "@/app/lib/annadataDataLayer";
import { Polly, SynthesizeSpeechCommand, VoiceId, OutputFormat } from "@aws-sdk/client-polly";
import { logEngineQuery } from "@/app/lib/aws/queryLogger";
import {
  detectAgricultureModule,
  getCropAdvisory,
  getMandiPriceIntelligence,
  getWeatherFarmingAdvice,
  diagnoseCropDisease,
  getSeedsFertilizerGuide,
  getSoilHealthAdvice,
  getIrrigationPlan,
  getLoanInsuranceInfo,
  getSmartSellingAdvice,
  buildModuleSystemPrompt,
  type ExtendedAdvisoryType,
  type AgricultureModuleRequest
} from "@/app/lib/agricultureModules";

type SupportedLanguage = "en" | "te" | "hi" | "ta";
type AdvisoryType = "market" | "weather" | "scheme" | "general";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

// AWS Polly voice IDs for Indian languages
const POLLY_VOICE_IDS: Record<SupportedLanguage, VoiceId> = {
  en: VoiceId.Aria,
  hi: VoiceId.Aditi,
  te: VoiceId.Aditi, // Polly Aditi voice supports multiple Indian languages
  ta: VoiceId.Aditi, // Polly Aditi voice supports multiple Indian languages
};

// AWS Polly language codes (use available codes)
const POLLY_LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  en: "en-US",
  hi: "hi-IN",
  te: "hi-IN", // Telugu uses Hindi placeholder (Aditi supports it)
  ta: "hi-IN", // Tamil uses Hindi placeholder (Aditi supports it)
};

// Initialize AWS Polly client
const pollyClient = new Polly({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.BEDROCK_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.BEDROCK_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

function isValidLanguage(language: string): language is SupportedLanguage {
  return ["en", "te", "hi", "ta"].includes(language);
}

function detectAdvisoryType(question: string, panel?: string): AdvisoryType {
  // Panel override
  if (panel === "market") return "market";
  if (panel === "weather") return "weather";
  if (panel === "scheme") return "scheme";

  // Lightweight intent detection
  const normalized = question.toLowerCase();

  const marketWords = ["sell", "price", "mandi", "market", "rate", "storage", "when to sell"];
  const weatherWords = ["rain", "weather", "temperature", "storm", "humidity", "forecast", "flood", "drought"];
  const schemeWords = ["scheme", "subsidy", "pension", "loan", "pm-kisan", "apply", "government", "yojana"];

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

function getSeasonalContext(): string {
  const month = new Date().getMonth() + 1;

  if (month >= 6 && month <= 10) {
    return "Kharif period in many Indian regions; rainfall and pest pressure can shift quickly.";
  }

  if (month >= 11 || month <= 3) {
    return "Rabi period in many Indian regions; moisture management and harvest timing are important.";
  }

  return "Transition period between major seasons; local weather swings can affect yield and market timing.";
}

function buildAnnadataPrompt(
  state: string,
  crop: string,
  question: string,
  advisoryType: AdvisoryType,
  language: SupportedLanguage,
  marketContext: AnnadataSignals,
  sessionContext?: string
): string {
  const languageName = LANGUAGE_NAMES[language];
  const seasonalContext = getSeasonalContext();

  let advisoryInstruction = "";

  if (advisoryType === "market") {
    advisoryInstruction = `Based on real market signals, provide sell/hold/watch guidance. REAL DATA: Price trend is ${marketContext.mandiPriceTrend}, today's indicative rate ${marketContext.todayPrice}. If price rising, suggest waiting. If falling, suggest selling soon. If stable, base on storage capacity.`;
  } else if (advisoryType === "weather") {
    advisoryInstruction = `Based on weather forecast, give preventive farming steps. REAL DATA: ${marketContext.weatherSummary}. Rainfall risk is ${marketContext.rainfallRisk}. If high risk, suggest harvest protection or delay field work.`;
  } else if (advisoryType === "scheme") {
    advisoryInstruction = "IMPORTANT: This question is about government scheme eligibility. You MUST respond with: 'For government scheme eligibility and applications, please use the BUAIP Scheme Eligibility Engine. I am ANNADATA - I provide farming advice on crops, prices, weather, and market strategy only. Would you like farming advice instead?'";
  } else {
    advisoryInstruction = `Combine market and weather intelligence. REAL DATA: Price ${marketContext.mandiPriceTrend}, Weather risk ${marketContext.rainfallRisk}. Give integrated weekly action guidance.`;
  }

  const dataConfidenceNote =
    marketContext.dataConfidence === "low"
      ? "NOTE: Live data unavailable. Speak cautiously and recommend checking local sources."
      : marketContext.dataConfidence === "medium"
      ? "NOTE: Using cached data. Mention checking latest local updates."
      : "NOTE: Live data available. Speak with confidence but still suggest verifying with local mandi.";

  // Session context for conversational memory
  const sessionNote = sessionContext
    ? `\n\nContext from earlier in this session:\n${sessionContext}\n\nBuild on previous advice if needed. Be consistent with earlier guidance.`
    : "";

  return `You are ANNADATA, a farmer decision intelligence system for India.

╔═══════════════════════════════════════════════════════════════════╗
║  IMPORTANT: YOU ARE KISAN AI - AGRICULTURE ADVISOR               ║
║  YOU DO NOT HANDLE GOVERNMENT SCHEME ELIGIBILITY                 ║
║                                                                   ║
║  If user asks about schemes, subsidies, government benefits:     ║
║  → Redirect to "BUAIP Scheme Eligibility Engine"                 ║
║                                                                   ║
║  Your domain: Farming advice ONLY                                ║
║  - Crop selection & timing                                        ║
║  - Mandi prices & selling strategy                                ║
║  - Weather & irrigation planning                                  ║
║  - Seeds, fertilizers, pest control                               ║
║  - Market strategy                                                ║
╚═══════════════════════════════════════════════════════════════════╝

Your role style (must follow):
- Local agricultural advisor analyzing REAL market signals
- Market analyst interpreting LIVE price trends
- Farming expert providing practical field advice
- Speak simply for low-literacy farmers
- Never sound like a chatbot
- Never say generic lines like "consult experts"
- NEVER determine scheme eligibility (redirect to Scheme Engine)

Farmer context:
- State: ${state}
- Crop: ${crop}
- Seasonal assumption: ${seasonalContext}
- Ecosystem context: Indian mandi system, local transport/storage constraints

REAL-TIME MARKET INTELLIGENCE (base your advice on this):
- Price Trend: ${marketContext.mandiPriceTrend}
- Today's Indicative Price: ${marketContext.todayPrice}
- Weekly Average: ${marketContext.weeklyAverage}
- Weather Summary: ${marketContext.weatherSummary}
- Rainfall Risk: ${marketContext.rainfallRisk}
- Base Advisory Signal: ${marketContext.advisorySignal}
- Data Confidence: ${marketContext.dataConfidence}

${dataConfidenceNote}

Farmer question:
${question}

Advisory mode: ${advisoryType}

Task instructions:
${advisoryInstruction}${sessionNote}

Decision intelligence rules:
- If price rising → suggest waiting 2-3 days
- If price falling → suggest selling today/tomorrow if storage costs high
- If price stable → base on farmer's storage capacity
- If rain forecast → suggest harvest protection or delay operations
- If data confidence low → speak cautiously, recommend local verification
- Always give timing: today / this week / wait / next 2-3 days
- You may MENTION schemes (e.g., "PM-KISAN gives ₹6000/year") in context of farming decisions
- But NEVER determine user eligibility or say "you qualify" or "apply here"

Output format rules:
- Respond ONLY and ENTIRELY in ${languageName}.
- Do NOT mix languages under any circumstances.
- Do NOT use English unless ${language} is English.
- 3 to 5 short spoken-style sentences.
- Reference the real data you've been given (price trend, weather risk).
- Avoid jargon, tables, and symbols-heavy formatting.
- Keep directly actionable with specific timing.

STRICT MULTILINGUAL ENFORCEMENT:
The user interface language is ${languageName}.
You MUST respond ENTIRELY in ${languageName}.
Regardless of the language the farmer used in their question, respond in ${languageName}.
This is not a translation service - ${languageName} is the primary language for all responses.`;
  }

  function sanitizeResponse(text: string): string {
  // Remove fake prices
  const noPrices = text
    .replace(/₹\s?\d[\d,]*/g, "today's mandi rate")
    .replace(/Rs\.?\s?\d[\d,]*/gi, "today's mandi rate");

  return noPrices.trim() || "Check local mandi and weather update today. Take step-by-step action this week based on crop condition.";
}

function toVoiceReadyText(text: string): string {
  let voiceText = text;

  // Remove special markdown/symbols
  voiceText = voiceText.replace(/[|_*#`~\[\]{}<>₹€$]/g, " ");

  // Convert percentage patterns to words (avoid reading "%" aloud)
  voiceText = voiceText.replace(/(\d+(?:\.\d+)?)\s*%/g, (match, num) => {
    return `${num} percent`;
  });

  // Convert currency symbols (₹2100 → "the rate")
  voiceText = voiceText.replace(/₹\s?(\d+[\d,]*)/g, "today's rate ");
  voiceText = voiceText.replace(/Rs\.?\s?(\d+[\d,]*)/g, "today's rate ");

  // Convert common abbreviations to words
  voiceText = voiceText.replace(/\bPM-KISAN\b/gi, "PM Kisan");
  voiceText = voiceText.replace(/\bNPK\b/gi, "N P K");
  voiceText = voiceText.replace(/\bLOI\b/gi, "LOI");

  // Normalize multiple spaces
  voiceText = voiceText.replace(/\s+/g, " ").trim();

  // Fallback if completely empty
  return voiceText || "Check local mandi and weather before making farming decisions";
}

function buildReasoning(marketContext: AnnadataSignals, advisoryType: AdvisoryType) {
  const weatherImpactMap = {
    high: "rain-risk",
    medium: "monitor-weather",
    low: "safe-window",
    unknown: "weather-uncertain",
  } as const;

  return {
    priceTrend: marketContext.mandiPriceTrend as "rising" | "falling" | "stable" | "unknown",
    weatherImpact: weatherImpactMap[marketContext.rainfallRisk as keyof typeof weatherImpactMap] || "weather-uncertain",
    dataConfidence: marketContext.dataConfidence,
    sourceMode: marketContext.connectivityMode as "live" | "cached" | "offline",
    advisoryMode: advisoryType,
  };
}

function getAwsMapping() {
  const awsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  
  return {
    ai: "Amazon Bedrock (Claude 3) - Active",
    speechToText: "Amazon Transcribe - Ready",
    textToSpeech: awsConfigured ? "Amazon Polly - Active" : "Amazon Polly - Configured, awaiting credentials",
    offlineSync: awsConfigured ? "Amazon S3 + CloudFront - Active" : "Amazon S3 - Configured, awaiting credentials",
    compute: "AWS Lambda - Ready for deployment",
    storage: "Amazon DynamoDB - Ready for farmer profile persistence",
    monitoring: "Amazon CloudWatch - Ready for analytics",
  };
}

function getOfflineFallback(language: SupportedLanguage): string {
  const fallbacks = {
    en: "You are offline now. I saved your query. Check today's mandi board and local weather update before taking a selling or input decision.",
    hi: "आप अभी ऑफलाइन हैं। आपका सवाल सेव हो गया है। बिक्री या इनपुट निर्णय से पहले आज की मंडी और स्थानीय मौसम अपडेट देखें।",
    te: "మీరు ఇప్పుడు ఆఫ్‌లైన్‌లో ఉన్నారు. మీ ప్రశ్న సేవ్ అయింది. అమ్మకం లేదా ఇన్‌పుట్ నిర్ణయం ముందు ఈరోజు మండీ ధరలు, స్థానిక వాతావరణం చూసి నిర్ణయం తీసుకోండి.",
    ta: "நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள். உங்கள் கேள்வி சேமிக்கப்பட்டது. விற்பனை அல்லது உள்ளீட்டு முடிவுக்கு முன் இன்றைய சந்தை பலகையும் உள்ளூர் வானிலையும் பார்க்கவும்.",
  };

  return fallbacks[language];
}

async function synthesizeVoiceWithPolly(
  text: string,
  language: SupportedLanguage
): Promise<string | null> {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.log("AWS Polly not configured, skipping voice synthesis");
      return null;
    }

    // Use Polly to synthesize speech
    const voiceId = POLLY_VOICE_IDS[language];
    const languageCode = POLLY_LANGUAGE_CODES[language];
    
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceId,
      Engine: "neural", // Premium neural voices (if available for language)
      LanguageCode: languageCode as any, // Cast to any due to AWS SDK limitations
    });

    const response = await pollyClient.send(command);

    // Convert audio stream to base64 for client transmission
    if (response.AudioStream) {
      // AWS SDK v3 returns a stream that can be converted using .buffer() or by collecting chunks
      const buffer = await response.AudioStream.transformToByteArray();
      const base64Audio = Buffer.from(buffer).toString("base64");
      return `data:audio/mp3;base64,${base64Audio}`;
    }
  } catch (error) {
    console.error("Polly voice synthesis failed:", error);
    // Gracefully fall back to client-side speech synthesis
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const state = String(body.state || "India");
    const crop = String(body.crop || "Mixed Crop");
    const language: SupportedLanguage = isValidLanguage(String(body.language)) ? body.language : "en";
    const question = body.question?.trim() || "Give me crop guidance for this week.";
    const panel = body.panel;

    // ========================================================================
    // NEW: AGRICULTURE INTELLIGENCE MODULES (A1-A9)
    // Detect if this is a request for specific farming module
    // ========================================================================
    const detectedModule = detectAgricultureModule(question);
    
    if (['crop_advisor', 'mandi_price', 'weather_advisor', 'disease_doctor', 'seeds_fertilizer', 
         'soil_health', 'irrigation_planner', 'loan_insurance', 'smart_selling'].includes(detectedModule)) {
      
      const moduleRequest: AgricultureModuleRequest = {
        module: detectedModule as ExtendedAdvisoryType,
        state,
        district: body.district,
        crop,
        landSize: body.landSize,
        soilType: body.soilType,
        waterAvailability: body.waterAvailability,
        currentSeason: body.currentSeason,
        growthStage: body.growthStage,
        symptoms: body.symptoms,
        imageS3Uri: body.imageS3Uri,
        budget: body.budget,
        cropHistory: body.cropHistory,
        soilColor: body.soilColor,
        harvestDate: body.harvestDate,
        language
      };
      
      let moduleData: any = null;
      let modulePrompt = '';
      
      try {
        // Execute specific module
        switch (detectedModule) {
          case 'crop_advisor':
            moduleData = await getCropAdvisory(moduleRequest);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nData fetched:\n${JSON.stringify(moduleData, null, 2)}\n\nBased on this data, provide comprehensive crop recommendations in ${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'Tamil'}.`;
            break;
            
          case 'mandi_price':
            moduleData = await getMandiPriceIntelligence(crop, body.district || 'main district', state);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nCurrent mandi data:\n${JSON.stringify(moduleData, null, 2)}\n\nAnalyze this price data and give selling recommendation.`;
            break;
            
          case 'weather_advisor':
            moduleData = await getWeatherFarmingAdvice(state, body.district || '', crop);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nWeather forecast data:\n${JSON.stringify(moduleData, null, 2)}\n\nProvide actionable farming advice based on this weather.`;
            break;
            
          case 'disease_doctor':
            moduleData = await diagnoseCropDisease(crop, body.symptoms || question, body.imageS3Uri);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nDisease analysis:\n${JSON.stringify(moduleData, null, 2)}\n\nProvide detailed treatment plan.`;
            break;
            
          case 'seeds_fertilizer':
            moduleData = await getSeedsFertilizerGuide(crop, state, body.budget || 10000);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nSeeds & Fertilizer guide:\n${JSON.stringify(moduleData, null, 2)}\n\nExplain this schedule in farmer-friendly language.`;
            break;
            
          case 'soil_health':
            moduleData = await getSoilHealthAdvice(body.soilColor || 'brown', body.cropHistory || [], state);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nSoil health report:\n${JSON.stringify(moduleData, null, 2)}\n\nProvide soil improvement recommendations.`;
            break;
            
          case 'irrigation_planner':
            moduleData = await getIrrigationPlan(crop, body.growthStage || 'vegetative', 'current weather');
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nIrrigation plan:\n${JSON.stringify(moduleData, null, 2)}\n\nExplain this irrigation schedule clearly.`;
            break;
            
          case 'loan_insurance':
            moduleData = await getLoanInsuranceInfo(body.landSize || 2, 50000, state);
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nLoan & Insurance info:\n${JSON.stringify(moduleData, null, 2)}\n\nGuide farmer on how to apply step-by-step.`;
            break;
            
          case 'smart_selling':
            const marketContext = await getAnnadataSignals(crop, state);
            moduleData = await getSmartSellingAdvice(
              crop, 
              body.harvestDate || 'recent', 
              marketContext.todayPrice || 2000,
              1950,
              40
            );
            modulePrompt = buildModuleSystemPrompt(detectedModule, moduleRequest) + 
              `\n\nSelling analysis:\n${JSON.stringify(moduleData, null, 2)}\n\nProvide clear sell/wait/store recommendation.`;
            break;
        }
        
        // Generate AI response based on module data
        const moduleResponse = await callBedrock(modulePrompt, {
          temperature: 0.3,
          maxTokens: 800
        });
        
        const textResponse = sanitizeResponse(moduleResponse);
        const voiceReadyText = toVoiceReadyText(textResponse);
        const audioBase64 = await synthesizeVoiceWithPolly(voiceReadyText, language);
        
        const userId = body.userId || "anonymous";
        const responseData = {
          textResponse,
          voiceReadyText,
          audioBase64,
          advisoryType: detectedModule,
          moduleData, // Include raw module data
          source: "live",
          connectivityMode: "live",
          reasoning: `Generated using ${detectedModule} intelligence module`,
          awsMapping: getAwsMapping()
        };
        
        await logEngineQuery("ANNADATA", userId, question, JSON.stringify(responseData));
        
        return NextResponse.json(responseData);
        
      } catch (moduleError) {
        console.error(`Module ${detectedModule} error:`, moduleError);
        // Fall through to existing advisory logic if module fails
      }
    }
    
    // ========================================================================
    // EXISTING ADVISORY LOGIC (PRESERVED - NO CHANGES)
    // Handles: market, weather, scheme, general advice
    // ========================================================================

    // Offline mode support
    if (body.offline === true) {
      return NextResponse.json({
        textResponse: getOfflineFallback(language),
        voiceReadyText: toVoiceReadyText(getOfflineFallback(language)),
        advisoryType: "general",
        source: "cached",
      });
    }

    // Detect advisory type
    const advisoryType = detectAdvisoryType(question, panel);

    // Fetch real-time market and weather signals
    const marketContext = await getAnnadataSignals(crop, state);

    // Build prompt with real data context and session history
    const prompt = buildAnnadataPrompt(state, crop, question, advisoryType, language, marketContext, body.sessionContext);

    // Call Bedrock Claude with real-time intelligence
    const response = await callBedrock(prompt, {
      temperature: 0.2,
      maxTokens: 500,
    });

    // Sanitize and format response
    const textResponse = sanitizeResponse(response);
    const voiceReadyText = toVoiceReadyText(textResponse);
    const reasoning = buildReasoning(marketContext, advisoryType);
    const awsMapping = getAwsMapping();

    // Synthesize voice using AWS Polly (if configured)
    const audioBase64 = await synthesizeVoiceWithPolly(voiceReadyText, language);

    // Extract userId for logging
    const userId = body.userId || "anonymous";

    // Prepare response data
    const responseData = {
      textResponse,
      voiceReadyText,
      audioBase64, // MP3 audio data (if Polly enabled)
      advisoryType,
      source: "live",
      connectivityMode: marketContext.connectivityMode,
      reasoning,
      awsMapping,
    };

    // Log the query to DynamoDB
    await logEngineQuery(
      "ANNADATA",
      userId,
      question,
      JSON.stringify(responseData)
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("ANNADATA route error:", error);

    return NextResponse.json(
      {
        error: "Unable to fetch ANNADATA guidance",
        fallback: true,
      },
      { status: 500 }
    );
  }
}

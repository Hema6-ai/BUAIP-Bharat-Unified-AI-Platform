/**
 * AGRICULTURE INTELLIGENCE MODULES (A1-A9)
 * Complete Farming Decision AI - Extension to ANNADATA Engine
 * 
 * CRITICAL: This file EXTENDS existing scheme eligibility logic.
 * It does NOT replace or modify existing functionality.
 * 
 * New Modules:
 * A1 - Crop Advisor
 * A2 - Mandi Price Intelligence  
 * A3 - Weather Farming Advisor
 * A4 - Crop Disease Doctor
 * A5 - Seeds & Fertilizer Guide
 * A6 - Soil Health Advisor
 * A7 - Irrigation Planner
 * A8 - Loan & Insurance Guide
 * A9 - Smart Selling Advisor
 */

import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { S3Client } from '@aws-sdk/client-s3';

// ============================================================================
// EXTENDED TYPES
// ============================================================================

export type ExtendedAdvisoryType = 
  | "market" 
  | "weather" 
  | "scheme" 
  | "general"
  | "crop_advisor"           // A1
  | "mandi_price"            // A2
  | "weather_advisor"        // A3
  | "disease_doctor"         // A4
  | "seeds_fertilizer"       // A5
  | "soil_health"            // A6
  | "irrigation_planner"     // A7
  | "loan_insurance"         // A8
  | "smart_selling";         // A9

export interface CropRecommendation {
  cropName: string;
  expectedYield: string;        // quintals per acre
  expectedIncome: string;       // ₹ per acre
  waterRequirement: string;
  seedVarieties: string[];
  sowingWindow: string;
  harvestTime: string;
  riskFactors: string[];
}

export interface MandiPriceInfo {
  cropName: string;
  todayPrice: string;
  mspPrice: string;
  nearestMandis: string[];
  priceTrend: 'rising' | 'falling' | 'stable';
  bestMandiToSell: string;
  lastUpdated: string;
}

export interface WeatherAdvice {
  sevenDayForecast: string;
  irrigationAdvice: string;
  pestRiskWarning: string;
  harvestTimingAdvice: string;
  actionableSteps: string[];
}

export interface DiseaseAnalysis {
  diseaseName: string;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  treatmentSteps: string[];
  pesticideRecommendation: string[];
  preventionTips: string[];
  confidence: number;
}

export interface SeedsFertilizerGuide {
  crop: string;
  bestSeedVarieties: string[];
  fertilizerSchedule: {
    stage: string;
    fertilizer: string;
    quantity: string;
    timing: string;
  }[];
  micronutrients: string[];
  costEstimate: string;
}

export interface SoilHealthReport {
  soilType: string;
  nutrientDeficiencies: string[];
  recommendedFertilizers: string[];
  organicImprovements: string[];
  phLevel: string;
  recommendations: string[];
}

export interface IrrigationPlan {
  crop: string;
  growthStage: string;
  irrigationSchedule: {
    day: string;
    waterAmount: string;
    method: string;
  }[];
  totalWaterRequirement: string;
  dripIrrigationRecommendation: string;
}

export interface LoanInsuranceInfo {
  kisanCreditCard: {
    eligible: boolean;
    loanAmount: string;
    interestRate: string;
    howToApply: string[];
  };
  pmFasalBima: {
    coverage: string;
    premium: string;
    claimProcess: string[];
  };
}

export interface SmartSellingAdvice {
  crop: string;
  harvestDate: string;
  recommendation: 'sell_now' | 'wait' | 'store';
  reasoning: string[];
  storageOptions: string[];
  transportCostEstimate: string;
  netProfitEstimate: string;
}

export interface AgricultureModuleRequest {
  module: ExtendedAdvisoryType;
  state: string;
  district?: string;
  crop?: string;
  landSize?: number;
  soilType?: string;
  waterAvailability?: 'abundant' | 'moderate' | 'scarce';
  currentSeason?: 'kharif' | 'rabi' | 'zaid';
  growthStage?: 'sowing' | 'vegetative' | 'flowering' | 'harvest';
  symptoms?: string;
  imageS3Uri?: string;
  budget?: number;
  cropHistory?: string[];
  soilColor?: string;
  harvestDate?: string;
  language?: 'en' | 'hi' | 'te' | 'ta';
}

// ============================================================================
// AWS CLIENT INITIALIZATION
// ============================================================================

const REGION = process.env.AWS_REGION || 'ap-south-1';

const rekognitionClient = new RekognitionClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// ============================================================================
// MODULE DETECTION - EXTENDED
// ============================================================================

export function detectAgricultureModule(question: string): ExtendedAdvisoryType {
  const normalized = question.toLowerCase();

  // A1: Crop Advisor
  const cropAdvisorWords = [
    'which crop', 'best crop', 'crop suggestion', 'what to grow', 'crop planning',
    'suitable crop', 'profitable crop', 'फसल चुनें', 'कौन सी फसल', '농작물 추천'
  ];

  // A2: Mandi Price Intelligence  
  const mandiPriceWords = [
    'mandi price', 'today price', 'market rate', 'msp price', 'selling price',
    'nearest mandi', 'price trend', 'मंडी भाव', 'ధర', 'விலை'
  ];

  // A3: Weather Farming Advisor
  const weatherAdvisorWords = [
    'weather forecast', 'rain prediction', 'irrigation advice', 'when to harvest',
    'pest risk', '7 day forecast', 'मौसम', 'వాతావరణం', 'வானிலை'
  ];

  // A4: Crop Disease Doctor
  const diseaseDoctorWords = [
    'disease', 'pest', 'crop damage', 'leaf spot', 'fungus', 'insect attack',
    'plant doctor', 'बीमारी', 'రోగం', 'நோய்', 'yellowing', 'wilting'
  ];

  // A5: Seeds & Fertilizer Guide
  const seedsFertilizerWords = [
    'seed', 'fertilizer', 'urea', 'dap', 'npk', 'manure', 'compost',
    'fertilizer schedule', 'बीज', 'खाद', 'విత్తనం', 'உரம்'
  ];

  // A6: Soil Health Advisor
  const soilHealthWords = [
    'soil test', 'soil health', 'soil type', 'nutrient', 'ph level', 'soil card',
    'soil improvement', 'मिट्टी', 'నేల', 'மண்', 'organic matter'
  ];

  // A7: Irrigation Planner
  const irrigationWords = [
    'irrigation', 'water', 'drip', 'sprinkler', 'watering schedule',
    'water requirement', 'सिंचाई', 'నీటిపారుదల', 'நீர்ப்பாசனம்'
  ];

  // A8: Loan & Insurance Guide
  const loanInsuranceWords = [
    'loan', 'kisan credit card', 'kcc', 'fasal bima', 'insurance', 'credit',
    'bank loan', 'ऋण', 'రుణం', 'கடன்', 'pm-kisan samman'
  ];

  // A9: Smart Selling Advisor
  const smartSellingWords = [
    'when to sell', 'sell or wait', 'storage', 'transport cost', 'profit',
    'best time to sell', 'कब बेचें', 'ఎప్పుడు అమ్మాలి', 'எப்போது விற்க'
  ];

  // Check for specific modules (order matters - most specific first)
  if (diseaseDoctorWords.some(word => normalized.includes(word))) {
    return 'disease_doctor';
  }

  if (cropAdvisorWords.some(word => normalized.includes(word))) {
    return 'crop_advisor';
  }

  if (mandiPriceWords.some(word => normalized.includes(word))) {
    return 'mandi_price';
  }

  if (weatherAdvisorWords.some(word => normalized.includes(word))) {
    return 'weather_advisor';
  }

  if (seedsFertilizerWords.some(word => normalized.includes(word))) {
    return 'seeds_fertilizer';
  }

  if (soilHealthWords.some(word => normalized.includes(word))) {
    return 'soil_health';
  }

  if (irrigationWords.some(word => normalized.includes(word))) {
    return 'irrigation_planner';
  }

  if (loanInsuranceWords.some(word => normalized.includes(word))) {
    return 'loan_insurance';
  }

  if (smartSellingWords.some(word => normalized.includes(word))) {
    return 'smart_selling';
  }

  // Fallback to existing types
  const schemeWords = ['scheme', 'subsidy', 'yojana', 'government benefit'];
  if (schemeWords.some(word => normalized.includes(word))) {
    return 'scheme';
  }

  const weatherWords = ['rain', 'weather', 'temperature', 'storm'];
  if (weatherWords.some(word => normalized.includes(word))) {
    return 'weather';
  }

  const marketWords = ['sell', 'price', 'mandi', 'market'];
  if (marketWords.some(word => normalized.includes(word))) {
    return 'market';
  }

  return 'general';
}

// ============================================================================
// A1: CROP ADVISOR
// ============================================================================

export async function getCropAdvisory(request: AgricultureModuleRequest): Promise<{ recommendations: CropRecommendation[]; reasoning: string }> {
  const { state, district, landSize, soilType, waterAvailability, currentSeason } = request;

  // Example crop database (in production, this would query a real database)
  const cropDatabase: Record<string, CropRecommendation[]> = {
    'punjab': [
      {
        cropName: 'Basmati Rice',
        expectedYield: '25-30 quintals per acre',
        expectedIncome: '₹60,000-80,000 per acre',
        waterRequirement: 'High (1200-1500mm)',
        seedVarieties: ['Pusa Basmati 1121', 'Pusa 1509', 'Super Basmati'],
        sowingWindow: 'June-July (Kharif)',
        harvestTime: 'October-November',
        riskFactors: ['High water requirement', 'Pest attack (stem borer)', 'Price fluctuation']
      },
      {
        cropName: 'Wheat',
        expectedYield: '18-22 quintals per acre',
        expectedIncome: '₹35,000-45,000 per acre',
        waterRequirement: 'Moderate (450-650mm)',
        seedVarieties: ['PBW 343', 'HD 2967', 'WH 1105'],
        sowingWindow: 'November-December (Rabi)',
        harvestTime: 'April-May',
        riskFactors: ['Late sowing risk', 'Rust disease', 'Heat stress at maturity']
      },
      {
        cropName: 'Cotton',
        expectedYield: '12-15 quintals per acre',
        expectedIncome: '₹55,000-70,000 per acre',
        waterRequirement: 'Moderate (600-800mm)',
        seedVarieties: ['RCH 314', 'MRC 7361', 'Ankur 651'],
        sowingWindow: 'April-May (Zaid)',
        harvestTime: 'October-December',
        riskFactors: ['Bollworm attack', 'Whitefly infestation', 'Input cost high']
      }
    ],
    'maharashtra': [
      {
        cropName: 'Sugarcane',
        expectedYield: '400-500 quintals per acre',
        expectedIncome: '₹1,20,000-1,50,000 per acre',
        waterRequirement: 'Very High (1500-2500mm)',
        seedVarieties: ['Co 86032', 'CoM 0265', 'Co 7717'],
        sowingWindow: 'October-February',
        harvestTime: '12-18 months after planting',
        riskFactors: ['High water and fertilizer cost', 'Long duration', 'Payment delays from mills']
      },
      {
        cropName: 'Soybean',
        expectedYield: '10-12 quintals per acre',
        expectedIncome: '₹30,000-40,000 per acre',
        waterRequirement: 'Moderate (450-700mm)',
        seedVarieties: ['JS 95-60', 'MAUS 71', 'Phule Agrani'],
        sowingWindow: 'June-July (Kharif)',
        harvestTime: 'September-October',
        riskFactors: ['Yellow mosaic virus', 'Caterpillar attack', 'Price volatility']
      }
    ],
    'default': [
      {
        cropName: 'Rice',
        expectedYield: '20-25 quintals per acre',
        expectedIncome: '₹40,000-55,000 per acre',
        waterRequirement: 'High (1000-1200mm)',
        seedVarieties: ['IR 64', 'Swarna', 'Samba Mahsuri'],
        sowingWindow: 'June-July (Kharif)',
        harvestTime: 'October-November',
        riskFactors: ['Water scarcity', 'Blast disease', 'Market price fluctuation']
      },
      {
        cropName: 'Wheat',
        expectedYield: '18-20 quintals per acre',
        expectedIncome: '₹32,000-42,000 per acre',
        waterRequirement: 'Moderate (450-650mm)',
        seedVarieties: ['HD 2967', 'Lok 1', 'DBW 187'],
        sowingWindow: 'November-December (Rabi)',
        harvestTime: 'April-May',
        riskFactors: ['Late sowing reduces yield', 'Terminal heat stress', 'Rust disease']
      },
      {
        cropName: 'Maize',
        expectedYield: '20-24 quintals per acre',
        expectedIncome: '₹28,000-38,000 per acre',
        waterRequirement: 'Moderate (500-800mm)',
        seedVarieties: ['DHM 117', 'PMH 1', 'Bio 9681'],
        sowingWindow: 'June-July (Kharif) or Feb-March (Rabi)',
        harvestTime: '90-110 days',
        riskFactors: ['Fall armyworm', 'Stem borer', 'Post-harvest losses']
      }
    ]
  };

  const stateKey = state.toLowerCase().replace(/\s+/g, '');
  const recommendations = cropDatabase[stateKey] || cropDatabase['default'];

  // Filter based on water availability
  let filteredRecs = recommendations;
  if (waterAvailability === 'scarce') {
    filteredRecs = recommendations.filter(crop => 
      !crop.waterRequirement.includes('High') && !crop.waterRequirement.includes('Very High')
    );
  }

  // Filter by season if specified
  if (currentSeason) {
    const seasonMap: Record<string, string> = {
      'kharif': 'June-July',
      'rabi': 'November-December',
      'zaid': 'March-April'
    };
    const targetSowing = seasonMap[currentSeason];
    if (targetSowing) {
      filteredRecs = filteredRecs.filter(crop => crop.sowingWindow.includes(targetSowing.split('-')[0]));
    }
  }

  const reasoning = `Based on ${state} ${district ? `(${district})` : ''} conditions, ${soilType || 'general soil type'}, ${waterAvailability || 'moderate'} water availability, and ${landSize || '1-5'} acre land size, these crops are recommended for maximum profitability and sustainability.`;

  return {
    recommendations: filteredRecs.slice(0, 5),
    reasoning
  };
}

// ============================================================================
// A2: MANDI PRICE INTELLIGENCE
// ============================================================================

export async function getMandiPriceIntelligence(crop: string, district: string, state: string): Promise<MandiPriceInfo> {
  // In production, this would call Agmarknet API or live mandi price API
  const mockMandiPrices: Record<string, MandiPriceInfo> = {
    'rice_punjab': {
      cropName: 'Rice (Paddy)',
      todayPrice: '₹2,050-2,150 per quintal',
      mspPrice: '₹2,060 per quintal (Kharif 2025-26)',
      nearestMandis: ['Amritsar Mandi', 'Ludhiana Mandi', 'Patiala Mandi'],
      priceTrend: 'stable',
      bestMandiToSell: 'Ludhiana Mandi (highest arrivals, better price discovery)',
      lastUpdated: new Date().toISOString()
    },
    'wheat_punjab': {
      cropName: 'Wheat',
      todayPrice: '₹2,125-2,225 per quintal',
      mspPrice: '₹2,125 per quintal (Rabi 2025-26)',
      nearestMandis: ['Amritsar Mandi', 'Bathinda Mandi', 'Sangrur Mandi'],
      priceTrend: 'rising',
      bestMandiToSell: 'Amritsar Mandi (5-8% above MSP rates)',
      lastUpdated: new Date().toISOString()
    },
    'default': {
      cropName: crop,
      todayPrice: 'Check local mandi board for today\'s rate',
      mspPrice: 'MSP: Check official govt announcement',
      nearestMandis: ['District main mandi', 'Sub-division mandi'],
      priceTrend: 'stable',
      bestMandiToSell: 'Visit nearest APMC mandi',
      lastUpdated: new Date().toISOString()
    }
  };

  const key = `${crop.toLowerCase()}_${state.toLowerCase()}`;
  return mockMandiPrices[key] || mockMandiPrices['default'];
}

// ============================================================================
// A3: WEATHER FARMING ADVISOR
// ============================================================================

export async function getWeatherFarmingAdvice(state: string, district: string, crop: string): Promise<WeatherAdvice> {
  // In production, this would call OpenWeather API or IMD API
  const mockWeatherAdvice: WeatherAdvice = {
    sevenDayForecast: 'Next 7 days: Light to moderate rainfall (15-30mm) expected on Day 3-4. Temperature 24-32°C. Humidity 65-80%. Winds 15-25 km/h.',
    irrigationAdvice: 'Postpone irrigation for next 3 days due to expected rainfall. Resume light irrigation on Day 5 if soil moisture below 60%. Avoid waterlogging in low-lying areas.',
    pestRiskWarning: 'MEDIUM RISK: High humidity (>75%) after rainfall may trigger fungal diseases (leaf blight, stem rot). Apply protective fungicide spray 24 hours before rain.',
    harvestTimingAdvice: 'If crop is near maturity (90%+ grain filling), harvest within 2 days before expected rain. Wet harvest reduces grain quality and market price by 10-15%.',
    actionableSteps: [
      'Day 1-2: Complete any pending pesticide/fungicide sprays',
      'Day 3-4: Ensure proper drainage channels are clear',
      'Day 5: Check soil moisture, resume irrigation if needed',
      'Day 6-7: Scout for pest/disease symptoms after rain'
    ]
  };

  return mockWeatherAdvice;
}

// ============================================================================
// A4: CROP DISEASE DOCTOR (with AWS Rekognition)
// ============================================================================

export async function diagnoseCropDisease(
  crop: string, 
  symptoms: string, 
  imageS3Uri?: string
): Promise<DiseaseAnalysis> {
  let imageLabels: string[] = [];
  
  // If image provided, use AWS Rekognition
  if (imageS3Uri) {
    try {
      const s3Parts = imageS3Uri.replace('s3://', '').split('/');
      const bucket = s3Parts[0];
      const key = s3Parts.slice(1).join('/');

      const detectCommand = new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: key
          }
        },
        MaxLabels: 10,
        MinConfidence: 70
      });

      const response = await rekognitionClient.send(detectCommand);
      imageLabels = response.Labels?.map(label => label.Name || '').filter(Boolean) || [];
    } catch (error) {
      console.error('Rekognition error:', error);
    }
  }

  // Disease database (in production, this would be ML-powered)
  const diseaseDatabase: Record<string, DiseaseAnalysis> = {
    'rice_blast': {
      diseaseName: 'Rice Blast (Magnaporthe oryzae)',
      severityLevel: 'high',
      treatmentSteps: [
        'Immediate: Remove and destroy heavily infected leaves',
        'Day 1: Spray Tricyclazole 75% WP @ 120g per acre',
        'Day 7: Second spray if infection persists',
        'Maintain field hygiene, avoid excessive nitrogen'
      ],
      pesticideRecommendation: [
        'Tricyclazole 75% WP (120-150g/acre)',
        'Carbendazim 50% WP (200g/acre)',
        'Azoxystrobin 23% SC (200ml/acre)'
      ],
      preventionTips: [
        'Use resistant varieties (MTU 1010, Improved Samba Mahsuri)',
        'Avoid excessive nitrogen fertilizer',
        'Maintain proper water level (not stagnant)',
        'Remove infected crop residues',
        'Space plants properly for air circulation'
      ],
      confidence: 0.85
    },
    'tomato_late_blight': {
      diseaseName: 'Late Blight (Phytophthora infestans)',
      severityLevel: 'critical',
      treatmentSteps: [
        'URGENT: This spreads rapidly in 7-10 days',
        'Day 1: Spray Mancozeb 75% WP @ 600g per acre',
        'Day 4: Second spray with Metalaxyl 8% + Mancozeb 64% WP',
        'Day 8: Third spray if weather remains humid',
        'Remove all infected plant parts immediately'
      ],
      pesticideRecommendation: [
        'Mancozeb 75% WP (600g/acre)',
        'Metalaxyl 8% + Mancozeb 64% WP (500g/acre)',
        'Cymoxanil 8% + Mancozeb 64% WP (600g/acre)'
      ],
      preventionTips: [
        'Plant disease-resistant varieties',
        'Avoid overhead irrigation',
        'Ensure proper spacing (45-60cm)',
        'Apply preventive sprays during high humidity',
        'Destroy volunteer plants from previous season'
      ],
      confidence: 0.92
    },
    'default': {
      diseaseName: 'General Crop Stress (diagnosis needed)',
      severityLevel: 'medium',
      treatmentSteps: [
        'Step 1: Isolate affected plants to prevent spread',
        'Step 2: Take clear photos of leaves, stems, and roots',
        'Step 3: Visit nearest KVK (Krishi Vigyan Kendra) for expert diagnosis',
        'Step 4: Meanwhile, improve general plant health with balanced nutrition'
      ],
      pesticideRecommendation: [
        'Do not spray randomly without diagnosis',
        'Consult agricultural officer for specific treatment',
        'If fungal (dark spots, mold): start with broad-spectrum fungicide like Mancozeb',
        'If insect (visible bugs): use Neem oil or contact insecticide'
      ],
      preventionTips: [
        'Maintain field hygiene',
        'Ensure proper drainage',
        'Monitor crops weekly for early symptoms',
        'Use certified disease-free seeds',
        'Rotate crops to break disease cycle'
      ],
      confidence: 0.50
    }
  };

  // Simple keyword matching for disease detection
  const symptomsLower = symptoms.toLowerCase();
  let detectedDisease = diseaseDatabase['default'];

  if (crop.toLowerCase().includes('rice') && (symptomsLower.includes('spot') || symptomsLower.includes('blast') || imageLabels.some(l => l.toLowerCase().includes('spot')))) {
    detectedDisease = diseaseDatabase['rice_blast'];
  } else if (crop.toLowerCase().includes('tomato') && (symptomsLower.includes('blight') || symptomsLower.includes('dark spot') || imageLabels.some(l => l.toLowerCase().includes('fungus')))) {
    detectedDisease = diseaseDatabase['tomato_late_blight'];
  }

  return detectedDisease;
}

// ============================================================================
// A5: SEEDS & FERTILIZER GUIDE
// ============================================================================

export async function getSeedsFertilizerGuide(
  crop: string, 
  region: string, 
  budget: number
): Promise<SeedsFertilizerGuide> {
  const guides: Record<string, SeedsFertilizerGuide> = {
    'rice': {
      crop: 'Rice',
      bestSeedVarieties: [
        'Pusa Basmati 1121 (High value, premium quality)',
        'Swarna (High yielding, disease resistant)',
        'MTU 1010 (Blast resistant)',
        'Samba Mahsuri (BPT 5204)',
        'IR 64 (Drought tolerant)'
      ],
      fertilizerSchedule: [
        {
          stage: 'Basal (at sowing/transplanting)',
          fertilizer: 'DAP (Di-Ammonium Phosphate)',
          quantity: '50 kg per acre',
          timing: 'Day 0 (before transplanting)'
        },
        {
          stage: 'First top dressing',
          fertilizer: 'Urea',
          quantity: '25 kg per acre',
          timing: '21 days after transplanting (tillering stage)'
        },
        {
          stage: 'Second top dressing',
          fertilizer: 'Urea',
          quantity: '25 kg per acre',
          timing: '45 days after transplanting (panicle initiation)'
        },
        {
          stage: 'Final application',
          fertilizer: 'Potash (MOP)',
          quantity: '20 kg per acre',
          timing: '60 days (flowering stage)'
        }
      ],
      micronutrients: ['Zinc Sulfate (10kg/acre)', 'Iron (if yellowing seen)', 'Boron (2kg/acre at flowering)'],
      costEstimate: '₹8,000-12,000 per acre (seeds ₹2,000 + fertilizers ₹6,000 + micronutrients ₹2,000)'
    },
    'wheat': {
      crop: 'Wheat',
      bestSeedVarieties: [
        'HD 2967 (High yield, rust resistant)',
        'PBW 343 (Punjab region)',
        'DBW 187 (Late sowing tolerance)',
        'HD 3086 (Heat stress tolerant)',
        'WH 1105 (Good chapati quality)'
      ],
      fertilizerSchedule: [
        {
          stage: 'Basal (at sowing)',
          fertilizer: 'DAP',
          quantity: '50 kg per acre',
          timing: 'Day 0 (with sowing)'
        },
        {
          stage: 'First irrigation (CRI stage)',
          fertilizer: 'Urea',
          quantity: '30 kg per acre',
          timing: '21-25 days after sowing (crown root initiation)'
        },
        {
          stage: 'Second irrigation (tillering)',
          fertilizer: 'Urea',
          quantity: '20 kg per acre',
          timing: '45-50 days (maximum tillering)'
        },
        {
          stage: 'Third irrigation (flowering)',
          fertilizer: 'Urea',
          quantity: '10 kg per acre',
          timing: '70-75 days (heading/anthesis)'
        }
      ],
      micronutrients: ['Zinc Sulfate (10kg/acre if deficiency)', 'Iron occasionally'],
      costEstimate: '₹6,000-9,000 per acre (seeds ₹1,500 + fertilizers ₹5,000 + micronutrients ₹1,000)'
    },
    'default': {
      crop: crop,
      bestSeedVarieties: ['Consult local KVK for certified seed varieties suitable for your region'],
      fertilizerSchedule: [
        {
          stage: 'Basal',
          fertilizer: 'DAP',
          quantity: '40-50 kg per acre',
          timing: 'At sowing/planting'
        },
        {
          stage: 'Vegetative stage',
          fertilizer: 'Urea',
          quantity: '25-30 kg per acre',
          timing: '20-30 days after sowing'
        },
        {
          stage: 'Reproductive stage',
          fertilizer: 'Urea + Potash',
          quantity: '20 kg + 15 kg per acre',
          timing: '45-60 days after sowing'
        }
      ],
      micronutrients: ['Zinc, Iron, Boron (as needed based on soil test)'],
      costEstimate: '₹5,000-10,000 per acre'
    }
  };

  return guides[crop.toLowerCase()] || guides['default'];
}

// ============================================================================
// A6: SOIL HEALTH ADVISOR
// ============================================================================

export async function getSoilHealthAdvice(
  soilColor: string, 
  cropHistory: string[], 
  region: string
): Promise<SoilHealthReport> {
  // Soil color-based initial assessment
  const soilAssessment: Record<string, { type: string; ph: string; issues: string[] }> = {
    'red': {
      type: 'Red Laterite Soil',
      ph: '5.5-6.5 (slightly acidic)',
      issues: ['Iron and aluminum excess', 'Poor water retention', 'Low organic matter']
    },
    'black': {
      type: 'Black Cotton Soil (Regur)',
      ph: '7.5-8.5 (alkaline)',
      issues: ['High clay content - poor drainage', 'Micronutrient deficiencies (Zn, Fe)', 'Sticky when wet']
    },
    'brown': {
      type: 'Alluvial Soil',
      ph: '6.5-7.5 (neutral to slightly alkaline)',
      issues: ['Can have salinity in some zones', 'Variable nutrient status']
    },
    'gray': {
      type: 'Saline or Alkaline Soil',
      ph: '8.5-10.0 (highly alkaline)',
      issues: ['High salt content', 'Poor crop growth', 'White salt crust visible']
    },
    'default': {
      type: 'Mixed Soil Type',
      ph: '6.0-7.5',
      issues: ['Get soil test done for accurate assessment']
    }
  };

  const assessment = soilAssessment[soilColor.toLowerCase()] || soilAssessment['default'];

  const report: SoilHealthReport = {
    soilType: assessment.type,
    nutrientDeficiencies: [
      'Nitrogen (if leaf yellowing)',
      'Phosphorus (stunted growth, purple stems)',
      'Potassium (leaf edge burning)',
      'Zinc (whitish spots on leaves)',
      'Iron (interveinal chlorosis)'
    ],
    recommendedFertilizers: [
      'Urea (Nitrogen) - 50-60 kg/acre',
      'DAP (Phosphorus) - 40-50 kg/acre',
      'Muriate of Potash (Potassium) - 20-25 kg/acre',
      'Zinc Sulfate - 10 kg/acre (if deficiency)',
      'Gypsum - 200-400 kg/acre (for alkaline/saline soil)'
    ],
    organicImprovements: [
      'FYM (Farm Yard Manure) - 4-5 tons per acre annually',
      'Compost - 2-3 tons per acre',
      'Green manure crops (Dhaincha, Sunhemp) before main crop',
      'Vermicompost - 1 ton per acre (high quality organic matter)',
      'Bio-fertilizers (Rhizobium, Azotobacter, PSB)'
    ],
    phLevel: assessment.ph,
    recommendations: assessment.issues.map(issue => `Address: ${issue}`)
  };

  // Add specific recommendations based on crop history
  if (cropHistory.length > 0) {
    report.recommendations.push(`Crop rotation recommended: Your history shows ${cropHistory.join(' → ')}. Consider legumes next season to fix nitrogen.`);
  }

  return report;
}

// ============================================================================
// A7: IRRIGATION PLANNER
// ============================================================================

export async function getIrrigationPlan(
  crop: string, 
  growthStage: string, 
  weather: string
): Promise<IrrigationPlan> {
  const plans: Record<string, IrrigationPlan> = {
    'rice': {
      crop: 'Rice',
      growthStage: growthStage || 'vegetative',
      irrigationSchedule: [
        {
          day: 'Day 1-20 (after transplanting)',
          waterAmount: '2.5-3 inch standing water continuously',
          method: 'Flood irrigation or maintained shallow water level'
        },
        {
          day: 'Day 21-40 (tillering)',
          waterAmount: '2 inch standing water',
          method: 'Maintain waterlogged condition, drain only for fertilizer application'
        },
        {
          day: 'Day 41-70 (panicle initiation to flowering)',
          waterAmount: '3-4 inch (critical sensitive stage)',
          method: 'Never let field dry, maintain saturation'
        },
        {
          day: 'Day 71-90 (grain filling)',
          waterAmount: '1-2 inch, drain 10 days before harvest',
          method: 'Alternate wetting and drying (AWD) if water scarce'
        }
      ],
      totalWaterRequirement: '1200-1500 mm (48-60 inches) for full season',
      dripIrrigationRecommendation: 'Not suitable for traditional flooded rice. Consider System of Rice Intensification (SRI) method to save 30-40% water.'
    },
    'wheat': {
      crop: 'Wheat',
      growthStage: growthStage || 'vegetative',
      irrigationSchedule: [
        {
          day: 'CRI stage (21 days after sowing)',
          waterAmount: '2-2.5 inch',
          method: 'Flood irrigation (most critical irrigation)'
        },
        {
          day: 'Tillering (40-45 days)',
          waterAmount: '2 inch',
          method: 'Flood or furrow irrigation'
        },
        {
          day: 'Jointing (60-65 days)',
          waterAmount: '2 inch',
          method: 'Flood irrigation'
        },
        {
          day: 'Flowering (80-85 days)',
          waterAmount: '2 inch',
          method: 'Light irrigation (critical for grain formation)'
        },
        {
          day: 'Milk stage (95-100 days)',
          waterAmount: '1.5 inch',
          method: 'Last irrigation, stop 10-12 days before harvest'
        }
      ],
      totalWaterRequirement: '450-600 mm (18-24 inches) for full season',
      dripIrrigationRecommendation: 'Drip irrigation can save 30% water. Install drip lines at 45-60 cm spacing. Apply 1.5-2 hours daily during vegetative stage, 2-3 hours during reproductive stage.'
    },
    'default': {
      crop: crop,
      growthStage: growthStage || 'general',
      irrigationSchedule: [
        {
          day: 'Vegetative stage',
          waterAmount: '1-2 inch per week',
          method: 'Based on soil moisture, irrigate when 50% soil moisture depleted'
        },
        {
          day: 'Flowering/Fruiting stage',
          waterAmount: '2-3 inch per week (critical period)',
          method: 'Never let crop stress during this stage'
        },
        {
          day: 'Maturity stage',
          waterAmount: 'Reduce to 1 inch per week',
          method: 'Stop irrigation 7-10 days before harvest'
        }
      ],
      totalWaterRequirement: 'Varies by crop - consult local agriculture department',
      dripIrrigationRecommendation: 'Drip irrigation suitable for most vegetables, fruits, cotton. Can save 40-60% water compared to flood irrigation. Subsidy available under PMKSY.'
    }
  };

  return plans[crop.toLowerCase()] || plans['default'];
}

// ============================================================================
// A8: LOAN & INSURANCE GUIDE
// ============================================================================

export async function getLoanInsuranceInfo(
  landSize: number, 
  cropValue: number, 
  state: string
): Promise<LoanInsuranceInfo> {
  const loanAmount = Math.min(landSize * 50000, 300000); // ₹50k per acre, max ₹3 lakh

  return {
    kisanCreditCard: {
      eligible: landSize > 0,
      loanAmount: `₹${loanAmount.toLocaleString('en-IN')} (based on ${landSize} acre land)`,
      interestRate: '4% per annum (with timely repayment within 1 year)',
      howToApply: [
        'Visit nearest bank branch (SBI, PNB, HDFC, ICICI, any nationalized bank)',
        'Documents needed: Land records (7/12, Ferfar, Patta), Aadhaar, PAN, 2 photos',
        'Fill KCC application form',
        'Bank will verify land records and crop details',
        'Card issued within 15-30 days',
        'Withdraw cash or use for input purchases',
        'Repay after harvest - if paid within 1 year, only 4% interest charged'
      ]
    },
    pmFasalBima: {
      coverage: `Up to ₹${(cropValue * 1.5).toLocaleString('en-IN')} sum insured (150% of crop value)`,
      premium: `₹${(cropValue * 0.02).toLocaleString('en-IN')} (2% of sum insured for Kharif, 1.5% for Rabi). Remaining premium paid by government.`,
      claimProcess: [
        'Enroll within 2 weeks of sowing (mandatory for loan farmers, voluntary for others)',
        'Report crop loss within 72 hours to insurance company helpline',
        'Crop Cutting Experiments (CCE) conducted by agriculture dept',
        'If yield < threshold (80% of average), claim triggered automatically',
        'Settlement within 2 months of harvest',
        'Claims paid directly to bank account',
        'Covers: drought, flood, pest, disease, hail, cyclone, fire'
      ]
    }
  };
}

// ============================================================================
// A9: SMART SELLING ADVISOR
// ============================================================================

export async function getSmartSellingAdvice(
  crop: string, 
  harvestDate: string, 
  currentPrice: number, 
  mspPrice: number,
  storageCost: number
): Promise<SmartSellingAdvice> {
  const priceAboveMSP = ((currentPrice - mspPrice) / mspPrice) * 100;
  let recommendation: 'sell_now' | 'wait' | 'store' = 'sell_now';
  const reasoning: string[] = [];

  // Decision logic
  if (priceAboveMSP >= 10) {
    recommendation = 'sell_now';
    reasoning.push(`✅ Current price is ${priceAboveMSP.toFixed(1)}% above MSP - excellent selling window`);
    reasoning.push('Market is favorable, unlikely to go much higher in short term');
    reasoning.push('Avoid storage costs and risks');
  } else if (priceAboveMSP >= 0 && priceAboveMSP < 10) {
    recommendation = 'wait';
    reasoning.push(`⏳ Price is ${priceAboveMSP.toFixed(1)}% above MSP - okay but not optimal`);
    reasoning.push('Wait 7-15 days, price may improve if market arrivals reduce');
    reasoning.push('Watch daily mandi trends');
  } else {
    recommendation = 'store';
    reasoning.push(`⚠️ Price is ${Math.abs(priceAboveMSP).toFixed(1)}% BELOW MSP - poor timing`);
    reasoning.push('Consider government procurement at MSP price');
    reasoning.push('Or store for 1-2 months if good storage facility available');
  }

  // Storage assessment
  const estimatedStorageCost = storageCost || (currentPrice * 0.02); // 2% per month
  const potentialPriceIncrease = currentPrice * 0.10; // Assuming 10% increase in 2 months
  const netGainFromStorage = potentialPriceIncrease - (estimatedStorageCost * 2);

  const storageOptions = [
    'APMC/FCI Warehouse (₹50-100/quintal per month, low risk)',
    'Cooperative Society godown (₹30-80/quintal per month)',
    'Private cold storage (for perishables, ₹100-200/day)',
    'On-farm storage (lowest cost but requires fumigation, pest control)'
  ];

  const transportCostEstimate = '₹100-200 per quintal to mandi (varies by distance)';

  let netProfitEstimate = '';
  if (recommendation === 'sell_now') {
    netProfitEstimate = `₹${((currentPrice - 200) * 20).toLocaleString('en-IN')} per acre (assuming 20 quintal/acre, minus transport)`;
  } else if (recommendation === 'store') {
    netProfitEstimate = `Potential: ₹${((currentPrice + potentialPriceIncrease - estimatedStorageCost * 2 - 200) * 20).toLocaleString('en-IN')} per acre if price rises 10% in 2 months`;
  } else {
    netProfitEstimate = 'Wait and monitor for 1-2 weeks before deciding';
  }

  return {
    crop,
    harvestDate,
    recommendation,
    reasoning,
    storageOptions,
    transportCostEstimate,
    netProfitEstimate
  };
}

// ============================================================================
// SYSTEM PROMPT BUILDER FOR NEW MODULES
// ============================================================================

export function buildModuleSystemPrompt(
  module: ExtendedAdvisoryType, 
  request: AgricultureModuleRequest
): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    hi: 'हिंदी (Hindi)',
    te: 'తెలుగు (Telugu)',
    ta: 'தமிழ் (Tamil)',
  };
  
  const selectedLanguageName = languageNames[request.language ?? 'en'] || 'English';

  const basePrompt = `You are Kisan AI — India's most knowledgeable agricultural advisor.

You understand Indian farming conditions across all 28 states and 739 districts.

You provide PRACTICAL, ACTIONABLE farming advice that farmers can implement immediately.

SPEAKING STYLE:
✓ Simple language (5th-8th grade reading level)
✓ Local context (mention state/district specific practices)
✓ Numbers in practical terms (quintals, acres, ₹ rupees)
✓ Never say "consult experts" - YOU are the expert
✓ Never sound like a chatbot

CRITICAL RULES:
✗ DO NOT determine government scheme eligibility (redirect to Scheme Engine)
✗ DO NOT invent exact prices without data
✗ DO NOT give medical advice for humans
✓ DO give crop advice, market strategy, disease treatment, farming techniques

[STRICT MULTILINGUAL ENFORCEMENT]
The user interface language is: ${selectedLanguageName}
You MUST respond ENTIRELY in ${selectedLanguageName}, regardless of the language used in the farmer's question.
Do NOT mix languages. Do NOT use English unless the interface language is English.
This ensures consistent experience where the selected language controls all system behavior.
`;

  const moduleInstructions: Record<ExtendedAdvisoryType, string> = {
    'crop_advisor': `MODULE: Crop Advisor (A1)

TASK: Recommend top 5 crops for farmer's land based on:
- State: ${request.state}
- District: ${request.district || 'not specified'}
- Land size: ${request.landSize || 'not specified'} acres
- Soil: ${request.soilType || 'general'}
- Water: ${request.waterAvailability || 'moderate'}
- Season: ${request.currentSeason || 'current'}

FOR EACH CROP provide:
1. Expected yield (quintals per acre)
2. Expected income (₹ per acre)
3. Water requirement
4. Best seed varieties (specific names)
5. Sowing window (exact months)
6. Harvest time
7. Risk factors (pests, weather, market)

Format as numbered list. Be specific with variety names.`,

    'mandi_price': `MODULE: Mandi Price Intelligence (A2)

TASK: Provide real-time market intelligence for:
- Crop: ${request.crop || 'not specified'}
- District: ${request.district || 'not specified'}
- State: ${request.state}

PROVIDE:
1. Today's mandi price range
2. MSP (Minimum Support Price)
3. Nearest 3-4 mandis
4. Price trend (rising/falling/stable) and WHY
5. Best mandi to sell (specific recommendation)

Use REAL data if available. If not, guide farmer to "check mandi board today" but still give trend analysis.`,

    'weather_advisor': `MODULE: Weather Farming Advisor (A3)

TASK: Provide weather-based farming advice for:
- Location: ${request.state}, ${request.district || ''}
- Crop: ${request.crop || 'general farming'}

PROVIDE:
1. 7-day weather forecast (temperature, rain, humidity)
2. Irrigation advice (when to water, when to stop)
3. Pest risk warning (based on weather)
4. Harvest timing advice
5. Day-by-day action plan

Be specific: "irrigate tomorrow evening" not "water when needed"`,

    'disease_doctor': `MODULE: Crop Disease Doctor (A4)

TASK: Diagnose and treat crop disease:
- Crop: ${request.crop || 'not specified'}
- Symptoms: ${request.symptoms || 'visual inspection'}

PROVIDE:
1. Disease name (scientific + common)
2. Severity level (low/medium/high/critical)
3. Treatment steps (day-by-day action plan)
4. Pesticide recommendation (specific products with dosage)
5. Prevention tips for future

If image analyzed, mention key visual indicators detected.`,

    'seeds_fertilizer': `MODULE: Seeds & Fertilizer Guide (A5)

TASK: Recommend seeds and fertilizer schedule for:
- Crop: ${request.crop || 'not specified'}
- Region: ${request.state}
- Budget: ₹${request.budget || 10000}

PROVIDE:
1. Top 5 seed varieties (specific names with traits)
2. Fertilizer schedule (basal, top-1, top-2, final)
3. Micronutrients needed (Zn, Fe, B, etc.)
4. Total cost estimate
5. Where to buy (local dealers, govt stores)

Give exact quantities: "50kg DAP per acre" not "adequate fertilizer"`,

    'soil_health': `MODULE: Soil Health Advisor (A6)

TASK: Assess soil health and recommend improvements:
- Soil color: ${request.soilColor || 'not specified'}
- Crop history: ${request.cropHistory?.join(', ') || 'not specified'}
- Region: ${request.state}

PROVIDE:
1. Soil type identification
2. Likely nutrient deficiencies
3. Recommended fertilizers (specific NPK values)
4. Organic improvement methods
5. pH management advice

Translate soil science into farmer-friendly language.`,

    'irrigation_planner': `MODULE: Irrigation Planner (A7)

TASK: Create irrigation schedule for:
- Crop: ${request.crop || 'not specified'}
- Growth stage: ${request.growthStage || 'not specified'}
- Weather conditions: Consider recent weather

PROVIDE:
1. Irrigation schedule (day-by-day or stage-wise)
2. Water requirement per irrigation
3. Best irrigation method (flood/furrow/drip/sprinkler)
4. Drip irrigation feasibility and subsidy info
5. Water conservation tips

Give practical measurements: "2 inch water" or "2 hours drip irrigation"`,

    'loan_insurance': `MODULE: Loan & Insurance Guide (A8)

TASK: Guide farmer on credit and insurance:
- Land size: ${request.landSize || 'not specified'} acres
- State: ${request.state}

PROVIDE:
1. Kisan Credit Card eligibility and loan amount
2. Interest rate (4% subsidy scheme)
3. How to apply step-by-step
4. PM Fasal Bima Yojana coverage
5. Premium amount
6. Claim process

Give CURRENT schemes (2025-26). Step-by-step instructions.`,

    'smart_selling': `MODULE: Smart Selling Advisor (A9)

TASK: Advise on selling strategy:
- Crop: ${request.crop || 'not specified'}
- Harvest date: ${request.harvestDate || 'recent'}

PROVIDE:
1. Recommendation: SELL NOW vs WAIT vs STORE (choose one clearly)
2. Reasoning (3-5 specific points with data)
3. Storage options (FCI warehouse, cooperative, on-farm)
4. Transport cost estimate
5. Net profit estimate

Base recommendation on: current price vs MSP, market trend, storage cost analysis.`,

    // Default existing types
    'market': 'Provide sell/hold/watch guidance based on mandi price trends.',
    'weather': 'Give preventive farming steps based on weather forecast.',
    'scheme': 'REDIRECT: Tell farmer to use BUAIP Scheme Eligibility Engine for government schemes.',
    'general': 'Provide general crop guidance with weekly action plan.'
  };

  return basePrompt + (moduleInstructions[module] || moduleInstructions['general']);
}

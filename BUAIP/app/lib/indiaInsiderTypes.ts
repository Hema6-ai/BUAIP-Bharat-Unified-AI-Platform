/**
 * India Insider AI - Tourist Intelligence Types
 * 
 * Shared types for all tourist intelligence engines
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type SupportedLanguage = 
  | 'en' // English
  | 'zh' // Chinese
  | 'es' // Spanish
  | 'fr' // French
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'bn'; // Bengali

export interface TouristProfile {
  nationality?: string;
  currentLocation?: string;
  destination?: string;
  arrivalDate?: string;
  departureDate?: string;
  travelPurpose?: 'tourism' | 'business' | 'medical' | 'education' | 'longstay' | 'other';
  groupSize?: number;
  hasChildren?: boolean;
  budget?: 'budget' | 'mid' | 'luxury';
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
  preferredLanguage?: SupportedLanguage;
}

export interface EngineResponse {
  engine: string;
  response: string;
  data?: any;
  warnings?: string[];
  actionItems?: string[];
  emergencyContacts?: EmergencyContact[];
  timestamp: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  address?: string;
  services: string[];
  availability: string;
}

// ============================================================================
// PRE-ARRIVAL ENGINE TYPES
// ============================================================================

export interface VisaRequirement {
  visaType: string;
  required: boolean;
  process: string[];
  documents: string[];
  cost: string;
  processingTime: string;
  url: string;
}

export interface PreArrivalPlan {
  visaInfo: VisaRequirement;
  vaccination: string[];
  insurance: string;
  currency: string;
  simCard: string;
  packing: string[];
  airportInfo: string;
  customsRules: string[];
}

// ============================================================================
// CITY NAVIGATOR ENGINE TYPES
// ============================================================================

export interface CityGuide {
  city: string;
  state: string;
  mustSee: Attraction[];
  transport: TransportOption[];
  safetyTips: string[];
  commonScams: Scam[];
  localEtiquette: string[];
  bestTime: string;
}

export interface Attraction {
  name: string;
  type: string;
  description: string;
  location: string;
  cost: string;
  hours: string;
  tips: string[];
}

export interface TransportOption {
  mode: string;
  cost: string;
  safety: 'high' | 'medium' | 'low';
  tips: string[];
}

export interface Scam {
  name: string;
  description: string;
  howToAvoid: string[];
}

// ============================================================================
// PAYMENT ENGINE TYPES
// ============================================================================

export interface PaymentGuide {
  upiSetup: string[];
  atmLocations: string;
  exchangeRates: string;
  cashRequirement: string;
  cardAcceptance: string;
  tips: string[];
}

// ============================================================================
// EMERGENCY ENGINE TYPES
// ============================================================================

export interface EmergencyGuide {
  situation: string;
  immediateSteps: string[];
  contacts: EmergencyContact[];
  nearbyHelp: string;
  documentReplacement?: string[];
}

export interface Hospital {
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  acceptsInternationalInsurance: boolean;
  hasEnglishSpeakers: boolean;
}

export interface Embassy {
  country: string;
  location: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  services: string[];
}

// ============================================================================
// FOOD SAFETY ENGINE TYPES
// ============================================================================

export interface FoodSafetyGuide {
  safeToEat: string[];
  avoid: string[];
  waterSafety: string;
  restaurantTips: string[];
  streetFoodGuidance: string[];
  dietaryOptions: DietaryOption[];
}

export interface DietaryOption {
  type: string; // 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free'
  availability: 'easy' | 'moderate' | 'difficult';
  tips: string[];
  recommendedPlaces: string[];
}

// ============================================================================
// EXPAT LONGSTAY ENGINE TYPES
// ============================================================================

export interface ExpatGuide {
  visaType: string;
  registration: string[];
  banking: string[];
  accommodation: string[];
  utilities: string[];
  healthcare: string[];
  schooling?: string[];
  taxes: string[];
}

// ============================================================================
// LANGUAGE SURVIVAL ENGINE TYPES
// ============================================================================

export interface LanguagePhrases {
  category: string;
  phrases: Phrase[];
}

export interface Phrase {
  english: string;
  translation: string;
  pronunciation: string;
  context: string;
}

// ============================================================================
// LEGAL & CULTURAL ENGINE TYPES
// ============================================================================

export interface LegalRule {
  topic: string;
  rule: string;
  penalty: string;
  exceptions?: string[];
}

export interface CulturalEtiquette {
  situation: string;
  dos: string[];
  donts: string[];
  context: string;
}

// ============================================================================
// ENGINE INTENT TYPES
// ============================================================================

export type EngineIntent =
  | 'scheme_eligibility'
  | 'agriculture_farming'
  | 'global_seller_intelligence'
  | 'pre_arrival'
  | 'pre_arrival_planning'
  | 'city_navigation'
  | 'payment_money'
  | 'emergency_assistance'
  | 'food_safety'
  | 'expat_longstay'
  | 'language_survival'
  | 'legal_cultural'
  | 'legal_rights'
  | 'general_query';

export interface IntentAnalysis {
  primaryIntent: EngineIntent;
  confidence: number;
  secondaryIntents: EngineIntent[];
  extractedEntities: {
    location?: string;
    nationality?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeframe?: string;
    legalCategory?: string;
    userGoal?: string;
    documentLanguage?: string;
  };
  entities?: {
    location?: string;
    nationality?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeframe?: string;
  };
  alternateIntents?: Array<{ intent: EngineIntent; confidence: number }>;
}

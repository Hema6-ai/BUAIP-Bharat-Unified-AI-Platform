import { NextRequest, NextResponse } from 'next/server';
import { runSuperRouter } from '@/router/super_router';
import { routeCapability } from '@/router/capability_router';
import { getFactsContextForQuery } from '@/app/lib/factsVectorStore';
import { resolveDeterministicFactQuery } from '@/app/lib/realTimeDataService';
import { getLiveWebContextForQuery } from '@/app/lib/liveWebLookupService';
import {
  runCanonicalInputPipeline,
  runCanonicalOutputPipeline,
  normalizeUserLanguage,
} from '@/app/lib/aws/translationPipeline';
import {
  hashQuery,
  getCachedResult,
  setCachedResult,
  tryAnswerLocally,
} from '@/app/lib/performanceLayer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface UnifiedAIRequest {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string;
  selectedLanguage?: string;
}

/**
 * User profile fields that can be collected
 */
interface UserProfile {
  gender?: string;
  age?: number;
  state?: string;
  district?: string;
  areaType?: 'urban' | 'rural';
  category?: 'General' | 'OBC' | 'SC' | 'ST';
  monthlyIncome?: number;
  occupation?: string;
  education?: string;
  
  // Derived/inferred fields
  farming?: boolean;
  landOwned?: number;
  student?: boolean;
  employed?: boolean;
  entrepreneur?: boolean;
  disability?: boolean;
  maritalStatus?: string;
  minority?: boolean;
  bpl?: boolean;
  seniorCitizen?: boolean;

  // Deep Agriculture Profile (for farmers)
  agricultureProfile?: {
    farmerType?: string;
    primaryCrop?: string;
    documents?: string[];
    biggestProblem?: string;
    irrigationAccess?: string;
    loanStatus?: string;
    specialPractices?: string[];
    sellingChannel?: string;
  };
}

interface SessionState {
  profile: UserProfile;
  conversationSummary: string[];
  updatedAt: number;
}

const sessions = new Map<string, SessionState>();
const SESSION_TTL_MS = 60 * 60 * 1000;

/**
 * State abbreviation mapping for normalization
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  ap: 'Andhra Pradesh',
  ar: 'Arunachal Pradesh',
  as: 'Assam',
  br: 'Bihar',
  cg: 'Chhattisgarh',
  ga: 'Goa',
  gj: 'Gujarat',
  hr: 'Haryana',
  hp: 'Himachal Pradesh',
  jh: 'Jharkhand',
  jk: 'Jammu and Kashmir',
  ka: 'Karnataka',
  kl: 'Kerala',
  mp: 'Madhya Pradesh',
  mh: 'Maharashtra',
  mn: 'Manipur',
  ml: 'Meghalaya',
  mz: 'Mizoram',
  nl: 'Nagaland',
  od: 'Odisha',
  pb: 'Punjab',
  rj: 'Rajasthan',
  sk: 'Sikkim',
  tn: 'Tamil Nadu',
  tg: 'Telangana',
  ts: 'Telangana',
  tr: 'Tripura',
  up: 'Uttar Pradesh',
  uk: 'Uttarakhand',
  wb: 'West Bengal',
  dl: 'Delhi',
};

/**
 * Clean up expired sessions
 */
function purgeExpiredSessions() {
  const now = Date.now();
  for (const [key, value] of sessions.entries()) {
    if (now - value.updatedAt > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

/**
 * Get or create session state
 */
function getOrCreateSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.updatedAt = Date.now();
    return existing;
  }

  const fresh: SessionState = {
    profile: {},
    conversationSummary: [],
    updatedAt: Date.now(),
  };

  sessions.set(sessionId, fresh);
  return fresh;
}

/**
 * Extract profile information from user message using pattern matching
 */
function extractProfileInfo(message: string, profile: UserProfile): void {
  const lowerMessage = message.toLowerCase();
  
  // Extract age
  const ageMatch = message.match(/\b(\d+)\s*(?:years?|yrs?|yo|age)?\b/i);
  if (ageMatch && !profile.age) {
    const age = parseInt(ageMatch[1]);
    if (age >= 1 && age <= 120) {
      profile.age = age;
    }
  }
  
  // Extract income
  const incomeMatch = message.match(/(?:₹|rs\.?|rupees?)\s*(\d+(?:,\d+)*)/i);
  if (incomeMatch && !profile.monthlyIncome) {
    const income = parseInt(incomeMatch[1].replace(/,/g, ''));
    profile.monthlyIncome = income;
  }
  
  // Extract state
  for (const [abbr, fullName] of Object.entries(STATE_ABBREVIATIONS)) {
    if (!profile.state && (
      lowerMessage.includes(fullName.toLowerCase()) ||
      new RegExp(`\\b${abbr}\\b`, 'i').test(lowerMessage)
    )) {
      profile.state = fullName;
      break;
    }
  }
  
  // Extract gender
  if (!profile.gender) {
    if (/\b(male|man|boy|m)\b/i.test(lowerMessage)) {
      profile.gender = 'Male';
    } else if (/\b(female|woman|girl|f)\b/i.test(lowerMessage)) {
      profile.gender = 'Female';
    }
  }
  
  // Extract occupation
  if (!profile.occupation) {
    if (/\b(farmer|farming|agriculture|agricultural)\b/i.test(lowerMessage)) {
      profile.occupation = 'Farmer';
    } else if (/\b(student|studying|study)\b/i.test(lowerMessage)) {
      profile.occupation = 'Student';
    } else if (/\b(business|entrepreneur|self[- ]?employed)\b/i.test(lowerMessage)) {
      profile.occupation = 'Business Owner';
    } else if (/\b(employed|working|job|employee)\b/i.test(lowerMessage)) {
      profile.occupation = 'Employed';
    } else if (/\b(unemployed|jobless|not working)\b/i.test(lowerMessage)) {
      profile.occupation = 'Unemployed';
    }
  }
  
  // Extract category
  if (!profile.category) {
    if (/\bgeneral\b/i.test(lowerMessage)) {
      profile.category = 'General';
    } else if (/\bobc\b/i.test(lowerMessage)) {
      profile.category = 'OBC';
    } else if (/\bsc\b/i.test(lowerMessage)) {
      profile.category = 'SC';
    } else if (/\bst\b/i.test(lowerMessage)) {
      profile.category = 'ST';
    }
  }
  
  // Extract area type
  if (!profile.areaType) {
    if (/\b(urban|city|town)\b/i.test(lowerMessage)) {
      profile.areaType = 'urban';
    } else if (/\b(rural|village)\b/i.test(lowerMessage)) {
      profile.areaType = 'rural';
    }
  }
  
  // Extract land ownership
  const landMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:acre|acres|hectare)/i);
  if (landMatch && !profile.landOwned) {
    profile.landOwned = parseFloat(landMatch[1]);
  }
  
  // Extract district
  if (!profile.district && profile.state) {
    // Simple extraction - could be improved with district database
    const districtMatch = message.match(/(?:in|from|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:district|dist)/i);
    if (districtMatch) {
      profile.district = districtMatch[1];
    }
  }
  
  // Extract agriculture profile for farmers
  if (profile.farming || profile.occupation?.toLowerCase().includes('farmer')) {
    if (!profile.agricultureProfile) {
      profile.agricultureProfile = {};
    }

    // Extract farmer type
    if (!profile.agricultureProfile.farmerType) {
      if (/landless.*labourer/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'landless_labourer';
      } else if (/small|marginal|below.*2.*acre/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'small_marginal';
      } else if (/medium.*farmer|2.*5.*acre/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'medium_farmer';
      } else if (/large.*farmer|5.*acre/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'large_farmer';
      } else if (/tenant|sharecropper/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'tenant_sharecropper';
      } else if (/tribal.*forest/i.test(lowerMessage)) {
        profile.agricultureProfile.farmerType = 'tribal_forest_farmer';
      }
    }

    // Extract primary crop
    if (!profile.agricultureProfile.primaryCrop) {
      if (/food.*grain|wheat|rice|maize/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'food_grains';
      } else if (/pulse|dal|chana|moong/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'pulses';
      } else if (/oilseed|mustard|groundnut|sunflower/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'oilseeds';
      } else if (/cash.*crop|sugarcane|cotton|tobacco/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'cash_crops';
      } else if (/horticulture|fruit|vegetable|flower/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'horticulture';
      } else if (/spice|turmeric|chilli|cardamom/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'spices';
      } else if (/plantation|tea|coffee|rubber/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'plantation';
      } else if (/mixed.*farming/i.test(lowerMessage)) {
        profile.agricultureProfile.primaryCrop = 'mixed_farming';
      }
    }

    // Extract documents (multi-select)
    if (!profile.agricultureProfile.documents) {
      profile.agricultureProfile.documents = [];
    }
    if (/kisan.*credit.*card|kcc/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.documents.includes('kisan_credit_card')) {
        profile.agricultureProfile.documents.push('kisan_credit_card');
      }
    }
    if (/pm.*kisan.*registered/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.documents.includes('pm_kisan_registered')) {
        profile.agricultureProfile.documents.push('pm_kisan_registered');
      }
    }
    if (/soil.*health.*card/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.documents.includes('soil_health_card')) {
        profile.agricultureProfile.documents.push('soil_health_card');
      }
    }
    if (/land.*record|patta/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.documents.includes('land_records')) {
        profile.agricultureProfile.documents.push('land_records');
      }
    }
    if (/aadhaar.*link.*bank/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.documents.includes('aadhaar_linked_bank')) {
        profile.agricultureProfile.documents.push('aadhaar_linked_bank');
      }
    }
    if (/none.*of.*these|no.*document/i.test(lowerMessage)) {
      profile.agricultureProfile.documents = ['none'];
    }

    // Extract biggest problem
    if (!profile.agricultureProfile.biggestProblem) {
      if (/no.*money.*seed|buy.*fertilizer/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'no_money_seeds';
      } else if (/crop.*damaged|flood|drought|pest/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'crop_damaged';
      } else if (/no.*irrigation|water.*scarcity/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'no_irrigation';
      } else if (/low.*price.*produce/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'low_price';
      } else if (/no.*storage/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'no_storage';
      } else if (/loan|debt.*burden/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'loan_debt';
      } else if (/need.*equipment/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'need_equipment';
      } else if (/new.*crop|new.*technique/i.test(lowerMessage)) {
        profile.agricultureProfile.biggestProblem = 'want_new_crop';
      }
    }

    // Extract irrigation access
    if (!profile.agricultureProfile.irrigationAccess) {
      if (/fully.*irrigated|borewell|canal/i.test(lowerMessage)) {
        profile.agricultureProfile.irrigationAccess = 'fully_irrigated';
      } else if (/partially.*irrigated/i.test(lowerMessage)) {
        profile.agricultureProfile.irrigationAccess = 'partially_irrigated';
      } else if (/rain.*dependent|fully.*rain/i.test(lowerMessage)) {
        profile.agricultureProfile.irrigationAccess = 'rain_dependent';
      } else if (/no.*water.*access/i.test(lowerMessage)) {
        profile.agricultureProfile.irrigationAccess = 'no_water_access';
      }
    }

    // Extract loan status
    if (!profile.agricultureProfile.loanStatus) {
      if (/bank.*loan|repaying/i.test(lowerMessage)) {
        profile.agricultureProfile.loanStatus = 'bank_loan_repaying';
      } else if (/moneylender|private.*loan/i.test(lowerMessage)) {
        profile.agricultureProfile.loanStatus = 'moneylender_loan';
      } else if (/no.*loan.*currently/i.test(lowerMessage)) {
        profile.agricultureProfile.loanStatus = 'no_loan';
      } else if (/loan.*waived/i.test(lowerMessage)) {
        profile.agricultureProfile.loanStatus = 'previous_loan_waived';
      }
    }

    // Extract special practices (multi-select)
    if (!profile.agricultureProfile.specialPractices) {
      profile.agricultureProfile.specialPractices = [];
    }
    if (/organic.*farming/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('organic_farming')) {
        profile.agricultureProfile.specialPractices.push('organic_farming');
      }
    }
    if (/natural.*farming|zero.*budget/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('natural_farming')) {
        profile.agricultureProfile.specialPractices.push('natural_farming');
      }
    }
    if (/drip|sprinkler.*irrigation/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('drip_irrigation')) {
        profile.agricultureProfile.specialPractices.push('drip_irrigation');
      }
    }
    if (/greenhouse|polyhouse/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('greenhouse')) {
        profile.agricultureProfile.specialPractices.push('greenhouse');
      }
    }
    if (/fish.*farming|aquaculture/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('fish_farming')) {
        profile.agricultureProfile.specialPractices.push('fish_farming');
      }
    }
    if (/animal.*husbandry|cow|buffalo|goat/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('animal_husbandry')) {
        profile.agricultureProfile.specialPractices.push('animal_husbandry');
      }
    }
    if (/beekeeping/i.test(lowerMessage)) {
      if (!profile.agricultureProfile.specialPractices.includes('beekeeping')) {
        profile.agricultureProfile.specialPractices.push('beekeeping');
      }
    }
    if (/none.*of.*above|none.*of.*these/i.test(lowerMessage)) {
      profile.agricultureProfile.specialPractices = ['none'];
    }

    // Extract selling channel
    if (!profile.agricultureProfile.sellingChannel) {
      if (/government|apmc|mandi/i.test(lowerMessage)) {
        profile.agricultureProfile.sellingChannel = 'government_apmc';
      } else if (/private.*trader|middlemen/i.test(lowerMessage)) {
        profile.agricultureProfile.sellingChannel = 'private_traders';
      } else if (/direct.*consumer/i.test(lowerMessage)) {
        profile.agricultureProfile.sellingChannel = 'direct_consumers';
      } else if (/export/i.test(lowerMessage)) {
        profile.agricultureProfile.sellingChannel = 'export';
      } else if (/self.*consumption|no.*selling/i.test(lowerMessage)) {
        profile.agricultureProfile.sellingChannel = 'self_consumption';
      }
    }
  }
  
  // Extract education level
  if (!profile.education) {
    if (/\b(phd|doctorate)\b/i.test(lowerMessage)) {
      profile.education = 'PhD';
    } else if (/\b(post[- ]?graduate|masters?|m\.?[a-z]+)\b/i.test(lowerMessage)) {
      profile.education = 'Post-Graduate';
    } else if (/\b(graduate|degree|b\.?[a-z]+)\b/i.test(lowerMessage)) {
      profile.education = 'Graduate';
    } else if (/\b(12th|higher\s+secondary|intermediate)\b/i.test(lowerMessage)) {
      profile.education = '12th Pass';
    } else if (/\b(10th|secondary|ssc)\b/i.test(lowerMessage)) {
      profile.education = '10th Pass';
    } else if (/\b(primary|elementary)\b/i.test(lowerMessage)) {
      profile.education = 'Primary';
    }
  }
  
  // Extract yes/no fields
  const yesPattern = /\b(yes|y|haan|ha|correct|right)\b/i;
  const noPattern = /\b(no|n|nahi|nahin)\b/i;
  
  // Disability
  if (profile.disability === undefined) {
    if (/disability|disabled|handicap/i.test(lowerMessage)) {
      if (yesPattern.test(lowerMessage)) {
        profile.disability = true;
      } else if (noPattern.test(lowerMessage)) {
        profile.disability = false;
      }
    }
  }
  
  // BPL status
  if (profile.bpl === undefined) {
    if (/bpl|below\s+poverty|ration\s+card/i.test(lowerMessage)) {
      if (yesPattern.test(lowerMessage)) {
        profile.bpl = true;
      } else if (noPattern.test(lowerMessage)) {
        profile.bpl = false;
      }
    }
  }
  
  // Minority status
  if (profile.minority === undefined) {
    if (/minority/i.test(lowerMessage)) {
      if (yesPattern.test(lowerMessage)) {
        profile.minority = true;
      } else if (noPattern.test(lowerMessage)) {
        profile.minority = false;
      }
    }
  }
  
  // Marital status
  if (!profile.maritalStatus) {
    if (/\b(unmarried|single|bachelor)\b/i.test(lowerMessage)) {
      profile.maritalStatus = 'Unmarried';
    } else if (/\b(married|spouse|husband|wife)\b/i.test(lowerMessage)) {
      profile.maritalStatus = 'Married';
    } else if (/\b(divorced|separated)\b/i.test(lowerMessage)) {
      profile.maritalStatus = 'Divorced';
    } else if (/\b(widow|widower)\b/i.test(lowerMessage)) {
      profile.maritalStatus = 'Widowed';
    }
  }
}

/**
 * Apply inference rules to derive obvious facts
 */
function applyInferenceRules(profile: UserProfile): void {
  // If occupation is farmer, set farming to true
  if (profile.occupation?.toLowerCase().includes('farmer') || 
      profile.occupation?.toLowerCase().includes('agricult')) {
    profile.farming = true;
    profile.employed = true;
    profile.student = false;
    profile.entrepreneur = false;
  }
  
  // If occupation is student, mark as student
  if (profile.occupation?.toLowerCase().includes('student')) {
    profile.student = true;
    profile.employed = false;
    profile.entrepreneur = false;
    profile.farming = false;
  }
  
  // If occupation is business owner, mark as entrepreneur
  if (profile.occupation?.toLowerCase().includes('business') ||
      profile.occupation?.toLowerCase().includes('entrepreneur')) {
    profile.entrepreneur = true;
    profile.employed = false;
    profile.student = false;
  }
  
  // If occupation is employed, mark employed
  if (profile.occupation?.toLowerCase().includes('employed') ||
      profile.occupation?.toLowerCase().includes('job') ||
      profile.occupation?.toLowerCase().includes('working')) {
    profile.employed = true;
    profile.entrepreneur = false;
    profile.student = false;
  }
  
  // If unemployed, mark nothing else
  if (profile.occupation?.toLowerCase().includes('unemployed')) {
    profile.employed = false;
    profile.entrepreneur = false;
    profile.farming = false;
    profile.student = false;
  }
  
  // If age >= 60, mark as senior citizen
  if (profile.age && profile.age >= 60) {
    profile.seniorCitizen = true;
  } else if (profile.age) {
    profile.seniorCitizen = false;
  }
  
  // If land owned, must be involved in agriculture
  if (profile.landOwned && profile.landOwned > 0) {
    profile.farming = true;
    if (!profile.occupation) {
      profile.occupation = 'Farmer';
    }
  }
  
  // If farming, likely rural (unless specified urban)
  if (profile.farming && !profile.areaType) {
    // Don't auto-set, but keep in mind for questioning priority
  }
}

/**
 * Determine critical missing fields for scheme eligibility
 */
function getMissingCriticalFields(profile: UserProfile): string[] {
  const missing: string[] = [];
  
  if (!profile.age) missing.push('age');
  if (!profile.gender) missing.push('gender');
  if (!profile.state) missing.push('state');
  if (!profile.category) missing.push('social category (General/OBC/SC/ST)');
  if (!profile.monthlyIncome) missing.push('monthly household income');
  if (!profile.occupation) missing.push('occupation');
  if (!profile.areaType) missing.push('area type (urban/rural)');
  
  // Conditional fields based on occupation
  if (profile.farming && profile.landOwned === undefined) {
    missing.push('land ownership (in acres)');
  }
  
  // Deep agriculture fields for farmers
  if (profile.farming || profile.occupation?.toLowerCase().includes('farmer')) {
    if (!profile.agricultureProfile) {
      missing.push('farmer type');
    } else {
      if (!profile.agricultureProfile.farmerType) missing.push('farmer type (landless/small/medium/large)');
      if (!profile.agricultureProfile.primaryCrop) missing.push('primary crop type');
      if (!profile.agricultureProfile.documents || profile.agricultureProfile.documents.length === 0) {
        missing.push('available documents (KCC/PM-KISAN/Soil Card/Land Records)');
      }
      if (!profile.agricultureProfile.biggestProblem) missing.push('biggest farming problem');
      if (!profile.agricultureProfile.irrigationAccess) missing.push('irrigation access');
      if (!profile.agricultureProfile.loanStatus) missing.push('loan status');
      if (!profile.agricultureProfile.specialPractices || profile.agricultureProfile.specialPractices.length === 0) {
        missing.push('special farming practices (organic/natural/greenhouse/etc)');
      }
      if (!profile.agricultureProfile.sellingChannel) missing.push('where you sell produce');
    }
  }
  
  if (profile.disability === undefined) {
    missing.push('disability status');
  }
  
  return missing;
}

/**
 * Build system prompt with reasoning instructions
 */
function buildReasoningPrompt(profile: UserProfile, conversationHistory: any[]): string {
  const profileSummary = formatProfileForAI(profile);
  const missingFields = getMissingCriticalFields(profile);
  
  const hasEnoughInfo = missingFields.length === 0 || 
    (missingFields.length === 1 && missingFields[0] === 'disability status');
  
  // Check if this is a farmer with complete agriculture profile
  const isFarmer = profile.farming || profile.occupation?.toLowerCase().includes('farmer');
  const hasCompleteAgriProfile = isFarmer && 
    profile.agricultureProfile &&
    profile.agricultureProfile.farmerType &&
    profile.agricultureProfile.primaryCrop &&
    profile.agricultureProfile.documents &&
    profile.agricultureProfile.biggestProblem &&
    profile.agricultureProfile.irrigationAccess &&
    profile.agricultureProfile.loanStatus &&
    profile.agricultureProfile.specialPractices &&
    profile.agricultureProfile.sellingChannel;

  // If farmer with complete profile, use agriculture-specific scheme prompt
  if (isFarmer && hasCompleteAgriProfile && hasEnoughInfo) {
    // Import the agriculture scheme prompt builder
    const { buildAgricultureSchemePrompt } = require('@/app/lib/aws/systemPrompts');
    const ageValue = profile.age ?? 0;
    
    // Convert profile to format expected by agriculture prompt
    const formattedProfile = {
      gender: profile.gender,
      age: profile.age,
      age_group: ageValue >= 60 ? '60+' : ageValue >= 41 ? '41-60' : ageValue >= 26 ? '26-40' : '18-25',
      state: profile.state,
      district: profile.district,
      annual_income: profile.monthlyIncome ? profile.monthlyIncome * 12 : undefined,
      social_category: profile.category?.toLowerCase(),
      areaType: profile.areaType,
      land_area: profile.landOwned,
    };
    
    return buildAgricultureSchemePrompt(formattedProfile, profile.agricultureProfile);
  }
  
  const systemPrompt = `You are the reasoning engine for the Bharat Unified Access Intelligence Platform (BUAIP).

Your purpose is to intelligently determine which government schemes a citizen is eligible for by reasoning about their profile.

You must behave like a trained government welfare officer who understands citizens, not like a questionnaire bot.

CRITICAL BEHAVIORAL RULES:
1. NEVER ask for information already known in the user profile below
2. NEVER ask redundant questions (e.g., if occupation=farmer, DON'T ask "are you involved in farming?")
3. If a fact can be inferred from existing information, DO NOT ask for it
4. Ask ONLY the most critical missing information
5. Once you have enough information, IMMEDIATELY provide scheme recommendations

${isFarmer ? `
SPECIAL NOTE: This user is a FARMER. After collecting basic profile info, ask these agriculture-specific questions ONE AT A TIME:
1. What type of farmer are you? (Landless Labourer / Small-Marginal below 2 acres / Medium 2-5 acres / Large 5+ acres / Tenant-Sharecropper / Tribal Forest Farmer)
2. What do you primarily grow? (Food Grains / Pulses / Oilseeds / Cash Crops / Horticulture / Spices / Plantation / Mixed Farming)
3. Do you have any of these documents? (Kisan Credit Card / PM Kisan registered / Soil Health Card / Land Records / Aadhaar linked to bank / None)
4. What is your current biggest problem? (No money for seeds/fertilizer / Crop damaged / No irrigation / Low price for produce / No storage / Loan-debt burden / Need equipment / Want new crop/technique)
5. Do you have irrigation access? (Fully irrigated / Partially irrigated / Rain-dependent / No water access)
6. Have you taken any agricultural loan? (Bank loan repaying / Moneylender loan / No loan / Previous loan waived)
7. Do you practice any of these? (Organic farming / Natural farming / Drip irrigation / Greenhouse / Fish farming / Animal husbandry / Beekeeping / None)
8. Where do you sell your produce? (Government APMC mandi / Private traders / Direct to consumers / Export / Self-consumption)

Ask these questions conversationally after basic profile is complete.
` : ''}

CURRENT USER PROFILE:
${profileSummary}

MISSING CRITICAL INFORMATION:
${missingFields.length > 0 ? '- ' + missingFields.join('\n- ') : 'None - Profile is sufficient for recommendations'}

INFERENCE RULES ALREADY APPLIED:
${getInferenceExplanation(profile)}

YOUR DECISION PROCESS (follow this internally):
STEP 1: Review what you already know about the user (see profile above)
STEP 2: Identify what has been logically inferred (see inference rules above)
STEP 3: Check if you have enough information for scheme recommendations
STEP 4a: If YES (or only disability status missing): Provide detailed scheme recommendations with official links
STEP 4b: If NO: Ask ONE intelligent question for the MOST critical missing field

WHEN PROVIDING SCHEME RECOMMENDATIONS:
- List 3-5 specific government schemes the user qualifies for
- Explain WHY they qualify based on their profile
- Provide official website links (must be full https:// URLs that are clickable)
- Include application process details
- Be conversational and helpful like a welfare officer
- Prioritize the most relevant schemes for their situation

WHEN ASKING QUESTIONS:
- Ask only ONE question at a time
- Make it conversational and natural
- Briefly explain why you need this information
- Never repeat information already known
- Cluster related information (e.g., "What best describes your work situation?")

EXAMPLE OF GOOD REASONING:
User: "I am a 35-year-old farmer in Andhra Pradesh"
Your thinking: Age=35, occupation=farmer → farming=true, employed=true. State=Andhra Pradesh.
Missing: income, district, land ownership, category
Your response: "I see you're a farmer in Andhra Pradesh. To recommend the best agricultural schemes for you, what is your approximate monthly household income?"

EXAMPLE OF BAD BEHAVIOR (NEVER DO THIS):
User: "I am a farmer"
Bad response: "Are you involved in farming activities?" ← WRONG! Already know they're a farmer!
Bad response: "Are you employed?" ← WRONG! Farmers are employed!

Remember: Minimize questions, maximize reasoning, provide useful recommendations.`;

  return systemPrompt;
}

/**
 * Get explanation of what was inferred
 */
function getInferenceExplanation(profile: UserProfile): string {
  const inferences: string[] = [];
  
  if (profile.occupation?.toLowerCase().includes('farmer')) {
    inferences.push('- Since occupation=Farmer → farming=true, employed=true');
  }
  if (profile.occupation?.toLowerCase().includes('student')) {
    inferences.push('- Since occupation=Student → student=true, employed=false');
  }
  if (profile.occupation?.toLowerCase().includes('business')) {
    inferences.push('- Since occupation=Business Owner → entrepreneur=true');
  }
  if (profile.age && profile.age >= 60) {
    inferences.push(`- Since age=${profile.age} → seniorCitizen=true`);
  } else if (profile.age) {
    inferences.push(`- Since age=${profile.age} → seniorCitizen=false`);
  }
  if (profile.landOwned && profile.landOwned > 0) {
    inferences.push(`- Since landOwned=${profile.landOwned} acres → farming=true`);
  }
  
  return inferences.length > 0 ? inferences.join('\n') : '(No inferences applied yet)';
}

/**
 * Format profile for AI readability
 */
function formatProfileForAI(profile: UserProfile): string {
  const parts: string[] = [];
  
  if (profile.age) parts.push(`- Age: ${profile.age} years`);
  if (profile.gender) parts.push(`- Gender: ${profile.gender}`);
  if (profile.occupation) parts.push(`- Occupation: ${profile.occupation}`);
  if (profile.state) parts.push(`- State: ${profile.state}`);
  if (profile.district) parts.push(`- District: ${profile.district}`);
  if (profile.areaType) parts.push(`- Area Type: ${profile.areaType === 'urban' ? 'Urban' : 'Rural'}`);
  if (profile.category) parts.push(`- Social Category: ${profile.category}`);
  if (profile.monthlyIncome) parts.push(`- Monthly Household Income: ₹${profile.monthlyIncome.toLocaleString()}`);
  if (profile.education) parts.push(`- Education: ${profile.education}`);
  
  if (profile.farming !== undefined) parts.push(`- Farming: ${profile.farming ? 'Yes' : 'No'}`);
  if (profile.landOwned !== undefined) parts.push(`- Land Owned: ${profile.landOwned} acres`);
  if (profile.employed !== undefined) parts.push(`- Employed: ${profile.employed ? 'Yes' : 'No'}`);
  if (profile.entrepreneur !== undefined) parts.push(`- Entrepreneur: ${profile.entrepreneur ? 'Yes' : 'No'}`);
  if (profile.student !== undefined) parts.push(`- Student: ${profile.student ? 'Yes' : 'No'}`);
  if (profile.disability !== undefined) parts.push(`- Disability: ${profile.disability ? 'Yes' : 'No'}`);
  if (profile.maritalStatus) parts.push(`- Marital Status: ${profile.maritalStatus}`);
  if (profile.minority !== undefined) parts.push(`- Minority: ${profile.minority ? 'Yes' : 'No'}`);
  if (profile.bpl !== undefined) parts.push(`- BPL Card: ${profile.bpl ? 'Yes' : 'No'}`);
  if (profile.seniorCitizen !== undefined) parts.push(`- Senior Citizen: ${profile.seniorCitizen ? 'Yes' : 'No'}`);
  
  // Agriculture profile (for farmers)
  if (profile.agricultureProfile) {
    parts.push(`\n**AGRICULTURE PROFILE:**`);
    if (profile.agricultureProfile.farmerType) parts.push(`- Farmer Type: ${profile.agricultureProfile.farmerType.replace(/_/g, ' ')}`);
    if (profile.agricultureProfile.primaryCrop) parts.push(`- Primary Crop: ${profile.agricultureProfile.primaryCrop.replace(/_/g, ' ')}`);
    if (profile.agricultureProfile.documents && profile.agricultureProfile.documents.length > 0) {
      parts.push(`- Documents: ${profile.agricultureProfile.documents.map(d => d.replace(/_/g, ' ')).join(', ')}`);
    }
    if (profile.agricultureProfile.biggestProblem) parts.push(`- Biggest Problem: ${profile.agricultureProfile.biggestProblem.replace(/_/g, ' ')}`);
    if (profile.agricultureProfile.irrigationAccess) parts.push(`- Irrigation: ${profile.agricultureProfile.irrigationAccess.replace(/_/g, ' ')}`);
    if (profile.agricultureProfile.loanStatus) parts.push(`- Loan Status: ${profile.agricultureProfile.loanStatus.replace(/_/g, ' ')}`);
    if (profile.agricultureProfile.specialPractices && profile.agricultureProfile.specialPractices.length > 0) {
      parts.push(`- Special Practices: ${profile.agricultureProfile.specialPractices.map(p => p.replace(/_/g, ' ')).join(', ')}`);
    }
    if (profile.agricultureProfile.sellingChannel) parts.push(`- Selling Channel: ${profile.agricultureProfile.sellingChannel.replace(/_/g, ' ')}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : '(No information collected yet)';
}

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  let selectedLanguageForError = 'en';

  try {
    purgeExpiredSessions();
    
    const body: UnifiedAIRequest = await request.json();
    const {
      userMessage,
      conversationHistory = [],
      sessionId = 'default',
      selectedLanguage = 'en',
    } = body;
    selectedLanguageForError = selectedLanguage;

    if (!userMessage || !userMessage.trim()) {
      const localizedError = await runCanonicalOutputPipeline({
        englishText: 'Please enter your message before sending.',
        targetLanguage: normalizeUserLanguage(selectedLanguage),
      });

      return NextResponse.json(
        { error: localizedError.localizedText },
        { status: 400 }
      );
    }

    const normalizedSelectedLanguage = normalizeUserLanguage(selectedLanguage);
    const quickLocalAnswer = tryAnswerLocally(userMessage.trim(), normalizedSelectedLanguage);
    if (quickLocalAnswer.handled && quickLocalAnswer.response) {
      const localizedQuickAnswer = await runCanonicalOutputPipeline({
        englishText: quickLocalAnswer.response,
        targetLanguage: normalizedSelectedLanguage,
      });

      return NextResponse.json({
        response: localizedQuickAnswer.localizedText,
        engine: quickLocalAnswer.engine || 'Local Quick Response',
        intent: 'local_quick',
        confidence: 1,
        language: normalizedSelectedLanguage,
        canonicalLanguage: 'en',
        cacheHit: false,
      });
    }

    const rawInputHash = hashQuery(userMessage, normalizedSelectedLanguage);
    const rawCached = getCachedResult(rawInputHash);
    if (rawCached) {
      return NextResponse.json({ ...rawCached, cacheHit: true, cacheLayer: 'raw' });
    }

    const canonicalInput = await runCanonicalInputPipeline({
      text: userMessage,
      selectedLanguage,
    });
    const responseLanguage = canonicalInput.responseLanguage;

    // Cache hash — set after normalizedUserMessage is computed
    let qHash: string | null = null;

    const buildLocalizedResponse = async (payload: Record<string, any>) => {
      let localizedResponse = payload.response;
      let translationMeta: Record<string, any> | undefined;

      if (typeof localizedResponse === 'string') {
        const outboundTranslation = await runCanonicalOutputPipeline({
          englishText: localizedResponse,
          targetLanguage: responseLanguage,
        });

        localizedResponse = outboundTranslation.localizedText;

        translationMeta = {
          translated: outboundTranslation.translated,
          cacheHit: outboundTranslation.cacheHit,
          warning: outboundTranslation.warning,
        };
      }

      const jsonBody = {
        ...payload,
        response: localizedResponse,
        language: responseLanguage,
        canonicalLanguage: 'en',
        languageDetection: {
          detectedLanguage: canonicalInput.detectedLanguage,
          confidence: canonicalInput.detectionScore,
        },
        canonicalPipeline: {
          inputTranslated: canonicalInput.inputTranslated,
          inputCacheHit: canonicalInput.inputTranslationCacheHit,
          responseLanguage,
          warning: canonicalInput.warning,
        },
        translation: translationMeta,
      };

      // Cache the result for repeat queries (5 min TTL)
      if (qHash) {
        setCachedResult(qHash, jsonBody);
      }
      setCachedResult(rawInputHash, jsonBody);

      return NextResponse.json(jsonBody);
    };

    const normalizedUserMessage = canonicalInput.englishText?.trim() || userMessage.trim();

    // ── LOCAL ANSWERING: greetings, date, time — skip LLM entirely ──
    const localAnswer = tryAnswerLocally(normalizedUserMessage, responseLanguage);
    if (localAnswer.handled && localAnswer.response) {
      return await buildLocalizedResponse({
        response: localAnswer.response,
        engine: localAnswer.engine || 'Local Quick Response',
        intent: 'local_quick',
        confidence: 1,
      });
    }

    // ── LAYER 1: CAPABILITY ROUTER ──
    // Checks for document follow-up, image follow-up, active learning session.
    // If handled, returns immediately — no need for domain routing.
    const capabilityResult = await routeCapability(normalizedUserMessage, sessionId);
    if (capabilityResult.handled && capabilityResult.response) {
      return await buildLocalizedResponse({
        response: capabilityResult.response,
        engine: `BUAIP ${capabilityResult.capability === 'document_ai' ? 'Document Q&A' : capabilityResult.capability === 'photo_ai' ? 'Photo Intelligence' : capabilityResult.capability === 'learning_ai' ? 'Learning Mode' : 'Capability'}`,
        intent: capabilityResult.capability || 'capability',
        confidence: 0.9,
        ...capabilityResult.meta,
      });
    }

    // ── CACHE CHECK ──
    qHash = hashQuery(normalizedUserMessage, responseLanguage);
    const cached = getCachedResult(qHash);
    if (cached) {
      return NextResponse.json({ ...cached, cacheHit: true });
    }

    // ── PARALLEL: fact resolution + vector facts lookup ──
    const [factualResult, factsContext, webContext] = await Promise.all([
      resolveDeterministicFactQuery(normalizedUserMessage),
      getFactsContextForQuery(normalizedUserMessage),
      getLiveWebContextForQuery(normalizedUserMessage),
    ]);

    const hasWebContext = Boolean(webContext.summary);
    const shouldBypassUnavailableRealtime =
      factualResult.factType === 'unavailable_realtime' && hasWebContext;

    if (factualResult.handled && factualResult.response && !shouldBypassUnavailableRealtime) {
      const resp = await buildLocalizedResponse({
        response: factualResult.response,
        engine: 'Real-Time Fact Engine',
        intent: 'factual_query',
        confidence: 1,
        factType: factualResult.factType,
      });
      return resp;
    }

    const factsPromptContext = factsContext.summary
      ? `\n\nVERIFIED FACT CONTEXT (Vector Retrieval):\n${factsContext.summary}`
      : '';

    const liveWebPromptContext = webContext.summary
      ? `\n\nLIVE WEB CONTEXT (Web Lookup):\n${webContext.summary}`
      : '';

    // ========================================================================
    // PRIMARY ARCHITECTURE: Super Router -> Engine(s) -> LLM Reasoning ->
    // Structured Response Generator
    // ========================================================================
    const superSession = getOrCreateSession(sessionId);
    extractProfileInfo(normalizedUserMessage, superSession.profile);
    applyInferenceRules(superSession.profile);
    superSession.conversationSummary.push(`User: ${userMessage}`);

    try {
      const superResult = await runSuperRouter({
        userMessage: normalizedUserMessage,
        origin: request.nextUrl.origin,
        conversationHistory,
        profileSummary: `${formatProfileForAI(superSession.profile)}${factsPromptContext}${liveWebPromptContext}`,
        // Language context for multilingual support with override capability
        selectedLanguage: canonicalInput.requestedLanguage,
        responseLanguage: canonicalInput.responseLanguage,
        hasLanguageOverride: canonicalInput.hasLanguageOverride,
        languageContext: canonicalInput.languageContext,
      });

      superSession.conversationSummary.push(`Assistant: ${superResult.response}`);
      superSession.updatedAt = Date.now();

      return await buildLocalizedResponse({
        response: superResult.response,
        engine: 'BUAIP Unified Intelligence',
        intent: superResult.intent,
        confidence: superResult.confidence,
        intentConfidence: superResult.intentConfidence,
        aiConfidenceScore: 1,
        routedDomains: superResult.routedDomains,
        profile: superSession.profile,
      });
    } catch (superRouterError: any) {
      console.error('[Super Router Error]', superRouterError);
      return await buildLocalizedResponse({
        response: `## Understanding the Question\n\nYou asked about: "${userMessage}"\n\n## Current Limitation\n\nI encountered a temporary issue while processing your request. This is NOT because the information is unavailable.\n\n## What You Can Do\n\n- **Try again** — the issue is usually temporary and resolves within seconds.\n- **Rephrase your question** with more specific details.\n- **Break your question into parts** if it covers multiple topics.\n\nI apologize for the inconvenience.`,
        engine: 'BUAIP Unified Intelligence',
        intent: 'error_recovery',
        confidence: 0,
        error: superRouterError?.message,
      });
    }
    
  } catch (error: any) {
    console.error('Unified AI Error:', error);

    const normalizedErrorLanguage = normalizeUserLanguage(selectedLanguageForError);
    let localizedErrorMessage = error?.message || 'Internal server error';

    try {
      const localizedError = await runCanonicalOutputPipeline({
        englishText: 'Something went wrong while processing your request. Please try again.',
        targetLanguage: normalizedErrorLanguage,
      });
      localizedErrorMessage = localizedError.localizedText;
    } catch (translationError) {
      console.error('[Unified AI] Failed to localize error response:', translationError);
    }

    return NextResponse.json(
      { error: localizedErrorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET handler for debugging
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');
  
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      return NextResponse.json({
        profile: session.profile,
        conversationSummary: session.conversationSummary,
        updatedAt: new Date(session.updatedAt).toISOString(),
      });
    }
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    activeSessions: sessions.size,
    message: 'Unified AI endpoint is active',
  });
}

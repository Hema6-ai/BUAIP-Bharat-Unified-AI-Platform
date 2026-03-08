// Citizen Profile Data Model
export interface CitizenProfile {
  // Personal Info
  age?: number | string; // Can be age group like "26-40"
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  state?: string;
  district?: string;
  areaType?: 'rural' | 'urban' | 'semi-urban';

  // Social Category
  socialCategory?: 'general' | 'obc' | 'sc' | 'st' | 'ews' | 'minority' | 'prefer_not_to_say';

  // Occupation
  occupation?: 'farmer' | 'student' | 'entrepreneur' | 'worker' | 'self_employed' | 'govt_employee' | 'unemployed' | 'senior_citizen' | 'other';

  // Income
  annualHouseholdIncome?: number; // in INR
  bplStatus?: 'bpl' | 'apl' | 'not_sure';

  // Education
  educationLevel?: 'no_formal' | 'school' | 'college' | 'graduate' | 'postgraduate';

  // Land Ownership (critical for farmer schemes)
  landOwnership?: 'owns_land' | 'owns_house' | 'owns_both' | 'owns_neither' | 'tenant_farmer' | 'landless' | 'not_applicable';
  landArea?: number; // in acres/hectares

  // Conversational Flow Fields
  disability?: boolean;
  maritalStatus?: 'single' | 'married' | 'widowed' | 'divorced' | 'prefer_not_to_say';

  // Special Conditions
  specialConditions?: {
    disability?: boolean;
    widow?: boolean;
    singleParent?: boolean;
    veteran?: boolean;
    artisan?: boolean;
    smallBusinessOwner?: boolean;
  };

  // Business Stage (for entrepreneurs)
  businessStage?: 'idea' | 'startup' | 'existing' | 'msme';

  // Deep Agriculture Profile (for farmers)
  agricultureProfile?: {
    farmerType?: 'landless_labourer' | 'small_marginal' | 'medium_farmer' | 'large_farmer' | 'tenant_sharecropper' | 'tribal_forest_farmer';
    primaryCrop?: 'food_grains' | 'pulses' | 'oilseeds' | 'cash_crops' | 'horticulture' | 'spices' | 'plantation' | 'mixed_farming';
    documents?: string[]; // e.g., ['kisan_credit_card', 'pm_kisan_registered', 'soil_health_card', 'land_records', 'aadhaar_linked_bank']
    biggestProblem?: 'no_money_seeds' | 'crop_damaged' | 'no_irrigation' | 'low_price' | 'no_storage' | 'loan_debt' | 'need_equipment' | 'want_new_crop';
    irrigationAccess?: 'fully_irrigated' | 'partially_irrigated' | 'rain_dependent' | 'no_water_access';
    loanStatus?: 'bank_loan_repaying' | 'moneylender_loan' | 'no_loan' | 'previous_loan_waived';
    specialPractices?: string[]; // e.g., ['organic_farming', 'natural_farming', 'drip_irrigation', 'greenhouse', 'fish_farming', 'animal_husbandry', 'beekeeping']
    sellingChannel?: 'government_apmc' | 'private_traders' | 'direct_consumers' | 'export' | 'self_consumption';
  };
}

// Scheme Database Model
export interface Scheme {
  schemeId: string;
  schemeName: string;
  description: string;
  state: string | 'all_india'; // 'all_india' means available across all states
  targetGroup: string[];
  minAge?: number;
  maxAge?: number;
  incomeLimit?: number; // annual household income in INR
  eligibleCategories: string[];
  eligibleOccupations: string[];
  benefits: string[];
  filesRequired: string[];
  applicationLink: string;
  applicationMode: 'online' | 'offline' | 'both';
  deadline?: string;
  department: string;
  lastUpdated: string;
}

// Eligibility Result
export interface EligibilityResult {
  schemeId: string;
  schemeName: string;
  isEligible: boolean;
  eligibilityScore: number; // 0-100, 100 = perfect match
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  benefits: string[];
  filesRequired: string[];
  applicationLink: string;
  applicationMode: string;
  explanation: string; // AI-generated explanation
}

// Eligibility Analysis Response
export interface EligibilityAnalysis {
  userId: string;
  profileSummary: Partial<CitizenProfile>;
  totalSchemesAnalyzed: number;
  eligibleSchemes: EligibilityResult[];
  partiallyEligibleSchemes: EligibilityResult[]; // 50-99% match
  nextSteps: string[];
  applicationPriority: EligibilityResult[]; // Ranked by benefit/effort
  timestamp: string;
}

// Scheme Database Query Filters
export interface SchemeFilter {
  state?: string;
  minAge?: number;
  maxAge?: number;
  occupation?: string;
  minIncome?: number;
  maxIncome?: number;
  category?: string;
  searchQuery?: string;
}

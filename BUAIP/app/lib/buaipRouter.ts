/**
 * BUAIP AI Router
 * 
 * Central intelligent routing system that analyzes user queries and routes them
 * to the appropriate specialized engine:
 * 
 * - Scheme Eligibility (unified-ai)
 * - Agriculture/Farming (annadata-ai)
 * - India Insider Tourist Engines
 */

import { TouristProfile } from './indiaInsiderTypes';

type RouterEngineIntent =
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
  | 'career_intelligence'
  | 'general_query';

interface RouterIntentAnalysis {
  primaryIntent: RouterEngineIntent;
  confidence: number;
  secondaryIntents: RouterEngineIntent[];
  extractedEntities: {
    location?: string;
    nationality?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeframe?: string;
    legalCategory?: string;
    userGoal?: string;
    documentLanguage?: string;
  };
  // Legacy aliases kept for compatibility with older consumers.
  entities?: {
    location?: string;
    nationality?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeframe?: string;
  };
  alternateIntents?: Array<{ intent: RouterEngineIntent; confidence: number }>;
}

// ============================================================================
// LEGAL CATEGORY DETECTION
// ============================================================================

export function detectLegalCategory(situation: string): string {
  const s = situation.toLowerCase();
  
  // Tenant/Rental Rights
  if (s.includes('landlord') || s.includes('rent') || s.includes('evict') ||
      s.includes('tenant') || s.includes('locked out') || s.includes('security deposit') ||
      s.includes('rental agreement') || s.includes('kiraya')) {
    return 'TENANT_RIGHTS';
  }
  
  // Labour/Employment Rights
  if (s.includes('salary') || s.includes('job') || s.includes('fired') ||
      s.includes('dismissed') || s.includes('termination') || s.includes('unpaid wages') ||
      s.includes('gratuity') || s.includes('provident fund') || s.includes('naukri')) {
    return 'LABOUR_RIGHTS';
  }
  
  // Land/Property Disputes
  if (s.includes('land') || s.includes('property') || s.includes('plot') ||
      s.includes('encroachment') || s.includes('patta') || s.includes('boundary') ||
      s.includes('title dispute') || s.includes('zameen')) {
    return 'LAND_DISPUTE';
  }
  
  // Criminal/Police Matters
  if (s.includes('police') || s.includes('fir') || s.includes('arrest') ||
      s.includes('bail') || s.includes('summons') || s.includes('criminal')) {
    return 'CRIMINAL_RIGHTS';
  }
  
  // Domestic Violence/Family Law
  if (s.includes('domestic') || s.includes('dowry') || s.includes('violence') ||
      s.includes('divorce') || s.includes('custody') || s.includes('maintenance') ||
      s.includes('alimony') || s.includes('harassment')) {
    return 'DOMESTIC_VIOLENCE';
  }
  
  // Consumer Rights
  if (s.includes('consumer') || s.includes('refund') || s.includes('defective') ||
      s.includes('fraud') || s.includes('cheated') || s.includes('scam') ||
      s.includes('warranty') || s.includes('consumer forum')) {
    return 'CONSUMER_RIGHTS';
  }
  
  // RTI/Government Information
  if (s.includes('rti') || s.includes('right to information') || 
      s.includes('government information')) {
    return 'RTI_RIGHTS';
  }
  
  // General Legal
  return 'GENERAL_LEGAL';
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

export function detectIntent(query: string, profile?: TouristProfile): RouterIntentAnalysis {
  const lowerQuery = query.toLowerCase();
  
  // Confidence scoring: 0.0 - 1.0
  let detectedIntent: RouterEngineIntent = 'general_query';
  let confidence = 0.0;
  const extractedEntities: {
    location?: string;
    nationality?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    timeframe?: string;
    legalCategory?: string;
    userGoal?: string;
    documentLanguage?: string;
  } = {};
  const secondaryIntents: RouterEngineIntent[] = [];
  
  // Track all detected intents to pick the highest confidence
  const detectedIntents: Array<{ intent: RouterEngineIntent; confidence: number }> = [];

  // -------------------------------------------------------------------------
  // 1. SCHEME ELIGIBILITY INTENT
  // -------------------------------------------------------------------------
  const schemeKeywords = [
    'scheme', 'yojana', 'benefit', 'subsidy', 'eligible', 'eligibility',
    'government program', 'social welfare', 'pension', 'scholarship',
    'ration card', 'health insurance', 'pm-kisan', 'ujjwala'
  ];
  
  // Check for scheme keywords - boost confidence if multiple scheme terms found
  let schemeMatches = 0;
  const hasSchemeKeyword = schemeKeywords.some(kw => {
    if (lowerQuery.includes(kw)) {
      schemeMatches++;
      return true;
    }
    return false;
  });
  
  if (hasSchemeKeyword) {
    let schemeConfidence = 0.85;
    // Boost confidence significantly if multiple scheme indicators
    if (schemeMatches >= 2 || lowerQuery.includes('pm-kisan') || lowerQuery.includes('yojana') || lowerQuery.includes('scheme')) {
      schemeConfidence = 0.95; // Very high confidence for explicit schemes
    }
    detectedIntents.push({ intent: 'scheme_eligibility', confidence: schemeConfidence });
  }

  // -------------------------------------------------------------------------
  // 2. AGRICULTURE/FARMING INTENT
  // -------------------------------------------------------------------------
  const farmingKeywords = [
    // Core farming terms (specific to farming, not general)
    'farming', 'farmer', 'crop', 'agriculture', 'harvest',
    'mandi', 'kisan credit card', 'kcc', 'fasal bima', 'farm loan', 'crop insurance',
    // A1: Crop Advisor keywords
    'which crop', 'best crop', 'crop suggestion', 'what to grow', 'crop planning', 'suitable crop', 'profitable crop',
    // A2: Mandi Price keywords (VERY specific to agriculture)
    'mandi price', 'msp price', 'market price for crops',
    // A3: Weather in farming context
    'weather for farm', 'weather for crop', 'rain forecast for farm', 'drought forecast',
    // A4: Disease keywords (in farming context)
    'crop disease', 'crop damage', 'leaf spot', 'fungal disease', 'pest attack', 'insect attack plant', 'plant doctor',
    // A5: Seeds & Fertilizer keywords
    'seed', 'fertilizer', 'urea', 'dap', 'npk', 'manure', 'compost', 'pesticide',
    // A6: Soil Health keywords
    'soil health', 'soil test', 'soil type', 'nutrient deficiency',
    // A7: Irrigation keywords
    'irrigation', 'watering', 'drip irrigation', 'sprinkler',
    // A9: Smart Selling keywords
    'when to sell crop', 'storage of crops', 'best time to sell harvest'
  ];
  
  // Check for agriculture keywords - boost confidence if multiple farming terms found
  let agricultureMatches = 0;
  if (farmingKeywords.some(kw => {
    if (lowerQuery.includes(kw)) {
      agricultureMatches++;
      return true;
    }
    return false;
  })) {
    let agricultureConfidence = 0.88;
    // Boost confidence if multiple agriculture indicators
    if (agricultureMatches >= 2 || lowerQuery.includes('mandi') || lowerQuery.includes('crop')) {
      agricultureConfidence = 0.93; // High confidence for farming
    }
    detectedIntents.push({ intent: 'agriculture_farming', confidence: agricultureConfidence });
  }

  // -------------------------------------------------------------------------
  // 2b. GLOBAL SELLER INTELLIGENCE INTENT
  // -------------------------------------------------------------------------
  const globalSellerKeywords = [
    // E-commerce platforms (MUST HAVE ONE OF THESE core terms)
    'sell', 'seller', 'selling', 'marketplace', 'amazon', 'flipkart', 'meesho', 'jiomart', 'snapdeal',
    'amazon.in', 'amazon seller', 'amazon marketplace', 'fba', 'fbm', 'fulfillment',
    // Supply chain & sourcing
    'supplier', 'sourcing', 'manufacturer', 'manufacturing', 'production', 'factory',
    'indiamart', 'tradeindia', 'udaan', 'wholesale', 'b2b',
    // Pricing & strategy
    'pricing', 'pricing strategy', 'commission', 'margin', 'profit', 'pricing model',
    'competitive pricing', 'repricing', 'demand forecast', 'inventory planning',
    // Compliance & regulations
    'gst', 'hsn', 'hsn code', 'tax compliance', 'fssai', 'bis', 'isi',
    'seller registration', 'license', 'certification', 'seller policy',
    // Logistics & operations (SPECIFIC TO E-COMMERCE)
    'logistics cost', 'shipping cost', 'delivery cost', 'logistics provider',
    'logistics', 'shipping', 'delivery', 'courier', 'delhivery', 'shiprocket',
    'ekart', 'blue dart', 'dtdc', 'cod', 'cash on delivery', 'rto', 'return management',
    // Commerce intelligence
    'supply chain', 'cross border', 'global selling', 'export', 'international selling',
    'festival demand', 'festival season', 'market expansion', 'launch strategy',
    // Platform operations
    'listing', 'product listing', 'review', 'rating', 'fake review', 'account health',
    'suspension', 'appeal', 'violation', 'poa', 'plan of action'
  ];

  // Trigger GlobalSeller if core commerce keyword found.
  // Block this when consumer/legal dispute context is present.
  const coreCommerceKeywords = ['sell', 'seller', 'marketplace', 'amazon', 'flipkart', 'meesho', 'supplier', 'manufacturer', 'gst', 'hsn', 'logistics', 'shipping', 'delivery', 'inventory planning', 'pricing', 'export', 'import', 'international'];
  const hasCoreCommerceKeyword = coreCommerceKeywords.some(kw => lowerQuery.includes(kw));
  const hasConsumerLegalContext = [
    'consumer complaint', 'refund denied', 'defective product', 'cheated',
    'fraud', 'scam', 'legal notice', 'court', 'lawyer', 'rights violation'
  ].some(kw => lowerQuery.includes(kw));
  
  if (hasCoreCommerceKeyword && !hasConsumerLegalContext) {
    detectedIntents.push({ intent: 'global_seller_intelligence', confidence: 0.93 });
  }

  // -------------------------------------------------------------------------
  // 3. PRE-ARRIVAL PLANNER INTENT
  // -------------------------------------------------------------------------
  const preArrivalKeywords = [
    'visa', 'before arrival', 'preparation', 'vaccin', 'insurance',
    'packing', 'sim card', 'currency', 'customs', 'airport', 'arriving',
    // Trip planning keywords
    'trip', 'tour', 'itinerary', 'plan', 'visit', 'travel', 'vacation',
    'holiday', 'journey', 'budget', 'days', 'week', 'family trip'
  ];
  
  if (preArrivalKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'pre_arrival_planning', confidence: 0.90 });
    
    // Extract nationality if mentioned
    const nationalityMatches = lowerQuery.match(/from ([\w\s]+)/);
    if (nationalityMatches) extractedEntities.nationality = nationalityMatches[1];
  }

  // -------------------------------------------------------------------------
  // 4. CITY NAVIGATOR INTENT
  // -------------------------------------------------------------------------
  const cities = [
    'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
    'jaipur', 'goa', 'kerala', 'agra', 'varanasi', 'udaipur', 'pune'
  ];
  
  const cityNavigationKeywords = [
    'what to see', 'places to visit', 'attractions', 'sightseeing',
    'transport', 'metro', 'taxi', 'getting around', 'neighborhood',
    'where to stay', 'scam', 'safety', 'things to do'
  ];
  
  const mentionsCity = cities.some(city => lowerQuery.includes(city));
  const mentionsNavigation = cityNavigationKeywords.some(kw => lowerQuery.includes(kw));
  
  if (mentionsCity && mentionsNavigation) {
    detectedIntents.push({ intent: 'city_navigation', confidence: 0.90 });
    
    // Extract city
    extractedEntities.location = cities.find(city => lowerQuery.includes(city)) || '';
  } else if (mentionsCity || mentionsNavigation) {
    detectedIntents.push({ intent: 'city_navigation', confidence: 0.75 });
  }

  // -------------------------------------------------------------------------
  // 5. PAYMENT & MONEY INTENT
  // -------------------------------------------------------------------------
  const paymentKeywords = [
    'upi', 'payment', 'money', 'atm', 'cash', 'card', 'currency',
    'exchange', 'bank', 'rupee', 'paytm', 'google pay', 'phonepe'
  ];
  
  if (paymentKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'payment_money', confidence: 0.90 });
  }

  // -------------------------------------------------------------------------
  // 6. EMERGENCY ASSISTANCE INTENT
  // -------------------------------------------------------------------------
  const emergencyKeywords = [
    'emergency', 'urgent', 'lost', 'stolen', 'passport',
    'police', 'hospital', 'ambulance', 'sick', 'injured', 'robbed',
    'assault', 'scammed', 'accident'
  ];
  
  const helpKeyword = lowerQuery.includes('help');
  const hasRealEmergency = emergencyKeywords.some(kw => lowerQuery.includes(kw));
  
  // Only trigger emergency if there's a real emergency word, not just "help"
  // "help" alone might be asking for assistance/guidance (schemes, career, etc.)
  if (hasRealEmergency) {
    detectedIntents.push({ intent: 'emergency_assistance', confidence: 0.98 });
    extractedEntities.urgency = 'critical';
    
    // Extract location if mentioned
    const locationMatch = lowerQuery.match(/in (delhi|mumbai|bangalore|chennai|kolkata|hyderabad|jaipur|goa)/i);
    if (locationMatch) extractedEntities.location = locationMatch[1];
  } else if (helpKeyword && detectedIntents.length === 0) {
    // If only "help" and no other intent detected yet, mark as low-priority emergency
    detectedIntents.push({ intent: 'emergency_assistance', confidence: 0.70 });
  }

  // -------------------------------------------------------------------------
  // 7. FOOD SAFETY INTENT (SPECIFIC - avoid farming context)
  // -------------------------------------------------------------------------
  // Make Food Safety keywords VERY specific to avoid triggering on farming queries
  const foodSafetyKeywords = [
    'food poisoning', 'restaurant', 'street food', 'hygiene', 'meal preparation',
    'eating in india', 'safe to eat', 'food safety', 'meal', 'dining',
    'cooking', 'kitchen', 'halal', 'kosher', 'vegetarian meal', 'vegan meal'
  ];
  
  // Only trigger food safety if:
  // 1. Has food safety keyword AND
  // 2. Does NOT have farming/agriculture keywords
  const isFarmingContext = farmingKeywords.some(kw => lowerQuery.includes(kw));
  
  if (!isFarmingContext && foodSafetyKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'food_safety', confidence: 0.90 });
  }

  // -------------------------------------------------------------------------
  // 8. EXPAT LONGSTAY INTENT
  // -------------------------------------------------------------------------
  const expatKeywords = [
    'moving to india', 'living in india', 'long stay', 'expat',
    'frro', 'residence', 'renting', 'apartment', 'bank account',
    'working in india', 'employment visa', 'long term'
  ];
  
  if (expatKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'expat_longstay', confidence: 0.90 });
  }

  // -------------------------------------------------------------------------
  // 9. LANGUAGE SURVIVAL INTENT
  // -------------------------------------------------------------------------
  const languageKeywords = [
    'hindi', 'language', 'phrase', 'translation', 'how do you say',
    'speak', 'learn', 'tamil', 'telugu', 'bengali', 'local language'
  ];
  
  if (languageKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'language_survival', confidence: 0.90 });
  }

  // -------------------------------------------------------------------------
  // 10. LEGAL RIGHTS INTENT (Nyay AI - Legal Intelligence)
  // -------------------------------------------------------------------------
  const legalRightsKeywords = [
    // Core legal terms
    'legal', 'law', 'rights', 'court', 'judge', 'lawyer', 'advocate',
    'complaint', 'fir', 'police', 'arrest', 'bail', 'notice', 'summons',
    // Tenant rights
    'landlord', 'tenant', 'rent', 'eviction', 'evicted', 'locked out',
    'rental agreement', 'security deposit', 'rent increase',
    // Labour rights
    'salary not paid', 'fired', 'dismissed', 'job termination',
    'labour dispute', 'employment issue', 'wrongful termination',
    'workplace harassment', 'unpaid wages', 'gratuity', 'provident fund',
    // Consumer rights
    'cheated', 'fraud', 'scam', 'consumer complaint', 'refund denied',
    'defective product', 'warranty', 'consumer forum', 'consumer protection',
    // Property/Land
    'land dispute', 'property dispute', 'plot', 'encroachment', 'patta',
    'property registration', 'title dispute', 'boundary dispute',
    // Domestic/Family
    'domestic violence', 'dowry', 'harassment', 'threatened',
    'divorce', 'custody', 'maintenance', 'alimony',
    // Government rights
    'rti', 'right to information', 'government information request',
    'human rights', 'constitutional rights', 'fundamental rights',
    'legal aid', 'free lawyer', 'legal services authority',
    // Hindi triggers
    'kanoon', 'adhikar', 'nyay', 'vakil', 'muqadma',
    'shikayat', 'zameen', 'kiraya', 'naukri', 'insaaf'
  ];
  
  // Check for legal rights keywords
  let legalMatches = 0;
  const hasLegalKeyword = legalRightsKeywords.some(kw => {
    if (lowerQuery.includes(kw)) {
      legalMatches++;
      return true;
    }
    return false;
  });
  
  if (hasLegalKeyword) {
    // Detect legal category
    const legalCategory = detectLegalCategory(lowerQuery);
    extractedEntities.legalCategory = legalCategory;

    // Prioritize Nyay AI for legal matters, including legal emergencies.
    // This keeps domestic violence/FIR/tenant-rights cases in Nyay flow.
    let legalConfidence = 0.94;
    if (legalMatches >= 2 || lowerQuery.includes('fir') || lowerQuery.includes('lawyer') ||
        lowerQuery.includes('court') || lowerQuery.includes('complaint') ||
        lowerQuery.includes('landlord') || lowerQuery.includes('fired') ||
        lowerQuery.includes('cheated') || lowerQuery.includes('rights')) {
      legalConfidence = 0.96;
    }
    if (legalCategory === 'DOMESTIC_VIOLENCE' || legalCategory === 'CRIMINAL_RIGHTS') {
      legalConfidence = 0.99;
    }
    detectedIntents.push({ intent: 'legal_rights', confidence: legalConfidence });
    
    // Detect urgency from query
    if (lowerQuery.includes('emergency') || lowerQuery.includes('urgent') || 
        lowerQuery.includes('arrest') || lowerQuery.includes('threat') ||
        lowerQuery.includes('violence') || lowerQuery.includes('locked out')) {
      extractedEntities.urgency = 'critical';
    } else if (lowerQuery.includes('soon') || lowerQuery.includes('this week') ||
               lowerQuery.includes('immediate')) {
      extractedEntities.urgency = 'high';
    }
  }

  // -------------------------------------------------------------------------
  // 11. LEGAL & CULTURAL INTENT (Tourist context - LOW PRIORITY)
  // -------------------------------------------------------------------------
  const legalCulturalKeywords = [
    'culture', 'etiquette', 'custom', 'tradition', 'dress code', 
    'temple', 'mosque', 'allowed', 'forbidden', 'prohibited', 
    'can i bring', 'can i wear', 'is it okay'
  ];
  
  // Only trigger if NOT a scheme query or legal rights query
  const isSchemeQuery = lowerQuery.includes('scheme') || lowerQuery.includes('yojana') || lowerQuery.includes('benefit') || lowerQuery.includes('subsidy');
  const isLegalRightsQuery = hasLegalKeyword;
  
  if (!isSchemeQuery && !isLegalRightsQuery && legalCulturalKeywords.some(kw => lowerQuery.includes(kw))) {
    detectedIntents.push({ intent: 'legal_cultural', confidence: 0.80 });
  }

  // -------------------------------------------------------------------------
  // 12. CAREER INTELLIGENCE INTENT (PathAI - Career Guidance)
  // -------------------------------------------------------------------------
  const careerKeywords = [
    // Core career terms
    'career', 'future', 'what to do', 'after 12th', 'after graduation',
    'course', 'college', 'admission', 'engineering', 'mba', 'upsc',
    'government job', 'skill', 'roadmap', 'guidance', 'confused',
    'job', 'career path', 'profession', 'degree', 'diploma', 'study',
    'career guidance', 'career options', 'career advice',
    // Specific queries
    'which course', 'which college', 'what should i study',
    'best career', 'career for me', 'engineering or mba',
    'confused about career', 'confused about future',
    'how to become', 'path to', 'roadmap to',
    'after btech', 'after bsc', 'after bcom',
    'placement', 'salary expectations', 'job prospects',
    'skill development', 'upskilling', 'reskilling',
    'career change', 'career switch', 'transition',
    // Hindi triggers
    'career kya karu', '12 ke baad kya', '12 ke baad kya kare',
    'naukri kaise mile', 'bhavishya', 'padhai kya karu',
    'course kya lu', 'career confusion', 'career help'
  ];
  
  // Check for career keywords
  let careerMatches = 0;
  const hasCareerKeyword = careerKeywords.some(kw => {
    if (lowerQuery.includes(kw)) {
      careerMatches++;
      return true;
    }
    return false;
  });
  
  if (hasCareerKeyword) {
    // Avoid false positives with other intents
    const isAgricultureContext = farmingKeywords.some(kw => lowerQuery.includes(kw));
    const isCommerceContext = lowerQuery.includes('sell') || lowerQuery.includes('business plan') || lowerQuery.includes('amazon');
    
    if (!isAgricultureContext && !isCommerceContext) {
      let careerConfidence = 0.88;
      
      // Boost confidence for explicit career guidance queries
      if (careerMatches >= 2 || 
          lowerQuery.includes('career guidance') || 
          lowerQuery.includes('after 12th') || 
          lowerQuery.includes('career options') ||
          lowerQuery.includes('confused about career') ||
          lowerQuery.includes('what to do')) {
        careerConfidence = 0.94;
      }
      
      detectedIntents.push({ intent: 'career_intelligence', confidence: careerConfidence });
    }
  }

  // -------------------------------------------------------------------------
  // PICK HIGHEST CONFIDENCE INTENT
  // -------------------------------------------------------------------------
  if (detectedIntents.length > 0) {
    // Sort by confidence (highest first)
    detectedIntents.sort((a, b) => b.confidence - a.confidence);
    detectedIntent = detectedIntents[0].intent;
    confidence = detectedIntents[0].confidence;
    
    // Add secondary intents if they're close in confidence (within 0.1)
    for (let i = 1; i < detectedIntents.length; i++) {
      if (detectedIntents[0].confidence - detectedIntents[i].confidence <= 0.1) {
        secondaryIntents.push(detectedIntents[i].intent);
      }
    }
  }

  // -------------------------------------------------------------------------
  // RETURN ANALYSIS
  // -------------------------------------------------------------------------
  return {
    primaryIntent: detectedIntent,
    confidence,
    extractedEntities,
    secondaryIntents,
    entities: extractedEntities,
    alternateIntents: secondaryIntents.map((intent) => ({
      intent,
      confidence: Math.max(0.1, Number((1 - confidence).toFixed(2)))
    }))
  };
}

// ============================================================================
// ROUTER FUNCTION
// ============================================================================

export interface RouteResult {
  engine: string;
  endpoint: string;
  intent: RouterEngineIntent;
  confidence: number;
  reasoning: string;
}

export function routeQuery(
  query: string,
  profile?: TouristProfile
): RouteResult {
  
  const analysis = detectIntent(query, profile);
  
  // Map intent to engine
  const engineMap: Record<RouterEngineIntent, { engine: string; endpoint: string }> = {
    scheme_eligibility: {
      engine: 'Unified AI (Scheme Eligibility)',
      endpoint: '/api/unified-ai'
    },
    agriculture_farming: {
      engine: 'Annadata AI (Kisan Farming)',
      endpoint: '/api/annadata-ai'
    },
    global_seller_intelligence: {
      engine: 'GlobalSellerEngine',
      endpoint: '/api/globalseller-engine'
    },
    pre_arrival_planning: {
      engine: 'Pre-Arrival Planner',
      endpoint: '/api/india-insider-prearival'
    },
    pre_arrival: {
      engine: 'Pre-Arrival Planner',
      endpoint: '/api/india-insider-prearival'
    },
    city_navigation: {
      engine: 'City Navigator',
      endpoint: '/api/india-insider-citynavigator'
    },
    payment_money: {
      engine: 'Payment & Money Expert',
      endpoint: '/api/india-insider-payment'
    },
    emergency_assistance: {
      engine: 'Emergency Assistant',
      endpoint: '/api/india-insider-emergency'
    },
    food_safety: {
      engine: 'Food Safety Expert',
      endpoint: '/api/india-insider-foodsafety'
    },
    expat_longstay: {
      engine: 'Expat Longstay Specialist',
      endpoint: '/api/india-insider-expat'
    },
    language_survival: {
      engine: 'Language Survival Teacher',
      endpoint: '/api/india-insider-language'
    },
    legal_cultural: {
      engine: 'Legal & Cultural Expert',
      endpoint: '/api/india-insider-legal'
    },
    legal_rights: {
      engine: 'Nyay AI (Legal Rights Intelligence)',
      endpoint: '/api/nyay-ai'
    },
    career_intelligence: {
      engine: 'PathAI (Career Intelligence)',
      endpoint: '/api/pathai'
    },
    general_query: {
      engine: 'General BUAIP Assistant',
      endpoint: '/api/buaip-general'
    }
  };

  const route = engineMap[analysis.primaryIntent];

  // Build reasoning
  let reasoning = `Intent: ${analysis.primaryIntent} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`;
  if (Object.keys(analysis.extractedEntities).length > 0) {
    reasoning += `\nExtracted: ${JSON.stringify(analysis.extractedEntities)}`;
  }
  if (analysis.confidence < 0.75) {
    reasoning += `\nLow confidence - may need clarification`;
  }

  return {
    engine: route.engine,
    endpoint: route.endpoint,
    intent: analysis.primaryIntent,
    confidence: analysis.confidence,
    reasoning
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  detectIntent,
  routeQuery
};

/**
 * India Insider - Pre-Arrival Planner Engine
 * 
 * Helps international visitors prepare for their India trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildPreArrivalPrompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, PreArrivalPlan, VisaRequirement } from '@/app/lib/indiaInsiderTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PreArrivalRequest {
  query: string;
  profile: TouristProfile;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PreArrivalRequest;
    const { query, profile } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Build system prompt
    const systemPrompt = buildPreArrivalPrompt(profile);

    // Call Bedrock AI
    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.4, maxTokens: 2000 }
    );

    // Parse pre-arrival plan
    const preArrivalPlan = parsePreArrivalResponse(aiResponse, profile);

    return NextResponse.json({
      success: true,
      engine: 'pre_arrival_planner',
      response: aiResponse,
      preArrivalPlan,
      profile
    });

  } catch (error) {
    console.error('[Pre-Arrival Planner] Error:', error);
    return NextResponse.json(
      {
        error: 'Pre-arrival planner error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PRE-ARRIVAL RESPONSE PARSER
// ============================================================================

function parsePreArrivalResponse(
  response: string,
  profile: TouristProfile
): PreArrivalPlan {
  
  // Extract visa info
  const visaInfo = parseVisaInfo(response, profile.nationality);

  // Extract vaccinations
  const vaccinations = parseVaccinations(response);

  // Extract packing
  const packing = parsePackingList(response);

  // Extract currency
  const currency = parseCurrencyAdvice(response);

  // Extract SIM card
  const simCard = parseSimCard(response);

  // Extract customs
  const customsRules = parseCustomsInfo(response);

  // Extract insurance and airport info
  const insurance = 'International travel insurance required (medical emergencies, trip cancellation, lost luggage)';
  const airportInfo = 'Airport arrival: Immigration → Baggage → Customs → Exit. Exchange small amount of currency, buy SIM card, book prepaid taxi';

  return {
    visaInfo,
    vaccination: vaccinations.required.concat(vaccinations.recommended),
    insurance,
    currency,
    simCard,
    packing: packing.essentials.concat(packing.clothing, packing.medical, packing.electronics),
    airportInfo,
    customsRules: customsRules.allowed.concat(customsRules.prohibited)
  };
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

function parseVisaInfo(response: string, nationality?: string): VisaRequirement {
  // Default visa info
  return {
    visaType: nationality ? getVisaTypeForNationality(nationality) : 'e-Visa',
    required: true,
    process: [
      'Apply online at official portal',
      'Upload passport and photo',
      'Pay visa fee',
      'Receive approval by email'
    ],
    documents: [
      'Passport valid for 6+ months',
      'Recent passport-size photo',
      'Return flight ticket',
      'Hotel booking confirmation',
      'Sufficient funds proof',
      'Email address for e-Visa'
    ],
    cost: '$10-100 (depends on visa type and nationality)',
    processingTime: '3-5 business days',
    url: 'https://indianvisaonline.gov.in'
  };
}

function getVisaTypeForNationality(nationality: string): string {
  const eVisaCountries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan'];
  
  if (eVisaCountries.some(c => nationality.toUpperCase().includes(c))) {
    return 'e-Visa (Tourist/Business)';
  }
  
  return 'Check embassy for visa requirements';
}

function parseVaccinations(response: string): {
  required: string[];
  recommended: string[];
} {
  return {
    required: [
      'Yellow Fever (if coming from endemic countries: Africa, South America)'
    ],
    recommended: [
      'Hepatitis A and B',
      'Typhoid',
      'Tetanus',
      'Rabies (for rural/wildlife areas)',
      'Japanese Encephalitis (for rural areas)',
      'COVID-19 (check latest requirements)'
    ]
  };
}

function parseSimCard(response: string): string {
  return 'Airtel, Jio, or Vi SIM at airport (₹300-1000). Need passport + visa. Activation takes 24 hours. Get plan with 1-3 GB/day data.';
}

function parsePackingList(response: string): {
  essentials: string[];
  clothing: string[];
  medical: string[];
  electronics: string[];
} {
  return {
    essentials: [
      'Passport + copies',
      'Visa documents',
      'Travel insurance papers',
      'Emergency contacts list',
      'Credit/debit cards',
      'Some USD cash ($200-500)'
    ],
    clothing: [
      'Modest clothing (cover knees & shoulders)',
      'Comfortable walking shoes',
      'Light cotton clothes (for heat)',
      'Light jacket (for AC/north India winter)',
      'Scarf/shawl (temples/mosques)',
      'Sun hat and sunglasses'
    ],
    medical: [
      'Prescription medications (bring extra)',
      'Diarrhea medication (Imodium)',
      'Pain relievers (Tylenol/Advil)',
      'Antibiotic ointment',
      'Hand sanitizer',
      'Insect repellent',
      'Oral rehydration salts (ORS packets)'
    ],
    electronics: [
      'Universal adapter (Type C, D, M)',
      'Power bank',
      'Phone + charger',
      'Camera (optional)',
      'Converter (if needed for 220V)'
    ]
  };
}

function parseCurrencyAdvice(response: string): string {
  return 'Exchange $100-200 at airport for immediate needs (taxi, food). Exchange more at city exchange offices (better rates). ATMs available widely in cities. Notify your bank about India travel to avoid card blocks. UPI is everywhere but requires Indian bank account.';
}


function parseCustomsInfo(response: string): {
  allowed: string[];
  prohibited: string[];
} {
  return {
    allowed: [
      'Personal clothing and items',
      '2 liters alcohol (if 18+)',
      '100 cigarettes or 25 cigars',
      'Up to ₹25,000 in Indian currency',
      'Up to $5,000 (or equivalent) in foreign currency without declaration',
      'Personal electronics (laptop, phone, camera)'
    ],
    prohibited: [
      'Narcotic drugs and psychotropic substances',
      'Livestock, poultry',
      'Wildlife products (ivory, fur, exotic leather)',
      'E-cigarettes and vaping devices',
      'Indian currency over ₹25,000',
      'Antiques over 100 years old (require permit)',
      'Satellite phones without permit'
    ]
  };
}

function generateTimeline(profile: TouristProfile): {
  weeks: number;
  task: string;
  priority: 'critical' | 'high' | 'medium';
}[] {
  return [
    { weeks: 8, task: 'Apply for visa (allow extra time)', priority: 'critical' },
    { weeks: 6, task: 'Book flights and accommodation', priority: 'high' },
    { weeks: 4, task: 'Get required/recommended vaccinations', priority: 'high' },
    { weeks: 4, task: 'Purchase travel insurance', priority: 'critical' },
    { weeks: 3, task: 'Notify bank/credit card of travel dates', priority: 'high' },
    { weeks: 2, task: 'Make copies of all documents', priority: 'medium' },
    { weeks: 1, task: 'Exchange some currency to USD/local', priority: 'medium' },
    { weeks: 1, task: 'Download offline maps (Google Maps)', priority: 'medium' },
    { weeks: 0, task: 'Pack essentials, recheck flight/visa', priority: 'critical' }
  ];
}

function extractWarnings(response: string): string[] {
  return [
    'Apply for visa early - processing can take 5-7 days',
    'Check Yellow Fever requirement if coming from endemic countries',
    'Notify your bank to avoid card blocks in India',
    'Keep digital + physical copies of all documents',
    'Don\'t pack valuables in checked luggage'
  ];
}

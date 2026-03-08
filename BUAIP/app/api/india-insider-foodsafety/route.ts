/**
 * India Insider - Food Safety Intelligence Engine
 *
 * Helps international visitors avoid food poisoning and eat safely in India
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildFoodSafetyPrompt } from '@/app/lib/indiaInsiderPrompts';
import {
  TouristProfile,
  FoodSafetyGuide,
  DietaryOption,
} from '@/app/lib/indiaInsiderTypes';

interface FoodSafetyRequest {
  query: string;
  profile: TouristProfile;
  city?: string;
  budget?: 'budget' | 'mid' | 'luxury';
  allergies?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FoodSafetyRequest;
    const { query, profile, city, budget, allergies = [] } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const effectiveProfile: TouristProfile = {
      ...profile,
      currentLocation: city || profile?.currentLocation,
      budget: budget || profile?.budget,
      dietaryRestrictions: profile?.dietaryRestrictions || [],
    };

    const systemPrompt = buildFoodSafetyPrompt(effectiveProfile);

    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 2000 }
    );

    const foodSafetyGuide = parseFoodSafetyGuide(aiResponse, effectiveProfile, allergies);

    return NextResponse.json({
      success: true,
      engine: 'food_safety_intelligence',
      response: aiResponse,
      foodSafetyGuide,
      profile: effectiveProfile,
    });
  } catch (error) {
    console.error('[Food Safety Intelligence] Error:', error);
    return NextResponse.json(
      {
        error: 'Food safety engine error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// FOOD SAFETY PARSER
// ============================================================================

function parseFoodSafetyGuide(
  response: string,
  profile: TouristProfile,
  allergies: string[]
): FoodSafetyGuide {
  const lowerResponse = response.toLowerCase();
  const city = profile.currentLocation || 'your city';

  return {
    safeToEat: getSafeFoods(profile, city),
    avoid: getUnsafeFoods(profile, lowerResponse),
    waterSafety:
      'Drink only sealed bottled water (Bisleri, Kinley, Aquafina). Avoid tap water and raw ice. Use bottled water even for brushing teeth.',
    restaurantTips: [
      'Choose busy restaurants with high local footfall and visible kitchen hygiene.',
      'Prefer freshly cooked hot meals over pre-prepared buffet food.',
      'Use Google Maps ratings and recent reviews before entering.',
      'In major cities, chain restaurants are generally safer for first-time visitors.',
      ...getSafeChainRecommendations(city),
    ],
    streetFoodGuidance: [
      'Eat only freshly cooked food served piping hot in front of you.',
      'Avoid cut fruits, chutneys made with untreated water, and uncooked salads.',
      'Choose stalls with fast turnover and clean utensils.',
      'Carry ORS packets, hand sanitizer, and anti-diarrheal medicine.',
      'Start with small portions if your stomach is not used to Indian spices.',
    ],
    dietaryOptions: buildDietaryOptions(profile, allergies, city),
  };
}

// ============================================================================
// DATA PROVIDERS
// ============================================================================

function getSafeFoods(profile: TouristProfile, city: string): string[] {
  const restrictions = (profile.dietaryRestrictions || []).map((r) => r.toLowerCase());

  const baseSafeFoods = [
    'Steamed idli with sambar',
    'Freshly made dosa (ask for low spice)',
    'Khichdi (rice + lentils, easy on stomach)',
    'Plain rice with dal and cooked vegetables',
    'Freshly cooked roti with dry sabzi',
    'Boiled eggs from reputable restaurants',
    'Banana and whole fruits you can peel yourself',
    'Packaged yogurt/curd from trusted brands',
  ];

  if (restrictions.includes('vegetarian') || restrictions.includes('vegan')) {
    baseSafeFoods.push('Veg thali from hygienic restaurants');
  }

  if (city.toLowerCase().includes('mumbai')) {
    baseSafeFoods.push('Freshly cooked poha/upma in busy breakfast spots');
  }

  if (city.toLowerCase().includes('delhi')) {
    baseSafeFoods.push('Fresh paneer dishes in established restaurants');
  }

  return baseSafeFoods;
}

function getUnsafeFoods(profile: TouristProfile, lowerResponse: string): string[] {
  const allergies = (profile.medicalConditions || []).map((a) => a.toLowerCase());

  const unsafeFoods = [
    'Tap water, flavored street water, and unsealed bottled water',
    'Ice from unknown sources',
    'Raw salads and pre-cut fruits from street stalls',
    'Undercooked meat and seafood from low-hygiene vendors',
    'Food left uncovered for long periods',
    'Very spicy street food on day 1 of arrival',
  ];

  if (lowerResponse.includes('allerg') || allergies.length > 0) {
    unsafeFoods.push('Any dish with unclear ingredients if you have severe allergies');
  }

  return unsafeFoods;
}

function getSafeChainRecommendations(city: string): string[] {
  const commonSafeChains = [
    'Safer chain options: Haldirams, Saravana Bhavan, Barbeque Nation, Cafe Coffee Day.',
    'For coffee/snacks: Starbucks, Third Wave Coffee, and airport-standard cafes are usually reliable.',
    'For quick meals: Reputed hotel restaurants and high-rated mall food courts.',
  ];

  if (city.toLowerCase().includes('bangalore')) {
    commonSafeChains.push('In Bengaluru, IT corridor restaurants usually follow better hygiene standards.');
  }

  return commonSafeChains;
}

function buildDietaryOptions(
  profile: TouristProfile,
  allergies: string[],
  city: string
): DietaryOption[] {
  const dietaryRestrictions = (profile.dietaryRestrictions || []).map((d) => d.toLowerCase());

  const options: DietaryOption[] = [
    {
      type: 'vegetarian',
      availability: 'easy',
      tips: [
        'India is highly vegetarian-friendly; ask for "pure veg" restaurants.',
        'Avoid shared fryers if you need strict vegetarian food.',
      ],
      recommendedPlaces: ['Saravana Bhavan', 'Haldirams', `${city} vegetarian thali restaurants`],
    },
    {
      type: 'vegan',
      availability: 'moderate',
      tips: [
        'Ask to avoid ghee, butter, paneer, curd, and milk.',
        'Request oil-based cooking and check gravy ingredients.',
      ],
      recommendedPlaces: [`${city} vegan cafes`, 'Salad and bowl chains in metro cities'],
    },
    {
      type: 'halal',
      availability: 'easy',
      tips: [
        'Ask directly: "Is this halal certified?"',
        'Prefer established Muslim neighborhood restaurants with visible certification.',
      ],
      recommendedPlaces: ['Old city halal clusters', 'Branded halal chains by city'],
    },
    {
      type: 'gluten-free',
      availability: 'moderate',
      tips: [
        'Prefer rice-based dishes: idli, plain rice, dosa (confirm batter additives).',
        'Avoid gravies thickened with wheat flour unless confirmed.',
      ],
      recommendedPlaces: ['South Indian specialty restaurants', 'Health-focused cafes'],
    },
    {
      type: 'allergy-aware',
      availability: allergies.length > 0 ? 'moderate' : 'easy',
      tips: getAllergyPhraseTips(allergies),
      recommendedPlaces: ['Hotel restaurants', 'High-rated family restaurants', 'Mall dining outlets'],
    },
  ];

  if (dietaryRestrictions.includes('kosher')) {
    options.push({
      type: 'kosher',
      availability: 'difficult',
      tips: [
        'Kosher options are limited in most Indian cities.',
        'Use packaged certified food and verify certifications in advance.',
      ],
      recommendedPlaces: ['Select metro-city specialty stores'],
    });
  }

  return options;
}

function getAllergyPhraseTips(allergies: string[]): string[] {
  const list = allergies.length > 0 ? allergies.join(', ') : 'nuts, dairy, gluten, shellfish';

  return [
    `State clearly: "I have allergy to ${list}. No contamination please."`,
    'Simple Hindi phrase: "Mujhe [allergen] se allergy hai. Kripya iske bina banaiye."',
    'Simple Tamil phrase: "Enakku [allergen] allergy irukku. Idhu illama seiyunga."',
    'Simple Telugu phrase: "Naaku [allergen] allergy undi. Dayachesi ivvi vaddu."',
    'Show written allergy card on your phone to restaurant staff before ordering.',
  ];
}

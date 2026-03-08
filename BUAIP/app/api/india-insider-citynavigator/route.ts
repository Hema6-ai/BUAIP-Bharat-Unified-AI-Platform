/**
 * India Insider - City Navigator Engine
 * 
 * Local expert guide for navigating Indian cities
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildCityNavigatorPrompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, CityGuide } from '@/app/lib/indiaInsiderTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CityNavigatorRequest {
  query: string;
  profile: TouristProfile;
  city: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CityNavigatorRequest;
    const { query, profile, city } = body;

    if (!query || !city) {
      return NextResponse.json(
        { error: 'Query and city are required' },
        { status: 400 }
      );
    }

    // Build system prompt with city context
    const systemPrompt = buildCityNavigatorPrompt(profile, city);

    // Call Bedrock AI
    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.5, maxTokens: 2000 }
    );

    // Parse city guide
    const cityGuide = parseCityGuide(aiResponse, city, profile);

    return NextResponse.json({
      success: true,
      engine: 'city_navigator',
      response: aiResponse,
      cityGuide,
      profile
    });

  } catch (error) {
    console.error('[City Navigator] Error:', error);
    return NextResponse.json(
      {
        error: 'City navigator error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// CITY GUIDE PARSER
// ============================================================================

function parseCityGuide(
  response: string,
  city: string,
  profile: TouristProfile
): CityGuide {
  const stateMap: Record<string, string> = {
    Delhi: 'Delhi',
    Mumbai: 'Maharashtra',
    Bangalore: 'Karnataka',
    Chennai: 'Tamil Nadu',
    Kolkata: 'West Bengal',
    Hyderabad: 'Telangana',
    Jaipur: 'Rajasthan',
    Goa: 'Goa',
    Kerala: 'Kerala'
  };

  const attractions = getCityAttractions(city).map((item) => ({
    name: item.name,
    type: item.type,
    description: item.tips,
    location: city,
    cost: item.cost,
    hours: item.duration,
    tips: [item.tips]
  }));

  const transportInfo = getCityTransport(city);
  const transport = [
    { mode: 'Metro', cost: '₹10-60 per trip', safety: 'high' as const, tips: [transportInfo.metro] },
    { mode: 'Taxi', cost: 'Varies by city and distance', safety: 'high' as const, tips: [transportInfo.taxi] },
    { mode: 'Auto', cost: 'Metered/negotiated by city', safety: 'medium' as const, tips: [transportInfo.auto] }
  ];

  const safety = getCitySafetyInfo(city);
  const commonScams = getCityScams(city).map((scam) => ({
    name: scam.scam,
    description: scam.howItWorks,
    howToAvoid: [scam.avoidance]
  }));

  return {
    city,
    state: stateMap[city] || 'Unknown',
    mustSee: attractions,
    transport,
    safetyTips: [safety.soloWomen, safety.nightSafety, ...safety.tips],
    commonScams,
    localEtiquette: getCityLocalTips(city),
    bestTime: getCityBestTime(city),
  };
}

// ============================================================================
// CITY-SPECIFIC DATA
// ============================================================================

function getCityAttractions(city: string): {
  name: string;
  type: string;
  duration: string;
  cost: string;
  tips: string;
}[] {
  
  const attractions: Record<string, any[]> = {
    'Delhi': [
      {
        name: 'Red Fort',
        type: 'Historical monument',
        duration: '2-3 hours',
        cost: '₹35 Indians, ₹500 foreigners',
        tips: 'Go early morning, closed on Mondays'
      },
      {
        name: 'Qutub Minar',
        type: 'UNESCO World Heritage',
        duration: '1-2 hours',
        cost: '₹30 Indians, ₹500 foreigners',
        tips: 'Beautiful at sunset, good for photography'
      },
      {
        name: 'India Gate',
        type: 'War memorial',
        duration: '1 hour',
        cost: 'Free',
        tips: 'Evening visit best, street food nearby'
      },
      {
        name: 'Lotus Temple',
        type: 'Modern architecture',
        duration: '1-2 hours',
        cost: 'Free',
        tips: 'Peaceful, meditation inside, closed Mondays'
      },
      {
        name: 'Chandni Chowk',
        type: 'Old market',
        duration: '3-4 hours',
        cost: 'Free (food budget ₹500)',
        tips: 'Chaotic but amazing food, go morning, avoid bags'
      }
    ],
    'Mumbai': [
      {
        name: 'Gateway of India',
        type: 'Iconic monument',
        duration: '1 hour',
        cost: 'Free',
        tips: 'Boat rides to Elephanta Caves available'
      },
      {
        name: 'Marine Drive',
        type: 'Seaside promenade',
        duration: '1-2 hours',
        cost: 'Free',
        tips: 'Sunset walk, safe area, street food'
      },
      {
        name: 'Elephanta Caves',
        type: 'UNESCO caves',
        duration: 'Half day',
        cost: '₹40 + ₹200 boat',
        tips: 'Ferry from Gateway, closed Mondays'
      }
    ],
    'Jaipur': [
      {
        name: 'Amber Fort',
        type: 'Palace complex',
        duration: '3-4 hours',
        cost: '₹100 Indians, ₹500 foreigners',
        tips: 'Elephant rides optional, go early to beat heat'
      },
      {
        name: 'City Palace',
        type: 'Royal palace museum',
        duration: '2-3 hours',
        cost: '₹200-700',
        tips: 'Guides help understand history'
      },
      {
        name: 'Hawa Mahal',
        type: 'Iconic palace',
        duration: '1 hour',
        cost: '₹50 Indians, ₹200 foreigners',
        tips: 'View from Hawa Mahal road is free!'
      }
    ]
  };

  return attractions[city] || [
    {
      name: 'Ask locals for recommendations',
      type: 'Various',
      duration: 'Varies',
      cost: 'Varies',
      tips: 'Use Google Maps reviews'
    }
  ];
}

function getCityTransport(city: string): {
  metro: string;
  taxi: string;
  auto: string;
  apps: string[];
  tips: string[];
} {
  const transport: Record<string, any> = {
    'Delhi': {
      metro: 'Excellent metro system. ₹10-60 per trip. Get smart card.',
      taxi: 'Ola/Uber reliable. Avoid unmetered taxis.',
      auto: '₹25 base + ₹8/km. Use Ola/Uber auto for meter.',
      apps: ['Ola', 'Uber', 'Delhi Metro App'],
      tips: [
        'Metro is fastest during rush hour',
        'Auto drivers won\'t use meters - book via app',
        'Airport Express metro to city (₹60)'
      ]
    },
    'Mumbai': {
      metro: 'Limited metro. Local trains are lifeline but very crowded.',
      taxi: 'Black-yellow taxis metered. Uber/Ola also good.',
      auto: 'Only in suburbs. ₹18 base + ₹12/km.',
      apps: ['Ola', 'Uber', 'Mumbai Metro App'],
      tips: [
        'Local trains VERY crowded (avoid 8-11am, 5-9pm)',
        'Ladies compartment available',
        'Prepaid taxi at airport recommended'
      ]
    },
    'Bangalore': {
      metro: 'Growing metro network. ₹10-60. Namma Metro app.',
      taxi: 'Heavy traffic. Uber/Ola everywhere.',
      auto: 'Auto meters work mostly. ₹30 minimum.',
      apps: ['Ola', 'Uber', 'Namma Metro'],
      tips: [
        'Traffic is terrible - plan extra time',
        'Metro expanding but doesn\'t cover all areas',
        'Auto drivers often refuse short distances'
      ]
    }
  };

  return transport[city] || {
    metro: 'Check if metro available',
    taxi: 'Ola/Uber generally work',
    auto: 'Negotiate fare before ride',
    apps: ['Ola', 'Uber'],
    tips: ['Download transport apps before arrival']
  };
}

function getCitySafetyInfo(city: string): {
  rating: 'safe' | 'moderately-safe' | 'caution';
  soloWomen: string;
  nightSafety: string;
  areasToAvoid: string[];
  tips: string[];
} {
  return {
    rating: 'moderately-safe',
    soloWomen: 'Generally safe during day. Use registered taxis at night. Metro has women compartment. Dress modestly.',
    nightSafety: 'Stick to well-lit tourist areas. Avoid walking alone after 10pm. Use Ola/Uber instead of local transport.',
    areasToAvoid: [
      'Railway station surroundings late at night',
      'Isolated streets in old city areas',
      'Empty parks after dark'
    ],
    tips: [
      'Keep copies of documents separately',
      'Share your location with contacts',
      'Tourist helpline: 1363',
      'Women\'s helpline: 1091',
      'Trust your instincts - if uncomfortable, leave'
    ]
  };
}

function getCityNeighborhoods(city: string): {
  name: string;
  vibe: string;
  stayHere: boolean;
  safety: string;
}[] {
  const neighborhoods: Record<string, any[]> = {
    'Delhi': [
      {
        name: 'Connaught Place',
        vibe: 'Central hub, restaurants, shopping',
        stayHere: true,
        safety: 'Safe but beware scams'
      },
      {
        name: 'Paharganj',
        vibe: 'Backpacker area, budget hotels',
        stayHere: true,
        safety: 'Chaotic but okay'
      },
      {
        name: 'Hauz Khas',
        vibe: 'Trendy cafes, nightlife, art',
        stayHere: true,
        safety: 'Safe and upscale'
      }
    ]
  };

  return neighborhoods[city] || [];
}

function getCityScams(city: string): {
  scam: string;
  howItWorks: string;
  avoidance: string;
}[] {
  return [
    {
      scam: 'Taxi Meter Tampering',
      howItWorks: 'Meter runs too fast or driver adds extra charges',
      avoidance: 'Use Ola/Uber or take airport prepaid taxi'
    },
    {
      scam: 'Fake Tour Guides',
      howItWorks: 'Unofficial guides at monuments offer cheap tours then demand high fees',
      avoidance: 'Use official guides or audio guides'
    },
    {
      scam: 'Gem Export Scam',
      howItWorks: 'Friendly person says you can make money exporting gems',
      avoidance: 'NEVER buy gems to "export". Classic scam.'
    },
    {
      scam: 'Closed or Moved',
      howItWorks: 'Driver says hotel/attraction closed, takes you to expensive alternative',
      avoidance: 'Call ahead, don\'t believe drivers'
    }
  ];
}

function getCityFood(city: string): {
  dish: string;
  where: string;
  cost: string;
}[] {
  return [
    { dish: 'Street food (chaat, samosa)', where: 'Busy street vendors', cost: '₹20-100' },
    { dish: 'Thali (complete meal)', where: 'Local restaurants', cost: '₹150-300' },
    { dish: 'Biryani', where: 'Popular: Paradise, Biryani Blues', cost: '₹200-400' },
    { dish: 'Dosa', where: 'South Indian restaurants', cost: '₹60-150' }
  ];
}

function estimateCityBudget(city: string, budgetLevel: string): {
  daily: string;
  meals: string;
  transport: string;
  attractions: string;
} {
  const budgets: Record<string, any> = {
    'budget': {
      daily: '₹1,500-2,500 ($20-30)',
      meals: '₹300-600',
      transport: '₹200-400',
      attractions: '₹500-1,000'
    },
    'mid': {
      daily: '₹3,000-6,000 ($40-80)',
      meals: '₹800-1,500',
      transport: '₹400-800',
      attractions: '₹1,000-2,000'
    },
    'luxury': {
      daily: '₹8,000+ ($100+)',
      meals: '₹2,000-5,000',
      transport: '₹1,000-2,000',
      attractions: '₹2,000-5,000'
    }
  };

  return budgets[budgetLevel] || budgets['mid'];
}

function getCityBestTime(city: string): string {
  return 'October to March (cool weather), avoid May-July (very hot), monsoon July-September';
}

function getCityLocalTips(city: string): string[] {
  return [
    'Download offline maps before arrival',
    'Keep ₹500-1,000 cash daily',
    'Learn basic Hindi phrases',
    'Dress modestly at religious sites',
    'Bargain at markets (start 50% of asking price)'
  ];
}

/**
 * India Insider - Language Survival Teacher Engine
 *
 * Teaches practical local phrases for tourists in India
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildLanguageSurvivalPrompt } from '@/app/lib/indiaInsiderPrompts';
import {
  TouristProfile,
  LanguagePhrases,
  Phrase,
} from '@/app/lib/indiaInsiderTypes';

interface LanguageRequest {
  query: string;
  profile: TouristProfile;
  touristLanguage?: string;
  city?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LanguageRequest;
    const { query, profile, touristLanguage = 'English', city } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const effectiveProfile: TouristProfile = {
      ...profile,
      destination: city || profile?.destination,
    };

    const localLanguage = inferLocalLanguage(city || profile?.destination);
    const systemPrompt = buildLanguageSurvivalPrompt(effectiveProfile, localLanguage);

    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.4, maxTokens: 2200 }
    );

    const phraseSets = buildLanguagePhraseSets(localLanguage, city || 'India');
    const phraseCount = phraseSets.reduce((sum, set) => sum + set.phrases.length, 0);

    return NextResponse.json({
      success: true,
      engine: 'language_survival_teacher',
      response: aiResponse,
      languageGuide: {
        touristLanguage,
        localLanguage,
        city: city || profile?.destination || 'India',
        totalPhrases: phraseCount,
        phraseSets,
      },
      profile: effectiveProfile,
    });
  } catch (error) {
    console.error('[Language Survival Teacher] Error:', error);
    return NextResponse.json(
      {
        error: 'Language survival engine error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// LANGUAGE DATA BUILDERS
// ============================================================================

function inferLocalLanguage(city?: string): string {
  const lowerCity = (city || '').toLowerCase();

  if (['chennai', 'coimbatore', 'madurai'].some((name) => lowerCity.includes(name))) {
    return 'Tamil';
  }

  if (['hyderabad', 'vijayawada', 'visakhapatnam'].some((name) => lowerCity.includes(name))) {
    return 'Telugu';
  }

  if (['kolkata', 'howrah', 'siliguri'].some((name) => lowerCity.includes(name))) {
    return 'Bengali';
  }

  if (['bengaluru', 'bangalore', 'mysuru'].some((name) => lowerCity.includes(name))) {
    return 'Kannada';
  }

  if (['kochi', 'trivandrum', 'kozhikode'].some((name) => lowerCity.includes(name))) {
    return 'Malayalam';
  }

  if (['mumbai', 'pune', 'nagpur'].some((name) => lowerCity.includes(name))) {
    return 'Marathi';
  }

  return 'Hindi';
}

function buildLanguagePhraseSets(localLanguage: string, city: string): LanguagePhrases[] {
  // 5 categories x 4 phrases = 20 essential phrases.
  return [
    {
      category: 'Market and Shopping',
      phrases: [
        phrase('How much is this?', localLanguage, 'kitna hai?', 'kit-na hai', 'Use before buying anything.'),
        phrase('Too expensive', localLanguage, 'bahut mehenga', 'ba-hut me-hen-ga', 'Use while bargaining politely.'),
        phrase('Please reduce the price', localLanguage, 'thoda kam kijiye', 'tho-da kam kee-ji-ye', 'Use in markets and street stalls.'),
        phrase('I will buy this', localLanguage, 'yeh lena hai', 'yeh lay-na hai', 'Use to close the negotiation.'),
      ],
    },
    {
      category: 'Transport and Directions',
      phrases: [
        phrase('Where is the metro?', localLanguage, 'metro kahan hai?', 'me-tro ka-han hai', 'Use with locals near stations.'),
        phrase('Take me to this address', localLanguage, 'mujhe is address par le chaliye', 'moo-jhay is a-dress par lay cha-lee-ye', 'Show map and say this to driver.'),
        phrase('Stop here please', localLanguage, 'yahin rokiye', 'ya-heen ro-kee-ye', 'Use in taxi, auto, or cab.'),
        phrase('Is this the right way?', localLanguage, 'kya yeh sahi raasta hai?', 'kya yeh sa-hee raas-ta hai', 'Use when route feels wrong.'),
      ],
    },
    {
      category: 'Food and Dietary Needs',
      phrases: [
        phrase('I am vegetarian', localLanguage, 'main shakahari hoon', 'main sha-ka-ha-ree hoon', 'Use while ordering food.'),
        phrase('No spicy please', localLanguage, 'teekha mat dijiye', 'tee-kha mat dee-ji-ye', 'Use for mild food preference.'),
        phrase('I have allergy', localLanguage, 'mujhe allergy hai', 'moo-jhay al-ler-jee hai', 'Use before placing order.'),
        phrase('Only bottled water', localLanguage, 'sirf bottled paani', 'sirf bot-tald paa-nee', 'Use in restaurants and cafes.'),
      ],
    },
    {
      category: 'Help and Emergency',
      phrases: [
        phrase('Help me please', localLanguage, 'kripya madad kijiye', 'kri-pya ma-dad kee-ji-ye', 'Use in urgent situations.'),
        phrase('Call the police', localLanguage, 'police ko bulao', 'po-lees ko boo-lao', 'Use during crime or threat.'),
        phrase('Where is the hospital?', localLanguage, 'hospital kahan hai?', 'hos-pi-tal ka-han hai', 'Use in health emergency.'),
        phrase('I am lost', localLanguage, 'main kho gaya hoon', 'main kho ga-ya hoon', 'Use when you need navigation help.'),
      ],
    },
    {
      category: 'Polite Daily Conversation',
      phrases: [
        phrase('Hello / Greetings', localLanguage, 'namaste', 'na-mas-tay', 'Use while meeting people respectfully.'),
        phrase('Thank you', localLanguage, 'dhanyavaad', 'dhan-ya-vaad', 'Use after receiving help.'),
        phrase('Excuse me', localLanguage, 'maaf kijiye', 'maaf kee-ji-ye', 'Use to ask politely or pass through crowd.'),
        phrase('I do not understand', localLanguage, 'mujhe samajh nahi aaya', 'moo-jhay sa-majh na-hee aa-ya', `Use when language barrier appears in ${city}.`),
      ],
    },
  ];
}

function phrase(
  english: string,
  language: string,
  translation: string,
  pronunciation: string,
  context: string
): Phrase {
  return {
    english,
    translation: `${translation} (${language})`,
    pronunciation,
    context,
  };
}

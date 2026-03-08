/**
 * India Insider - Legal & Cultural Rules Expert Engine
 *
 * Helps tourists avoid legal trouble and cultural offense in India
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildLegalCulturalPrompt } from '@/app/lib/indiaInsiderPrompts';
import {
  TouristProfile,
  LegalRule,
  CulturalEtiquette,
} from '@/app/lib/indiaInsiderTypes';

interface LegalCulturalRequest {
  query: string;
  profile: TouristProfile;
  location?: string;
  situation?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LegalCulturalRequest;
    const { query, profile, location, situation = 'general travel behavior' } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const effectiveProfile: TouristProfile = {
      ...profile,
      currentLocation: location || profile?.currentLocation,
    };

    const systemPrompt = buildLegalCulturalPrompt(effectiveProfile, situation);

    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.2, maxTokens: 2200 }
    );

    const legalCulturalGuide = parseLegalCulturalGuide(situation, location || 'India');

    return NextResponse.json({
      success: true,
      engine: 'legal_cultural_rules_expert',
      response: aiResponse,
      legalCulturalGuide,
      profile: effectiveProfile,
    });
  } catch (error) {
    console.error('[Legal & Cultural Rules Expert] Error:', error);
    return NextResponse.json(
      {
        error: 'Legal-cultural engine error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// LEGAL AND CULTURAL PARSER
// ============================================================================

function parseLegalCulturalGuide(
  situation: string,
  location: string
): {
  location: string;
  situation: string;
  legalRules: LegalRule[];
  culturalEtiquette: CulturalEtiquette[];
} {
  return {
    location,
    situation,
    legalRules: buildLegalRules(situation),
    culturalEtiquette: buildCulturalEtiquette(situation),
  };
}

// ============================================================================
// DATA PROVIDERS
// ============================================================================

function buildLegalRules(situation: string): LegalRule[] {
  const lowerSituation = situation.toLowerCase();

  const baseRules: LegalRule[] = [
    {
      topic: 'Visa Compliance',
      rule: 'Always carry valid passport, visa, and immigration status documents.',
      penalty: 'Visa overstay can lead to fines, deportation, and future entry ban.',
    },
    {
      topic: 'Drug Laws',
      rule: 'Possession, purchase, or use of narcotics is illegal and strictly enforced.',
      penalty: 'Arrest, non-bailable charges in severe cases, and imprisonment.',
    },
    {
      topic: 'Photography Restrictions',
      rule: 'No photography at military zones, some airports, and restricted government areas.',
      penalty: 'Questioning, equipment seizure, fines, and potential legal case.',
    },
    {
      topic: 'Alcohol Rules',
      rule: 'Alcohol sale and legal age vary by state. Public drinking is generally prohibited.',
      penalty: 'On-the-spot fines, police action, and local law violations.',
    },
  ];

  if (lowerSituation.includes('temple') || lowerSituation.includes('religious')) {
    baseRules.push({
      topic: 'Religious Site Conduct',
      rule: 'Follow site-specific entry rules, dress code, and photography permissions.',
      penalty: 'Removal from premises, fines, and police complaint in extreme disputes.',
      exceptions: ['Some temples have non-Hindu entry restrictions.'],
    });
  }

  if (lowerSituation.includes('nightlife')) {
    baseRules.push({
      topic: 'Nightlife Closing Rules',
      rule: 'Bar closing times and alcohol service windows differ by city/state.',
      penalty: 'Venue closures and individual fines for violating local orders.',
    });
  }

  return baseRules;
}

function buildCulturalEtiquette(situation: string): CulturalEtiquette[] {
  const lowerSituation = situation.toLowerCase();

  const etiquette: CulturalEtiquette[] = [
    {
      situation: 'General Public Conduct',
      dos: [
        'Dress modestly in conservative areas.',
        'Use polite words and calm tone in crowded situations.',
        'Ask before photographing individuals.',
      ],
      donts: [
        'Avoid public intoxication or aggressive behavior.',
        'Avoid loud arguments with service staff in public spaces.',
        'Do not assume social norms are identical across all states.',
      ],
      context: 'India is culturally diverse; respectful behavior is expected and appreciated.',
    },
    {
      situation: 'Religious Places',
      dos: [
        'Remove footwear where required.',
        'Cover shoulders and knees in temples, mosques, and gurudwaras.',
        'Follow queue and ritual instructions from temple staff.',
      ],
      donts: [
        'Do not touch idols, offerings, or sacred objects unless invited.',
        'Do not take photos where signs prohibit it.',
        'Do not enter restricted sanctum zones.',
      ],
      context: 'Religious etiquette differs by faith and location; follow posted instructions.',
    },
  ];

  if (lowerSituation.includes('photography')) {
    etiquette.push({
      situation: 'Street and Portrait Photography',
      dos: [
        'Ask permission before close-up photos, especially of women and children.',
        'Use a smile and simple explanation to gain consent.',
      ],
      donts: [
        'Do not photograph police, checkpoints, and military assets.',
        'Do not shoot rituals up close without approval.',
      ],
      context: 'Consent-based photography avoids conflict and respects privacy.',
    });
  }

  if (lowerSituation.includes('nightlife')) {
    etiquette.push({
      situation: 'Nightlife and Social Spaces',
      dos: [
        'Use registered transport (app taxis) when returning late.',
        'Carry hotel details and emergency contacts.',
      ],
      donts: [
        'Do not carry or consume illegal substances.',
        'Do not ignore local closing-hour announcements.',
      ],
      context: 'Nightlife norms vary between metro cities and smaller towns.',
    });
  }

  return etiquette;
}

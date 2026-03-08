/**
 * India Insider - Expat Long-Stay Specialist Engine
 *
 * Helps foreigners relocating to India for 3+ months
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildExpatLongstayPrompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, ExpatGuide } from '@/app/lib/indiaInsiderTypes';

interface ExpatRequest {
  query: string;
  profile: TouristProfile;
  nationality?: string;
  city?: string;
  stayDurationMonths?: number;
  purpose?: 'work' | 'study' | 'remote work' | 'business' | 'other';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExpatRequest;
    const {
      query,
      profile,
      nationality,
      city,
      stayDurationMonths = 6,
      purpose = 'work',
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const effectiveProfile: TouristProfile = {
      ...profile,
      nationality: nationality || profile?.nationality,
      destination: city || profile?.destination,
      travelPurpose: profile?.travelPurpose || 'longstay',
    };

    const systemPrompt = buildExpatLongstayPrompt(effectiveProfile);

    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 2200 }
    );

    const expatGuide = parseExpatGuide(
      aiResponse,
      effectiveProfile,
      stayDurationMonths,
      purpose
    );

    return NextResponse.json({
      success: true,
      engine: 'expat_longstay_specialist',
      response: aiResponse,
      expatGuide,
      profile: effectiveProfile,
      metadata: {
        stayDurationMonths,
        purpose,
      },
    });
  } catch (error) {
    console.error('[Expat Long-Stay Specialist] Error:', error);
    return NextResponse.json(
      {
        error: 'Expat long-stay engine error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXPAT PARSER
// ============================================================================

function parseExpatGuide(
  response: string,
  profile: TouristProfile,
  stayDurationMonths: number,
  purpose: ExpatRequest['purpose']
): ExpatGuide {
  const visaType = inferVisaType(purpose, stayDurationMonths);
  const city = profile.destination || 'your city';
  const nationality = profile.nationality || 'foreign national';

  return {
    visaType,
    registration: [
      'FRRO registration is mandatory if your stay is 180+ days. Complete within 14 days of arrival.',
      'Use official portal: https://indianfrro.gov.in and track your application online.',
      'Keep passport, visa, rental agreement, photos, and local address proof ready.',
      'Overstay or non-registration can lead to fines, visa complications, and deportation risk.',
    ],
    banking: [
      'Apply for PAN card early; most banks require it for full-featured accounts.',
      'Recommended expat-friendly banks: HDFC, ICICI, Axis, and SBI branches in metro areas.',
      'Carry passport, visa, local address proof, and employment/admission letter.',
      'Expect 1-4 weeks for account activation and KYC verification.',
      'Set up net banking, UPI (if eligible), and international debit card controls.',
    ],
    accommodation: [
      `In ${city}, compare PG, co-living, and apartment rentals based on commute and safety.`,
      'Typical security deposit is 2-3 months rent; broker fee is often 1 month rent.',
      'Verify rental agreement, police verification, and maintenance terms before signing.',
      'Tenant rights: insist on signed agreement, receipt for deposit, written notice period, and inventory handover record.',
      'Tenant rights: landlord cannot evict without due process as per rental agreement and local tenancy norms.',
      'Insist on written inventory list, lock condition, and utility meter readings at move-in.',
      'Prefer neighborhoods with reliable transport, hospitals, and grocery access.',
    ],
    utilities: [
      'Activate Indian SIM first (Airtel/Jio/Vi) because most services use OTP verification.',
      'Set up electricity and broadband transfer via landlord or provider support desks.',
      'Primary broadband options: Airtel Xstream, JioFiber, ACT (availability varies by city).',
      'Driving license: foreign license validity depends on visa and state rules; for long stay, apply for Indian driving license at local RTO.',
      'Driving license: carry passport, visa, address proof, and complete learner-to-permanent process where required.',
      'For long stays, keep copies of utility bills for address proof and future renewals.',
    ],
    healthcare: [
      'Keep international health insurance plus local coverage for smoother hospital cashless access.',
      'For major treatment, use multi-specialty private hospitals with international desks.',
      'Store medical records digitally and keep emergency contacts saved offline.',
      'Buy a local pharmacy app account for medicine delivery and refill reminders.',
    ],
    taxes: getTaxGuidance(nationality, stayDurationMonths),
    schooling:
      stayDurationMonths >= 6
        ? [
            'If relocating with children, shortlist CBSE/ICSE/international schools near your residence.',
            'School admission documents typically include passport copies, visa, prior records, and immunization details.',
          ]
        : undefined,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function inferVisaType(
  purpose: ExpatRequest['purpose'],
  stayDurationMonths: number
): string {
  if (purpose === 'study') {
    return 'Student Visa (S) with FRRO follow-up for long duration';
  }

  if (purpose === 'business') {
    return 'Business Visa (B) with compliance checks for activity type';
  }

  if (purpose === 'remote work') {
    return 'Remote work requires careful visa compliance; validate current rules before working in India';
  }

  if (stayDurationMonths >= 12) {
    return 'Long-duration Employment/Business category with periodic compliance checks';
  }

  return 'Employment/Long-Stay category based on sponsoring organization';
}

function getTaxGuidance(nationality: string, stayDurationMonths: number): string[] {
  const base = [
    'Tax residency in India depends on number of days stayed in a financial year.',
    'Get PAN as early as possible for salary, rent agreements, and banking.',
    'Maintain records of foreign income, Indian income, and treaty documents if applicable.',
    'Use a CA (chartered accountant) familiar with expat taxation and DTAA compliance.',
  ];

  if (stayDurationMonths >= 6) {
    base.push('If your physical stay crosses threshold, you may become tax resident in India.');
  }

  if (nationality.toLowerCase().includes('usa')) {
    base.push('US citizens should coordinate India and US filing obligations to avoid double taxation issues.');
  }

  return base;
}

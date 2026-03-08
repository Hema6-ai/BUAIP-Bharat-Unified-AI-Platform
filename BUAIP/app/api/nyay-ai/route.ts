/**
 * NYAY AI - LEGAL INTELLIGENCE ENGINE
 * 
 * API Route for Legal Rights Assistant
 * Handles legal queries, rights education, and complaint generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { runNyayEngine, NyayRequest, NyayMode, LegalCategory } from '@/app/lib/nyayEngine';
import { detectLegalCategory } from '@/app/lib/buaipRouter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface NyayAPIRequest {
  query: string;
  situation?: string;
  mode?: NyayMode;
  legalCategory?: LegalCategory;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  userGoal?: string;
  documentLanguage?: string;
  location?: string;
  profile?: {
    nationality?: string;
    currentLocation?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as NyayAPIRequest;
    const { query, situation, mode, legalCategory, urgency, userGoal, documentLanguage, location, profile } = body;

    if (!query && !situation) {
      return NextResponse.json(
        { error: 'Query or situation is required' },
        { status: 400 }
      );
    }

    const situationText = situation || query;

    // Auto-detect legal category if not provided
    const detectedCategory = (legalCategory || detectLegalCategory(situationText)) as LegalCategory;

    // Build Nyay Engine request
    const nyayRequest: NyayRequest = {
      query,
      situation: situationText,
      mode: mode || 'KNOW_YOUR_RIGHTS',
      legalCategory: detectedCategory,
      urgency,
      userGoal,
      documentLanguage,
      location: location || profile?.currentLocation
    };

    console.log('[Nyay AI API] Processing request:', {
      category: detectedCategory,
      mode: nyayRequest.mode,
      urgency: nyayRequest.urgency,
      hasLocation: !!nyayRequest.location
    });

    // Run Nyay Engine
    const nyayResponse = await runNyayEngine(nyayRequest);

    return NextResponse.json({
      success: true,
      engine: 'NyayAI',
      mode: nyayResponse.mode,
      legalCategory: nyayResponse.legalCategory,
      response: nyayResponse.response,
      structuredOutput: nyayResponse.structuredOutput,
      emergencyContacts: nyayResponse.emergencyContacts,
      dataContext: nyayResponse.dataContext,
      timestamp: nyayResponse.timestamp
    });

  } catch (error) {
    console.error('[Nyay AI API] Error:', error);
    return NextResponse.json(
      {
        error: 'Nyay AI processing error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER - Return engine info
// ============================================================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    engine: 'NyayAI',
    version: '1.0.0',
    description: 'Legal Intelligence Engine for Indian Citizens',
    modes: ['KNOW_YOUR_RIGHTS', 'COURTROOM_COACH'],
    supportedCategories: [
      'TENANT_RIGHTS',
      'LABOUR_RIGHTS',
      'LAND_DISPUTE',
      'CRIMINAL_RIGHTS',
      'DOMESTIC_VIOLENCE',
      'CONSUMER_RIGHTS',
      'RTI_RIGHTS',
      'GENERAL_LEGAL'
    ],
    supportedLanguages: [
      'English',
      'Hindi',
      'Telugu',
      'Tamil',
      'Bengali',
      'Marathi',
      'Kannada',
      'Gujarati',
      'Malayalam'
    ],
    emergencyContacts: {
      nationalLegalServices: '15100',
      police: '100',
      womenHelpline: '181',
      childHelpline: '1098',
      elderlyHelpline: '14567'
    },
    features: [
      'Legal rights explanation',
      'Complaint letter generation',
      'Court preparation coaching',
      'Free legal aid connections',
      'Evidence collection guidance',
      'Multilingual support',
      'Emergency legal assistance'
    ]
  });
}

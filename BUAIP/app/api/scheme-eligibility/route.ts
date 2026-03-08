import { NextRequest, NextResponse } from 'next/server';
import { CitizenProfile, EligibilityAnalysis } from '@/app/lib/schemeEligibilityTypes';
import { EligibilityEngine } from '@/app/lib/eligibilityEngine';

/**
 * POST /api/scheme-eligibility
 *
 * Analyzes a citizen profile and returns eligible government schemes
 *
 * Request body:
 * {
 *   citizenProfile: CitizenProfile
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   data?: EligibilityAnalysis,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { citizenProfile } = body;

    // Validate profile
    if (!citizenProfile) {
      return NextResponse.json(
        { success: false, error: 'Citizen profile is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'age',
      'gender',
      'state',
      'district',
      'occupation',
      'annualHouseholdIncome',
      'socialCategory',
      'educationLevel',
      'landOwnership',
    ];

    for (const field of requiredFields) {
      if (citizenProfile[field] === undefined || citizenProfile[field] === null) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Type the profile
    const profile: CitizenProfile = {
      age: parseInt(citizenProfile.age),
      gender: citizenProfile.gender,
      state: citizenProfile.state,
      district: citizenProfile.district,
      areaType: citizenProfile.areaType || 'rural',
      socialCategory: citizenProfile.socialCategory,
      occupation: citizenProfile.occupation,
      annualHouseholdIncome: parseInt(citizenProfile.annualHouseholdIncome),
      bplStatus: citizenProfile.bplStatus || 'not_sure',
      educationLevel: citizenProfile.educationLevel,
      landOwnership: citizenProfile.landOwnership,
      landArea: citizenProfile.landArea ? parseInt(citizenProfile.landArea) : undefined,
      specialConditions: {
        disability: citizenProfile.specialConditions?.disability || false,
        widow: citizenProfile.specialConditions?.widow || false,
        singleParent: citizenProfile.specialConditions?.singleParent || false,
        veteran: citizenProfile.specialConditions?.veteran || false,
        artisan: citizenProfile.specialConditions?.artisan || false,
        smallBusinessOwner: citizenProfile.specialConditions?.smallBusinessOwner || false,
      },
      businessStage: citizenProfile.businessStage,
    };

    // Run eligibility analysis
    const analysis: EligibilityAnalysis = await EligibilityEngine.analyzeProfile(profile);

    // Get special recommendations
    const specialRecommendations = EligibilityEngine.getSpecialRecommendations(profile);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...analysis,
          specialRecommendations,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Eligibility analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scheme-eligibility
 *
 * Get available states for the dropdown
 */
export async function GET(request: NextRequest) {
  try {
    const { SchemeDatabase } = await import('@/app/lib/schemeDatabase');
    const states = SchemeDatabase.getAllStates();

    return NextResponse.json(
      {
        success: true,
        data: {
          states: ['all_india', ...states],
          occupations: [
            'farmer',
            'student',
            'entrepreneur',
            'worker',
            'self_employed',
            'govt_employee',
            'unemployed',
            'senior_citizen',
            'other',
          ],
          categories: ['general', 'obc', 'sc', 'st', 'ews', 'minority', 'prefer_not_to_say'],
          educationLevels: ['no_formal', 'school', 'college', 'graduate', 'postgraduate'],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch options',
      },
      { status: 500 }
    );
  }
}

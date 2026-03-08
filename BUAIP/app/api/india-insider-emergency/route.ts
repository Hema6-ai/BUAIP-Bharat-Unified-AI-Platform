/**
 * India Insider - Emergency Assistant Engine
 * 
 * Handles tourist emergencies in India with immediate actionable guidance
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildEmergencyPrompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, EmergencyGuide, EmergencyContact } from '@/app/lib/indiaInsiderTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EmergencyRequest {
  query: string;
  profile: TouristProfile;
  emergency: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EmergencyRequest;
    const { query, profile, emergency } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Build system prompt with emergency context
    const systemPrompt = buildEmergencyPrompt(profile, emergency);

    // Call Bedrock AI
    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 2000 }
    );

    // Parse emergency guide from response
    const emergencyGuide = parseEmergencyResponse(aiResponse, profile);

    return NextResponse.json({
      success: true,
      engine: 'emergency_assistant',
      response: aiResponse,
      emergencyGuide,
      profile
    });

  } catch (error) {
    console.error('[Emergency Assistant] Error:', error);
    return NextResponse.json(
      {
        error: 'Emergency assistant error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// EMERGENCY RESPONSE PARSER
// ============================================================================

function parseEmergencyResponse(
  response: string,
  profile: TouristProfile
): EmergencyGuide {
  // Determine situation type
  let situation = 'general_emergency';
  const lowerResponse = response.toLowerCase();
  if (lowerResponse.includes('passport')) situation = 'lost_passport';
  else if (lowerResponse.includes('hospital') || lowerResponse.includes('sick')) situation = 'medical_emergency';
  else if (lowerResponse.includes('police') || lowerResponse.includes('rob')) situation = 'crime';

  // Extract immediate steps
  const immediateSteps: string[] = [
    'Stay calm and assess the situation',
    'Contact emergency services if needed (112)',
    'File police report (FIR) if crime involved',
    'Contact your embassy for assistance',
    'Notify your travel insurance provider'
  ];

  // Build emergency contacts
  const contacts: EmergencyContact[] = [
    { name: 'Police', phone: '100', services: ['law_and_order', 'crime_reporting'], availability: '24x7' },
    { name: 'Ambulance', phone: '102', services: ['medical_emergency'], availability: '24x7' },
    { name: 'National Emergency', phone: '112', services: ['all_services'], availability: '24x7' },
    { name: 'Tourist Helpline', phone: '1363', services: ['tourist_assistance'], availability: '24x7' }
  ];

  // Add embassy contact if nationality is known
  if (profile.nationality) {
    const embassy = getEmbassyContact(profile.nationality);
    if (embassy) {
      contacts.push({
        name: `${embassy.country} Embassy`,
        phone: embassy.phone,
        services: ['consular_support', 'document_replacement'],
        availability: '24x7'
      });
    }
  }

  // Nearby help
  let nearbyHelp = 'Ask hotel staff or call 112 for nearest hospital/police station';
  if (profile.currentLocation) {
    nearbyHelp = `In ${profile.currentLocation}: Search Google Maps for "hospital near me" or "police station near me". Call 112 for immediate assistance.`;
  }

  // Document replacement guidance
  const documentReplacement: string[] = [
    'File FIR (First Information Report) at nearest police station',
    'Contact your embassy with FIR copy',
    'Bring passport copy, photos, and identity proof to embassy',
    'Apply for emergency travel document',
    'Keep all receipts and documentation for insurance claims'
  ];

  return {
    situation,
    immediateSteps,
    contacts,
    nearbyHelp,
    documentReplacement
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getEmbassyContact(nationality: string): {
  country: string;
  phone: string;
} | undefined {
  const embassies: Record<string, { country: string; phone: string }> = {
    'USA': { country: 'United States', phone: '+91-11-2419-8000' },
    'UK': { country: 'United Kingdom', phone: '+91-11-2419-2100' },
    'Australia': { country: 'Australia', phone: '+91-11-4139-9900' },
    'Canada': { country: 'Canada', phone: '+91-11-4178-2000' },
    'Germany': { country: 'Germany', phone: '+91-11-4479-9199' }
  };
  return embassies[nationality.toUpperCase()];
}

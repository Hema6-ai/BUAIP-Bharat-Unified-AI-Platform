/**
 * India Insider - Payment & Money Engine
 * 
 * Helps tourists navigate India's payment ecosystem (UPI, cash, cards, ATMs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { callBedrock } from '@/app/lib/bedrock';
import { buildPaymentMoneyPrompt } from '@/app/lib/indiaInsiderPrompts';
import { TouristProfile, PaymentGuide } from '@/app/lib/indiaInsiderTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PaymentRequest {
  query: string;
  profile: TouristProfile;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PaymentRequest;
    const { query, profile } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Build system prompt
    const systemPrompt = buildPaymentMoneyPrompt(profile);

    // Call Bedrock AI
    const aiResponse = await callBedrock(
      [{ role: 'user', content: query }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 2000 }
    );

    // Parse payment guide
    const paymentGuide = parsePaymentGuide(aiResponse, profile);

    return NextResponse.json({
      success: true,
      engine: 'payment_money',
      response: aiResponse,
      paymentGuide,
      profile
    });

  } catch (error) {
    console.error('[Payment & Money] Error:', error);
    return NextResponse.json(
      {
        error: 'Payment engine error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PAYMENT GUIDE PARSER
// ============================================================================

function parsePaymentGuide(
  response: string,
  profile: TouristProfile
): PaymentGuide {
  
  return {
    upiSetup: getUPISetup(),
    atmLocations: getATMGuidance(),
    exchangeRates: 'Check XE.com for live rates. Currently ~₹83-84 per USD. Exchange at city offices, not airport (better rates).',
    cashRequirement: estimateDailyCash(profile.budget || 'mid'),
    cardAcceptance: 'Visa/Mastercard widely accepted at hotels, restaurants, malls. Amex limited. Cash needed for: street food, autos, small shops.',
    tips: [
      'Notify bank before travel',
      'Cover PIN at ATMs',
      'Keep ₹10-100 notes handy',
      'UPI requires Indian bank account',
      'Withdraw ₹10,000-20,000 at once to reduce ATM fees'
    ]
  };
}

// ============================================================================
// PAYMENT DATA PROVIDERS
// ============================================================================

function getUPISetup(): string[] {
  return [
    'UPI = Unified Payments Interface (India\'s instant payment system)',
    '1. Get Indian SIM card (Airtel, Jio, Vi)',
    '2. Open Indian bank account (HDFC, ICICI)',
    '3. Download Google Pay, PhonePe, or Paytm',
    '4. Link bank account to UPI app',
    '5. Set UPI PIN',
    'NOTE: Most short-term tourists CANNOT set up UPI (requires Indian bank + phone)'
  ];
}

function getATMGuidance(): string {
  return 'Best banks for international cards: HDFC, ICICI, Axis, SBI. Fees: ₹200-250 per transaction. Withdraw ₹10,000-20,000 at once. Use ATMs inside banks (safer). Cover PIN entry. Avoid standalone ATMs at night.';
}


function estimateDailyCash(budgetLevel: string): string {
  const cashNeeds: Record<string, string> = {
    'budget': '₹800-1,500 ($10-20) per day',
    'mid': '₹1,500-3,000 ($20-40) per day',
    'luxury': '₹2,000-5,000 ($25-60) per day (but cards work at luxury places)'
  };

  return cashNeeds[budgetLevel] || cashNeeds['mid'];
}

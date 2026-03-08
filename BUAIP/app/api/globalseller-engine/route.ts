import { NextRequest, NextResponse } from 'next/server';
import {
  detectGlobalSellerMode,
  GlobalSellerMode,
  isGlobalSellerIntent,
  runGlobalSellerEngine,
} from '@/app/lib/globalSellerEngine';

interface GlobalSellerApiRequest {
  query: string;
  mode?: GlobalSellerMode;
  language?: string;
  voiceResponse?: boolean;
  voiceS3Uri?: string;
  reviewText?: string;
}

// Note: runtime='nodejs' and dynamic='force-dynamic' removed due to conflict with output:'export' in next.config.js

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GlobalSellerApiRequest;

    if (!body.query || !body.query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const mode = body.mode || detectGlobalSellerMode(body.query);
    const result = await runGlobalSellerEngine({
      query: body.query,
      mode,
      language: body.language || 'English',
      voiceResponse: body.voiceResponse,
      voiceS3Uri: body.voiceS3Uri,
      reviewText: body.reviewText,
    });

    return NextResponse.json({ success: true, routedByIntent: isGlobalSellerIntent(body.query), ...result });
  } catch (error) {
    console.error('[GlobalSellerEngine] Route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'GlobalSellerEngine failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

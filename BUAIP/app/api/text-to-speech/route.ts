// Text-to-Speech API Route using AWS Polly
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/app/lib/aws/pollyService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { text, languageCode } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('[TTS API] AWS credentials not configured');
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 503 }
      );
    }

    // Truncate text if too long (Polly has limits)
    const maxLength = 3000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '...'
      : text;

    console.log(`[TTS API] Synthesizing ${truncatedText.length} chars, lang=${languageCode || 'en'}`);

    // Synthesize speech
    const audioData = await synthesizeSpeech(truncatedText, languageCode || 'en');

    // Convert Uint8Array to Buffer for NextResponse
    const buffer = Buffer.from(audioData);

    console.log(`[TTS API] Success — ${buffer.length} bytes MP3`);

    // Return audio as MP3
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[TTS API] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to synthesize speech', detail: error?.message },
      { status: 500 }
    );
  }
}

// Streaming version of unified-ai endpoint
// Returns Server-Sent Events (SSE) for instant text display
// Now uses the full Super Router pipeline — same intelligence as the non-streaming path.

import { NextRequest } from 'next/server';
import { streamSuperRouter } from '@/router/super_router';
import { routeCapability } from '@/router/capability_router';
import { resolveDeterministicFactQuery } from '@/app/lib/realTimeDataService';
import { getLiveWebContextForQuery } from '@/app/lib/liveWebLookupService';
import {
  runCanonicalInputPipeline,
  runCanonicalOutputPipeline,
  normalizeUserLanguage,
} from '@/app/lib/aws/translationPipeline';
import {
  hashQuery,
  getCachedResult,
  setCachedResult,
  tryAnswerLocally,
} from '@/app/lib/performanceLayer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userMessage,
      conversationHistory = [],
      sessionId = 'default',
      selectedLanguage = 'en',
      profileSummary = '',
    } = body;

    if (!userMessage?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Empty message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedSelectedLanguage = normalizeUserLanguage(selectedLanguage);
    const quickLocalAnswer = tryAnswerLocally(userMessage.trim(), normalizedSelectedLanguage);
    if (quickLocalAnswer.handled && quickLocalAnswer.response) {
      const localizedQuickAnswer = await localizeForSSE(
        quickLocalAnswer.response,
        normalizedSelectedLanguage,
      );
      return sseFromText(localizedQuickAnswer, {
        engine: quickLocalAnswer.engine || 'Local Quick Response',
        intent: 'local_quick',
      });
    }

    const rawInputHash = hashQuery(userMessage, normalizedSelectedLanguage);
    const rawCached = getCachedResult(rawInputHash);
    if (rawCached?.response) {
      return sseFromText(rawCached.response, { cacheHit: true, cacheLayer: 'raw' });
    }

    const canonicalInput = await runCanonicalInputPipeline({
      text: userMessage,
      selectedLanguage,
    });
    const responseLanguage = canonicalInput.responseLanguage;
    const normalizedUserMessage = canonicalInput.englishText?.trim() || userMessage.trim();

    // ── LOCAL ANSWERING ──
    const localAnswer = tryAnswerLocally(normalizedUserMessage, responseLanguage);
    if (localAnswer.handled && localAnswer.response) {
      const localizedLocalResponse = await localizeForSSE(localAnswer.response, responseLanguage);
      return sseFromText(localizedLocalResponse, {
        engine: localAnswer.engine || 'Local Quick Response',
        intent: 'local_quick',
      });
    }

    // ── CACHE CHECK ──
    const qHash = hashQuery(normalizedUserMessage, responseLanguage);
    const cached = getCachedResult(qHash);
    if (cached?.response) {
      return sseFromText(cached.response, { cacheHit: true });
    }

    // ── LAYER 1: CAPABILITY ROUTER ──
    const capabilityResult = await routeCapability(normalizedUserMessage, sessionId);
    if (capabilityResult.handled && capabilityResult.response) {
      const localizedCapabilityResponse = await localizeForSSE(capabilityResult.response, responseLanguage);
      return sseFromText(localizedCapabilityResponse, {
        engine: `BUAIP ${capabilityResult.capability || 'Capability'}`,
        intent: capabilityResult.capability || 'capability',
        ...capabilityResult.meta,
      });
    }

    // ── Deterministic fact quick check ──
    // Keep this path fast: avoid waiting on extra vector retrieval here.
    const [factualResult, webContext] = await Promise.all([
      resolveDeterministicFactQuery(normalizedUserMessage),
      getLiveWebContextForQuery(normalizedUserMessage),
    ]);

    const hasWebContext = Boolean(webContext.summary);
    const shouldBypassUnavailableRealtime =
      factualResult.factType === 'unavailable_realtime' && hasWebContext;

    if (factualResult.handled && factualResult.response && !shouldBypassUnavailableRealtime) {
      const localizedFactResponse = await localizeForSSE(factualResult.response, responseLanguage);
      return sseFromText(localizedFactResponse, { engine: 'Real-Time Fact Engine' });
    }

    const liveWebPromptContext = webContext.summary
      ? `\n\nLIVE WEB CONTEXT (Web Lookup):\n${webContext.summary}`
      : '';

    // ── STREAMING via Super Router ──
    const origin = request.nextUrl.origin;
    const { stream, meta } = await streamSuperRouter({
      userMessage: normalizedUserMessage,
      origin,
      conversationHistory: conversationHistory.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      profileSummary: `${profileSummary || ''}${liveWebPromptContext}`,
      selectedLanguage,
      responseLanguage,
      hasLanguageOverride: canonicalInput.hasLanguageOverride,
      languageContext: canonicalInput.languageContext,
    });

    const encoder = new TextEncoder();
    let fullText = '';

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of stream) {
            fullText += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }

          // Translate final text if needed
          let finalText = fullText;
          if (responseLanguage !== 'en') {
            try {
              const translated = await runCanonicalOutputPipeline({
                englishText: fullText,
                targetLanguage: responseLanguage,
              });
              finalText = translated.localizedText;
            } catch { /* use English if translation fails */ }
          }

          // Cache the result
          setCachedResult(qHash, { response: finalText });
          setCachedResult(rawInputHash, { response: finalText });

          // Send done event with metadata
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              fullText: finalText,
              engine: `BUAIP Super Router → ${meta.routedDomains.join(' + ')}`,
              intent: meta.intent,
              routedDomains: meta.routedDomains,
            })}\n\n`
          ));
          controller.close();
        } catch (err: any) {
          console.error('[StreamRoute] Error:', err?.message);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: err?.message || 'Stream error' })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function localizeForSSE(text: string, responseLanguage: string): Promise<string> {
  if (!text || responseLanguage === 'en') {
    return text;
  }

  try {
    const translated = await runCanonicalOutputPipeline({
      englishText: text,
      targetLanguage: normalizeUserLanguage(responseLanguage),
    });
    return translated.localizedText;
  } catch {
    return text;
  }
}

/** Helper: return a complete text as a quick SSE stream */
function sseFromText(text: string, meta: Record<string, any> = {}): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ delta: text })}\n\n`
      ));
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ done: true, fullText: text, ...meta })}\n\n`
      ));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

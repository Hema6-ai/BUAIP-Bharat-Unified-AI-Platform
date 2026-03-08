/**
 * BUAIP Full System Integration Test
 * Tests all 6 domain engines, multi-domain routing, streaming, and capabilities.
 * Run with: node test_system.js
 */

const BASE = 'http://localhost:3000';

// ── Helpers ──

async function testUnifiedAI(label, userMessage, expectParts) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/unified-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        conversationHistory: [],
        sessionId: `test_${Date.now()}`,
        selectedLanguage: 'en',
      }),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      console.log(`❌ [${label}] HTTP ${res.status} (${elapsed}ms)`);
      const body = await res.text();
      console.log(`   Body: ${body.slice(0, 200)}`);
      return { pass: false, label, elapsed, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const response = data.response || '';
    const len = response.length;

    // Check response quality
    const issues = [];
    if (len < 200) issues.push(`Response too short (${len} chars)`);
    if (len < 50) issues.push('Likely empty/error response');

    for (const part of expectParts) {
      if (!response.toLowerCase().includes(part.toLowerCase())) {
        issues.push(`Missing expected content: "${part}"`);
      }
    }

    // Check 5-section structure (at least some sections present)
    const sectionMarkers = ['understanding', 'explanation', 'context', 'guidance', 'follow-up'];
    const sectionsFound = sectionMarkers.filter(s =>
      response.toLowerCase().includes(s)
    ).length;

    if (sectionsFound < 2) {
      issues.push(`Only ${sectionsFound}/5 response sections detected`);
    }

    const pass = issues.length === 0;
    const status = pass ? '✅' : '⚠️';
    console.log(`${status} [${label}] ${len} chars, ${elapsed}ms, engine: ${data.engine || 'N/A'}, intent: ${data.intent || 'N/A'}`);
    if (data.routedDomains) console.log(`   Routed domains: ${JSON.stringify(data.routedDomains)}`);
    if (issues.length > 0) console.log(`   Issues: ${issues.join('; ')}`);

    return { pass, label, elapsed, len, engine: data.engine, intent: data.intent, issues, routedDomains: data.routedDomains };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`❌ [${label}] ERROR: ${err.message} (${elapsed}ms)`);
    return { pass: false, label, elapsed, error: err.message };
  }
}

async function testStreaming(label, userMessage) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/unified-ai-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        conversationHistory: [],
        sessionId: `test_stream_${Date.now()}`,
        selectedLanguage: 'en',
      }),
    });

    if (!res.ok) {
      console.log(`❌ [STREAM: ${label}] HTTP ${res.status}`);
      return { pass: false, label };
    }

    const text = await res.text();
    const lines = text.split('\n').filter(l => l.startsWith('data: '));
    let fullText = '';
    let hasDone = false;
    let meta = {};
    let deltaCount = 0;

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.delta) {
          fullText += data.delta;
          deltaCount++;
        }
        if (data.done) {
          hasDone = true;
          meta = data;
          if (data.fullText) fullText = data.fullText;
        }
      } catch {}
    }

    const elapsed = Date.now() - start;
    const issues = [];
    if (!hasDone) issues.push('Missing done event');
    if (fullText.length < 200) issues.push(`Response too short (${fullText.length} chars)`);
    if (deltaCount < 2) issues.push(`Only ${deltaCount} delta chunks (stream may not be chunking)`);

    const pass = issues.length === 0;
    console.log(`${pass ? '✅' : '⚠️'} [STREAM: ${label}] ${fullText.length} chars, ${deltaCount} chunks, ${elapsed}ms, engine: ${meta.engine || 'N/A'}`);
    if (issues.length > 0) console.log(`   Issues: ${issues.join('; ')}`);

    return { pass, label, elapsed, len: fullText.length, deltaCount, issues };
  } catch (err) {
    console.log(`❌ [STREAM: ${label}] ERROR: ${err.message}`);
    return { pass: false, label, error: err.message };
  }
}

async function testCapability(label, capability, body) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE}/api/ai-capabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ [CAP: ${label}] HTTP ${res.status} (${elapsed}ms): ${errText.slice(0, 200)}`);
      return { pass: false, label, elapsed, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const response = data.response || data.summary || '';
    const pass = response.length > 50;
    console.log(`${pass ? '✅' : '⚠️'} [CAP: ${label}] ${response.length} chars, ${elapsed}ms`);
    if (!pass) console.log(`   Response: ${response.slice(0, 200)}`);

    return { pass, label, elapsed, len: response.length };
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`❌ [CAP: ${label}] ERROR: ${err.message} (${elapsed}ms)`);
    return { pass: false, label, elapsed, error: err.message };
  }
}

// ── Main Test Suite ──

async function runAllTests() {
  console.log('='.repeat(70));
  console.log('BUAIP FULL SYSTEM INTEGRATION TEST');
  console.log('='.repeat(70));
  console.log();

  const results = [];

  // ── TEST 1: Agriculture Engine ──
  console.log('── DOMAIN ENGINE TESTS ──');
  results.push(await testUnifiedAI(
    'Agriculture',
    'I have 3 acres of land in Telangana with borewell irrigation. Which crops should I grow this season?',
    ['crop', 'telangana']
  ));

  // ── TEST 2: Scheme Engine ──
  results.push(await testUnifiedAI(
    'Scheme',
    'What government schemes are available for small farmers?',
    ['scheme']
  ));

  // ── TEST 3: Legal Engine ──
  results.push(await testUnifiedAI(
    'Legal',
    'My landlord is trying to evict me without notice. What are my legal rights?',
    ['rights', 'legal']
  ));

  // ── TEST 4: Tourism Engine ──
  results.push(await testUnifiedAI(
    'Tourism',
    "I'm visiting India from Germany. What should I know about safety and payments?",
    ['safety']
  ));

  // ── TEST 5: Career Engine ──
  results.push(await testUnifiedAI(
    'Career',
    "I'm a student who finished 12th with PCM. What careers can I pursue?",
    ['career']
  ));

  // ── TEST 6: Commerce Engine ──
  results.push(await testUnifiedAI(
    'Commerce',
    'I want to sell handmade products online. Which platforms should I use?',
    ['platform']
  ));

  console.log();

  // ── TEST 7: Multi-domain ──
  console.log('── MULTI-DOMAIN TESTS ──');
  results.push(await testUnifiedAI(
    'Multi: Agri+Scheme',
    'Are there government subsidies for drip irrigation systems?',
    ['irrigation']
  ));

  results.push(await testUnifiedAI(
    'Multi: Career+Scheme',
    'Are there government scholarships for students pursuing engineering after 12th?',
    ['scholarship']
  ));

  console.log();

  // ── TEST 8-10: Streaming ──
  console.log('── STREAMING TESTS ──');
  results.push(await testStreaming(
    'Agriculture Stream',
    'What are the best crops for red soil in Andhra Pradesh?'
  ));

  results.push(await testStreaming(
    'Legal Stream',
    'What should I do if I receive a fake legal notice?'
  ));

  results.push(await testStreaming(
    'Career Stream',
    'What career options exist after B.Tech in Computer Science?'
  ));

  console.log();

  // ── TEST 11-12: Capability Router ──
  console.log('── CAPABILITY TESTS ──');
  results.push(await testCapability(
    'Learning Mode Start',
    'learning-start',
    { capability: 'learning-start', topic: 'How does GST work in India?', sessionId: 'test_learn_001' }
  ));

  results.push(await testCapability(
    'Learning Mode Continue',
    'learning-continue',
    { capability: 'learning-continue', userAnswer: 'GST is a tax on goods and services', sessionId: 'test_learn_001' }
  ));

  console.log();

  // ── SUMMARY ──
  console.log('='.repeat(70));
  console.log('TEST SUMMARY');
  console.log('='.repeat(70));
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log();

  if (failed > 0) {
    console.log('FAILED TESTS:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ❌ ${r.label}: ${r.error || (r.issues || []).join('; ')}`);
    }
  } else {
    console.log('🎉 ALL TESTS PASSED!');
  }

  // Performance summary
  const avgTime = Math.round(results.reduce((s, r) => s + (r.elapsed || 0), 0) / total);
  const maxTime = Math.max(...results.map(r => r.elapsed || 0));
  console.log(`\nAvg response time: ${avgTime}ms | Max: ${maxTime}ms`);
}

runAllTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});

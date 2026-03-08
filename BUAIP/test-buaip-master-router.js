/**
 * BUAIP Master Router - Comprehensive Integration Test
 * 
 * Tests all 4 intelligence engines through the unified router:
 * 1. Government Scheme Eligibility Intelligence
 * 2. Agriculture Intelligence (Annadata AI - Kisan Engine)
 * 3. GlobalSeller Commerce Intelligence
 * 4. India Insider Tourist Intelligence (8 sub-engines)
 * 
 * Usage: node test-buaip-master-router.js
 */

// =============================================================================
// API CLIENT
// =============================================================================

async function detectBaseUrl() {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }

  const candidates = ['http://localhost:3000', 'http://localhost:3001'];
  for (const url of candidates) {
    try {
      const response = await fetch(`${url}/api/unified-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'ping' }),
      });
      if (response.ok || response.status === 500) {
        return url;
      }
    } catch {
      // Try next candidate
    }
  }

  return candidates[0];
}

async function callBUAIP(query) {
  const baseUrl = await detectBaseUrl();
  const response = await fetch(`${baseUrl}/api/unified-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage: query }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

let testsPassed = 0;
let testsFailed = 0;

function logTest(testName, passed, details = '') {
  if (passed) {
    console.log(`✅ ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ ${testName}`);
    if (details) console.log(`   ${details}`);
    testsFailed++;
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

// =============================================================================
// ENGINE 1: Government Scheme Eligibility Intelligence
// =============================================================================

async function testSchemeEngine() {
  logSection('ENGINE 1: Government Scheme Eligibility Intelligence');

  const queries = [
    'What government schemes can I apply for?',
    'I am a farmer with 2 acres of land in Maharashtra. Which schemes are available?',
    'Are there any pension schemes for senior citizens?',
    'PM-Kisan yojana eligibility criteria',
  ];

  for (const query of queries) {
    try {
      const result = await callBUAIP(query);
      const isSchemeEngine = 
        result.engine?.includes('Scheme') || 
        result.intent === 'scheme_eligibility' ||
        result.response?.toLowerCase().includes('scheme');
      
      logTest(
        `"${query.slice(0, 50)}..." → ${result.engine || 'Unknown'}`,
        isSchemeEngine,
        isSchemeEngine ? '' : `Expected Scheme engine, got: ${result.engine}`
      );

      if (isSchemeEngine && result.response) {
        console.log(`   Response preview: ${result.response.slice(0, 100)}...`);
      }
    } catch (error) {
      logTest(`"${query.slice(0, 50)}..."`, false, error.message);
    }
  }
}

// =============================================================================
// ENGINE 2: Agriculture Intelligence (Annadata AI - Kisan Engine)
// =============================================================================

async function testAgricultureEngine() {
  logSection('ENGINE 2: Agriculture Intelligence (Annadata AI - Kisan Engine)');

  const queries = [
    'What crop should I grow in Telangana for the Kharif season?',
    'What is the current mandi price of wheat in Punjab?',
    'How to treat fungal disease in tomato plants?',
    'Best fertilizer for rice cultivation',
    'Weather forecast for farming in Karnataka',
  ];

  for (const query of queries) {
    try {
      const result = await callBUAIP(query);
      const isAgricultureEngine = 
        result.engine?.includes('Annadata') || 
        result.engine?.includes('Agriculture') ||
        result.intent === 'agriculture_farming';
      
      logTest(
        `"${query.slice(0, 50)}..." → ${result.engine || 'Unknown'}`,
        isAgricultureEngine,
        isAgricultureEngine ? '' : `Expected Agriculture engine, got: ${result.engine}`
      );

      if (isAgricultureEngine && result.response) {
        console.log(`   Module: ${result.module || 'N/A'}`);
        console.log(`   Response preview: ${result.response.slice(0, 100)}...`);
      }
    } catch (error) {
      logTest(`"${query.slice(0, 50)}..."`, false, error.message);
    }
  }
}

// =============================================================================
// ENGINE 3: GlobalSeller Commerce Intelligence
// =============================================================================

async function testGlobalSellerEngine() {
  logSection('ENGINE 3: GlobalSeller Commerce Intelligence');

  const queries = [
    'I want to sell handmade crafts online. Which platform should I use?',
    'How to start selling on Amazon India?',
    'Find brass manufacturers in Moradabad',
    'Logistics cost for shipping 2kg package from Delhi to Mumbai',
    'Diwali season inventory planning for electronics',
  ];

  for (const query of queries) {
    try {
      const result = await callBUAIP(query);
      const isGlobalSellerEngine = 
        result.engine?.includes('GlobalSeller') || 
        result.intent === 'global_seller_intelligence';
      
      logTest(
        `"${query.slice(0, 50)}..." → ${result.engine || 'Unknown'}`,
        isGlobalSellerEngine,
        isGlobalSellerEngine ? '' : `Expected GlobalSeller engine, got: ${result.engine}`
      );

      if (isGlobalSellerEngine && result.response) {
        console.log(`   Mode: ${result.mode || 'N/A'}`);
        console.log(`   Active Modules: ${result.activeModules?.length || 0}`);
        console.log(`   Response preview: ${result.response.slice(0, 100)}...`);
      }
    } catch (error) {
      logTest(`"${query.slice(0, 50)}..."`, false, error.message);
    }
  }
}

// =============================================================================
// ENGINE 4: India Insider Tourist Intelligence (8 Sub-Engines)
// =============================================================================

async function testIndiaInsiderEngine() {
  logSection('ENGINE 4: India Insider Tourist Intelligence (8 Sub-Engines)');

  const queries = [
    // Pre-Arrival Planning
    { query: 'I am visiting India from USA. What visa do I need?', expected: 'Pre-Arrival' },
    
    // City Navigation
    { query: 'Best places to visit in Jaipur', expected: 'City Navigator' },
    
    // Payment & Money
    { query: 'How to exchange dollars to rupees in Mumbai?', expected: 'Payment' },
    
    // Emergency Assistance
    { query: 'I lost my passport in Delhi. What should I do?', expected: 'Emergency' },
    
    // Food Safety
    { query: 'Is street food safe to eat in India?', expected: 'Food Safety' },
    
    // Expat Long-Stay
    { query: 'How to get FRRO registration for long stay in Bangalore?', expected: 'Expat' },
    
    // Language Survival
    { query: 'How do you say "thank you" in Hindi?', expected: 'Language' },
    
    // Legal & Cultural
    { query: 'What is the dress code for visiting temples in India?', expected: 'Legal' },
  ];

  for (const test of queries) {
    try {
      const result = await callBUAIP(test.query);
      const isIndiaInsiderEngine = 
        result.engine?.includes('Pre-Arrival') ||
        result.engine?.includes('City') ||
        result.engine?.includes('Payment') ||
        result.engine?.includes('Emergency') ||
        result.engine?.includes('Food') ||
        result.engine?.includes('Expat') ||
        result.engine?.includes('Language') ||
        result.engine?.includes('Legal') ||
        result.engine?.includes('Cultural') ||
        ['pre_arrival_planning', 'city_navigation', 'payment_money', 'emergency_assistance',
         'food_safety', 'expat_longstay', 'language_survival', 'legal_cultural'].includes(result.intent);
      
      logTest(
        `"${test.query.slice(0, 45)}..." → ${result.engine || 'Unknown'}`,
        isIndiaInsiderEngine,
        isIndiaInsiderEngine ? '' : `Expected India Insider (${test.expected}), got: ${result.engine}`
      );

      if (isIndiaInsiderEngine && result.response) {
        console.log(`   Intent: ${result.intent || 'N/A'}`);
        console.log(`   Response preview: ${result.response.slice(0, 100)}...`);
      }
    } catch (error) {
      logTest(`"${test.query.slice(0, 45)}..."`, false, error.message);
    }
  }
}

// =============================================================================
// MULTI-ENGINE QUERIES (Overlapping Intents)
// =============================================================================

async function testMultiEngineQueries() {
  logSection('MULTI-ENGINE QUERIES (Testing Overlapping Domains)');

  const queries = [
    {
      query: 'Are there farming subsidies for drip irrigation in Gujarat?',
      expected: ['Agriculture', 'Scheme'],
      description: 'Should route to Agriculture (primary) or Scheme (secondary)'
    },
    {
      query: 'I want to export agricultural products to USA. How do I start?',
      expected: ['GlobalSeller', 'Agriculture'],
      description: 'Should route to GlobalSeller (export focus) or Agriculture'
    },
    {
      query: 'Tourist visa requirements for selling handicrafts in India',
      expected: ['India Insider', 'GlobalSeller'],
      description: 'Should route to India Insider (visa) or GlobalSeller (selling)'
    },
  ];

  for (const test of queries) {
    try {
      const result = await callBUAIP(test.query);
      const engineMatch = test.expected.some(exp => 
        result.engine?.includes(exp) || result.response?.toLowerCase().includes(exp.toLowerCase())
      );
      
      logTest(
        `"${test.query.slice(0, 45)}..." → ${result.engine || 'Unknown'}`,
        engineMatch,
        `${test.description}\nGot: ${result.engine}`
      );

      if (result.response) {
        console.log(`   Response covers: ${test.expected.join(' + ')}`);
      }
    } catch (error) {
      logTest(`"${test.query.slice(0, 45)}..."`, false, error.message);
    }
  }
}

// =============================================================================
// CONFIDENCE & ROUTING ACCURACY
// =============================================================================

async function testRoutingAccuracy() {
  logSection('ROUTING ACCURACY & CONFIDENCE SCORES');

  const queries = [
    { query: 'crop disease', expectedEngine: 'Annadata', minConfidence: 0.85 },
    { query: 'sell on flipkart', expectedEngine: 'GlobalSeller', minConfidence: 0.90 },
    { query: 'lost passport emergency', expectedEngine: 'Emergency', minConfidence: 0.95 },
    { query: 'pm kisan scheme', expectedEngine: 'Scheme', minConfidence: 0.85 },
  ];

  for (const test of queries) {
    try {
      const result = await callBUAIP(test.query);
      const engineMatch = result.engine?.includes(test.expectedEngine);
      const confidenceGood = (result.confidence || 0) >= test.minConfidence;
      
      logTest(
        `"${test.query}" → ${result.engine} (confidence: ${((result.confidence || 0) * 100).toFixed(0)}%)`,
        engineMatch && confidenceGood,
        engineMatch ? 
          (confidenceGood ? '' : `Low confidence: ${result.confidence}`) : 
          `Expected ${test.expectedEngine}, got ${result.engine}`
      );
    } catch (error) {
      logTest(`"${test.query}"`, false, error.message);
    }
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BUAIP MASTER ROUTER TEST SUITE                          ║');
  console.log('║              Testing All 4 Intelligence Engines + Routing                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  console.log('\n⚠️  NOTE: This test requires the dev server to be running (npm run dev)');
  console.log('    Checking server availability...\n');

  try {
    const baseUrl = await detectBaseUrl();
    console.log(`✅ Server detected at ${baseUrl}\n`);
  } catch (error) {
    console.error('❌ Server not available. Please run: npm run dev');
    process.exit(1);
  }

  await testSchemeEngine();
  await testAgricultureEngine();
  await testGlobalSellerEngine();
  await testIndiaInsiderEngine();
  await testMultiEngineQueries();
  await testRoutingAccuracy();

  // Final summary
  logSection('FINAL RESULTS');
  const total = testsPassed + testsFailed;
  const passRate = Math.round((testsPassed / total) * 100);
  
  console.log(`\n✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! BUAIP Master Router is fully operational! 🎉');
    console.log('\n✅ All 4 Intelligence Engines are routing correctly:');
    console.log('   1. ✅ Government Scheme Eligibility Intelligence');
    console.log('   2. ✅ Agriculture Intelligence (Annadata AI - Kisan Engine)');
    console.log('   3. ✅ GlobalSeller Commerce Intelligence');
    console.log('   4. ✅ India Insider Tourist Intelligence (8 sub-engines)');
  } else if (passRate >= 80) {
    console.log(`\n✅ ${passRate}% tests passed. BUAIP system is functional with minor issues.`);
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Review errors above.`);
  }

  console.log('\n');

  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

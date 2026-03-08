// India Insider - Integration test for all 8 engines
// Usage:
//   node test-india-insider-all-engines.js
// Optional:
//   BASE_URL=http://localhost:3001 node test-india-insider-all-engines.js

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
      if (response.ok) {
        return url;
      }
    } catch {
      // Try next candidate.
    }
  }

  return candidates[0];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runTest(name, url, body, checks) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') || '';
    assert(contentType.includes('application/json'), `Expected JSON, got ${contentType}`);

    const data = await response.json();
    assert(response.status === 200, `Expected status 200, got ${response.status}`);
    assert(data.success === true, 'Expected success=true');

    for (const check of checks) {
      check(data);
    }

    console.log(`PASS | ${name} | status=${response.status} | engine=${data.engine}`);
    return { passed: true, name };
  } catch (error) {
    console.log(`FAIL | ${name} | ${error.message}`);
    return { passed: false, name, error: error.message };
  }
}

async function main() {
  const baseUrl = await detectBaseUrl();
  console.log(`Using base URL: ${baseUrl}`);
  console.log('Running India Insider integration tests for all 8 engines...\n');

  const tests = [
    {
      name: '1. Pre-Arrival Planner',
      url: `${baseUrl}/api/india-insider-prearival`,
      body: {
        query: 'I am from Canada. What documents do I need before arriving in India?',
        profile: { nationality: 'Canada', destination: 'Delhi' },
      },
      checks: [
        (d) => assert(d.engine === 'pre_arrival_planner', 'Unexpected engine name'),
        (d) => assert(!!d.preArrivalPlan, 'Missing preArrivalPlan'),
      ],
    },
    {
      name: '2. City Navigator',
      url: `${baseUrl}/api/india-insider-citynavigator`,
      body: {
        query: 'What are must-visit places in Delhi and transport tips?',
        profile: { nationality: 'UK', budget: 'mid' },
        city: 'Delhi',
      },
      checks: [
        (d) => assert(d.engine === 'city_navigator', 'Unexpected engine name'),
        (d) => assert(!!d.cityGuide, 'Missing cityGuide'),
      ],
    },
    {
      name: '3. Payment & Money Guide',
      url: `${baseUrl}/api/india-insider-payment`,
      body: {
        query: 'How much cash should I carry daily and can I use UPI as tourist?',
        profile: { nationality: 'USA', budget: 'mid' },
      },
      checks: [
        (d) => assert(d.engine === 'payment_money', 'Unexpected engine name'),
        (d) => assert(!!d.paymentGuide, 'Missing paymentGuide'),
      ],
    },
    {
      name: '4. Emergency Assistant',
      url: `${baseUrl}/api/india-insider-emergency`,
      body: {
        query: 'I lost my passport in Mumbai. What should I do now?',
        profile: { nationality: 'Australia', currentLocation: 'Mumbai' },
        emergency: 'lost_passport',
      },
      checks: [
        (d) => assert(d.engine === 'emergency_assistant', 'Unexpected engine name'),
        (d) => assert(!!d.emergencyGuide, 'Missing emergencyGuide'),
      ],
    },
    {
      name: '5. Food Safety Intelligence',
      url: `${baseUrl}/api/india-insider-foodsafety`,
      body: {
        query: 'I have nut allergy. What should I safely eat in Delhi?',
        profile: { nationality: 'USA', dietaryRestrictions: ['vegetarian'] },
        city: 'Delhi',
        allergies: ['nuts'],
      },
      checks: [
        (d) => assert(d.engine === 'food_safety_intelligence', 'Unexpected engine name'),
        (d) => assert(!!d.foodSafetyGuide, 'Missing foodSafetyGuide'),
      ],
    },
    {
      name: '6. Expat Long-Stay Specialist',
      url: `${baseUrl}/api/india-insider-expat`,
      body: {
        query: 'I am moving to Bangalore for 8 months for work. Guide me on FRRO and housing.',
        profile: { nationality: 'Germany' },
        city: 'Bangalore',
        stayDurationMonths: 8,
        purpose: 'work',
      },
      checks: [
        (d) => assert(d.engine === 'expat_longstay_specialist', 'Unexpected engine name'),
        (d) => assert(!!d.expatGuide, 'Missing expatGuide'),
      ],
    },
    {
      name: '7. Language Survival Teacher',
      url: `${baseUrl}/api/india-insider-language`,
      body: {
        query: 'Teach me essential phrases for Mumbai taxi and shopping.',
        profile: { nationality: 'France' },
        touristLanguage: 'French',
        city: 'Mumbai',
      },
      checks: [
        (d) => assert(d.engine === 'language_survival_teacher', 'Unexpected engine name'),
        (d) => assert(!!d.languageGuide, 'Missing languageGuide'),
        (d) => assert(d.languageGuide.totalPhrases >= 20, 'Expected at least 20 phrases'),
      ],
    },
    {
      name: '8. Legal & Cultural Rules Expert',
      url: `${baseUrl}/api/india-insider-legal`,
      body: {
        query: 'What legal and etiquette rules apply for temple visits and photography in Jaipur?',
        profile: { nationality: 'Canada' },
        location: 'Jaipur',
        situation: 'temple and photography',
      },
      checks: [
        (d) => assert(d.engine === 'legal_cultural_rules_expert', 'Unexpected engine name'),
        (d) => assert(!!d.legalCulturalGuide, 'Missing legalCulturalGuide'),
      ],
    },
  ];

  const results = [];
  for (const test of tests) {
    const result = await runTest(test.name, test.url, test.body, test.checks);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const successRate = ((passed / results.length) * 100).toFixed(1);

  console.log('\n================ INDIA INSIDER TEST SUMMARY ================');
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${successRate}%`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter((x) => !x.passed)) {
      console.log(`- ${r.name}: ${r.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log('\nAll 8 India Insider engines passed integration tests.');
  }
}

main().catch((error) => {
  console.error('Fatal test runner error:', error.message);
  process.exit(1);
});

/**
 * BUAIP 100% Routing Accuracy Test
 * Tests all 4 engines to achieve perfect routing
 */

const http = require('http');

// Test queries organized by expected engine
const testCases = {
  'Government Scheme Eligibility': {
    expectedEngine: 'Government Scheme Eligibility Intelligence',
    expectedIntent: 'scheme_eligibility',
    queries: [
      'What government schemes can I apply for?',
      'Are there any pension schemes for senior citizens?',
      'PM-Kisan yojana eligibility criteria',
      'What benefits am I eligible for as a senior citizen?'
    ]
  },
  'Agriculture Intelligence': {
    expectedEngine: 'Annadata Agriculture Intelligence',
    expectedIntent: 'agriculture_farming',
    queries: [
      'What crop should I grow in Telangana for the Kharif season?',
      'What is the current mandi price of wheat in Punjab?',
      'How to treat fungal disease in tomato plants?',
      'Best fertilizer for rice cultivation',
      'Weather forecast for farming in Karnataka'
    ]
  },
  'GlobalSeller Commerce': {
    expectedEngine: 'GlobalSellerEngine',
    expectedIntent: 'global_seller_intelligence',
    queries: [
      'I want to sell handmade crafts online. Which platforms?',
      'How to start selling on Amazon India?',
      'Find brass manufacturers in Moradabad',
      'Diwali season inventory planning for electronics',
      'Logistics cost for shipping 2kg package from Delhi'
    ]
  },
  'India Insider Tourist': {
    expectedEngine: 'Pre-Arrival Planner|City Navigator|Payment & Money Expert|Emergency Assistant|Food Safety Expert|Expat Longstay Specialist|Language Survival Teacher|Legal & Cultural Expert',
    expectedIntent: 'pre_arrival_planning|city_navigation|payment_money|emergency_assistance|food_safety|expat_longstay|language_survival|legal_cultural',
    queries: [
      'I am visiting India from USA. What visa requirements do I need?',
      'Best places to visit in Jaipur for a first-time tourist',
      'How to exchange dollars to rupees in Mumbai?',
      'I lost my passport in Delhi. What should I do?',
      'Is street food safe to eat in India?',
      'How to get FRRO registration for long stay in India?',
      'How do you say thank you in Hindi?',
      'What are the dress code rules for visiting a temple in India?'
    ]
  }
};

function callAPI(userMessage) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ userMessage });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/unified-ai',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function checkMatch(actual, expected) {
  if (expected.includes('|')) {
    // Multi-option (for India Insider)
    return expected.split('|').some(opt => actual.includes(opt));
  }
  return actual.includes(expected);
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║      BUAIP 100% ROUTING ACCURACY TEST - ALL ENGINES            ║');
  console.log('║           Target: 100% routing success for all queries         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  let totalTests = 0;
  let totalPassed = 0;
  const categoryResults = {};

  for (const [category, testData] of Object.entries(testCases)) {
    console.log(`\n${'═'.repeat(66)}`);
    console.log(`${category.toUpperCase()}`);
    console.log('═'.repeat(66));

    let categoryPassed = 0;

    for (const query of testData.queries) {
      totalTests++;
      const queryDisplay = query.length > 50 ? query.substring(0, 47) + '...' : query;

      try {
        const response = await callAPI(query);
        
        // Check if engine matches
        const engineMatch = checkMatch(response.engine, testData.expectedEngine);
        const intentMatch = checkMatch(response.intent, testData.expectedIntent);
        
        const passed = engineMatch && intentMatch;
        
        if (passed) {
          categoryPassed++;
          totalPassed++;
          console.log(`\n✅ "${queryDisplay}"`);
        } else {
          console.log(`\n❌ "${queryDisplay}"`);
          console.log(`   Expected: ${testData.expectedEngine}`);
          console.log(`   Got: ${response.engine}`);
          if (!intentMatch) {
            console.log(`   Expected Intent: ${testData.expectedIntent}`);
            console.log(`   Got Intent: ${response.intent}`);
          }
        }
        
        console.log(`   Confidence: ${(response.confidence * 100).toFixed(0)}%`);
        
      } catch (error) {
        console.log(`\n❌ "${queryDisplay}"`);
        console.log(`   Error: ${error.message}`);
      }
    }

    const passRate = ((categoryPassed / testData.queries.length) * 100).toFixed(0);
    console.log(`\n${category}: ${categoryPassed}/${testData.queries.length} ✅ (${passRate}%)`);
    categoryResults[category] = { passed: categoryPassed, total: testData.queries.length, rate: parseFloat(passRate) };
  }

  // Summary
  console.log(`\n${'═'.repeat(66)}`);
  console.log('FINAL TEST RESULTS');
  console.log('═'.repeat(66));

  for (const [category, result] of Object.entries(categoryResults)) {
    const status = result.rate === 100 ? '✅' : result.rate >= 80 ? '⚠️ ' : '❌';
    console.log(`${status} ${category.padEnd(30)} ${result.passed}/${result.total} (${result.rate}%)`);
  }

  const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);
  console.log(`\n${'─'.repeat(66)}`);
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
  console.log('─'.repeat(66));

  if (overallRate >= 100) {
    console.log('\n🏆 PERFECT! All 4 engines routing at 100% accuracy! 🎉\n');
  } else if (overallRate >= 90) {
    console.log('\n✅ EXCELLENT! 90%+ routing accuracy achieved!\n');
  } else if (overallRate >= 80) {
    console.log('\n⚠️ GOOD - 80%+ routing, but some improvements needed\n');
  } else {
    console.log('\n❌ NEEDS WORK - Below 80% accuracy\n');
  }
}

runTests().catch(console.error);

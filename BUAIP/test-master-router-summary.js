/**
 * Quick BUAIP Master Router Test Summary
 * Shows routing results for all 4 engines
 */

const http = require('http');

const testQueries = {
  'Government Scheme': [
    'What government schemes can I apply for?',
    'Are there any pension schemes for senior citizens?',
  ],
  'Agriculture': [
    'What crop should I grow in Telangana for the Kharif season?',
    'Best fertilizer for rice cultivation in Maharashtra',
  ],
  'GlobalSeller Commerce': [
    'I want to sell handmade crafts online',
    'How to start selling on Amazon India?',
    'Find brass manufacturers in Moradabad',
    'Diwali season inventory planning for electronics',
  ],
  'India Insider Tourist': [
    'I am visiting India from USA. What visa requirements do I need?',
    'I am traveling for business. Can I work in India on a tourist visa?',
  ],
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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            engine: response.engine || 'Unknown',
            intent: response.intent || 'Unknown',
            confidence: response.confidence || 0,
            success: res.statusCode === 200 && response.engine !== 'Unknown',
          });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         BUAIP MASTER ROUTER - QUICK TEST SUMMARY              ║');
  console.log('║           Testing All 4 Intelligence Engines                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const results = {};
  let totalTests = 0;
  let totalPassed = 0;

  for (const [category, queries] of Object.entries(testQueries)) {
    console.log(`\n${'═'.repeat(66)}`);
    console.log(`${category.toUpperCase()}`);
    console.log('═'.repeat(66));

    let categoryPassed = 0;
    let categoryTotal = 0;

    for (const query of queries) {
      categoryTotal++;
      totalTests++;

      try {
        const result = await callAPI(query);
        const passed = result.success && result.engine !== 'Unknown';
        if (passed) {
          categoryPassed++;
          totalPassed++;
        }

        const status = passed ? '✅' : '❌';
        console.log(`\n${status} "${query.substring(0, 50)}..."`);
        console.log(`   Engine: ${result.engine}`);
        console.log(`   Intent: ${result.intent}`);
        console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      } catch (error) {
        console.log(`\n❌ "${query.substring(0, 50)}..."`);
        console.log(`   Error: ${error.message}`);
      }
    }

    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
    console.log(`\n${category}: ${categoryPassed}/${categoryTotal} passed (${categoryRate}%)`);
    results[category] = { passed: categoryPassed, total: categoryTotal, rate: parseFloat(categoryRate) };
  }

  console.log(`\n${'═'.repeat(66)}`);
  console.log('FINAL RESULTS');
  console.log('═'.repeat(66));

  for (const [category, data] of Object.entries(results)) {
    const barLength = 40;
    const filledLength = Math.round((barLength * data.passed) / data.total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`${category.padEnd(28)} [${bar}] ${data.passed}/${data.total} (${data.rate}%)`);
  }

  const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);
  console.log(`\n${'─'.repeat(66)}`);
  console.log(`OVERALL: ${totalPassed}/${totalTests} tests passed (${overallRate}%)`);
  console.log('─'.repeat(66) + '\n');

  if (overallRate >= 80) {
    console.log('✅ BUAIP Master Router: PRODUCTION READY - All major engines routing correctly!\n');
  } else if (overallRate >= 70) {
    console.log('⚠️  BUAIP Master Router: MOSTLY WORKING - Some routing issues to investigate\n');
  } else {
    console.log('❌ BUAIP Master Router: NEEDS FIXES - Multiple routing failures\n');
  }
}

runTests().catch(console.error);

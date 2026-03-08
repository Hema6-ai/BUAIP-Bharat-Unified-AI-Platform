/**
 * BUAIP Quick Routing Test
 * Tests that all 4 engines route correctly
 */

async function testRouting() {
  const testQueries = [
    // Scheme queries
    { query: 'What schemes can I apply for?', expected: 'Scheme' },
    { query: 'PM-Kisan eligibility', expected: ['Scheme', 'Agriculture'] },
    
    // Agriculture queries  
    { query: 'Best crop for Karnataka', expected: 'Agriculture' },
    { query: 'Fertilizer recommendation', expected: 'Agriculture' },
    
    // GlobalSeller queries
    { query: 'Sell on Amazon', expected: 'GlobalSeller' },
    { query: 'Manufacturing hub Moradabad', expected: 'GlobalSeller' },
    
    // Tourist queries
    { query: 'Lost passport in Delhi', expected: 'Emergency' },
    { query: 'Street food safe?', expected: 'Food' },
  ];

  const baseUrl = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  console.log('\n🧪 BUAIP QUICK ROUTING TEST\n');
  console.log('='.repeat(80));

  for (const test of testQueries) {
    try {
      const response = await fetch(`${baseUrl}/api/unified-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: test.query }),
      });

      const data = await response.json();
      const expected = Array.isArray(test.expected) ? test.expected : [test.expected];
      const matched = expected.some(exp => data.engine?.includes(exp));

      if (matched) {
        console.log(`✅ "${test.query}" → ${data.engine}`);
        passed++;
      } else {
        console.log(`❌ "${test.query}" → ${data.engine} (expected: ${test.expected})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ "${test.query}" → ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Passed: ${passed}  ❌ Failed: ${failed}  📊 Rate: ${Math.round(passed/(passed+failed)*100)}%\n`);
}

testRouting().catch(console.error);

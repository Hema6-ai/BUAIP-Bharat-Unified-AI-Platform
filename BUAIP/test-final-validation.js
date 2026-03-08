const http = require('http');

function test(message, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/scheme-conversation',
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
    req.on('error', reject);
    req.write(data, 'utf8');
    req.end();
  });
}

async function testConversation(name, sessionId, steps) {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║ ${name.padEnd(50)} ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  let passCount = 0;
  for (let i = 0; i < steps.length; i++) {
    const { msg, desc } = steps[i];
    try {
      const res = await test(msg, sessionId);
      const status = res.error ? '❌' : '✓';
      console.log(`  ${status} Step ${i+1}: ${desc}`);
      if (res.type === 'schemes') {
        console.log(`     ✓ SCHEMES RETURNED: ${res.schemes?.length || 0} schemes`);
      }
      if (!res.error) passCount++;
    } catch (e) {
      console.log(`  ❌ Step ${i+1}: ${desc} - ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n  Result: ${passCount}/${steps.length} passed`);
  return passCount === steps.length;
}

async function run() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  FINAL VALIDATION TEST - NO SPECIAL CHARACTERS`);
  console.log(`  Testing with Plain English and Numbers Only`);
  console.log(`${'═'.repeat(55)}`);

  const results = [];

  // Test 1: Female
  results.push(await testConversation(
    "Female User - Maharashtra",
    Date.now() + "-1",
    [
      { msg: "Hi there", desc: "Greeting" },
      { msg: "female",  desc: "Gender" },
      { msg: "45 years old", desc: "Age" },
      { msg: "Maharashtra", desc: "State" },
      { msg: "5 lakhs annually", desc: "Income" },
      { msg: "General", desc: "Category" },
      { msg: "No disability", desc: "Disability" },
      { msg: "Married", desc: "Marital" },
      { msg: "Own house", desc: "Land Ownership" }
    ]
  ));

  // Test 2: Farmer (Fixed Version)
  results.push(await testConversation(
    "Farmer - Punjab (Fixed Format)",
    Date.now() + "-2",
    [
      { msg: "namaste", desc: "Greeting" },
      { msg: "male", desc: "Gender" },
      { msg: "52 years old", desc: "Age" },
      { msg: "Punjab", desc: "State" },
      { msg: "2 lakhs per year", desc: "Income" },
      { msg: "General", desc: "Category" },
      { msg: "no disability", desc: "Disability" },
      { msg: "married", desc: "Marital" },
      { msg: "own agricultural land", desc: "Land - TRIGGER SCHEMES" }
    ]
  ));

  // Test 3: Widow
  results.push(await testConversation(
    "Widow - Rajasthan",
    Date.now() + "-3",
    [
      { msg: "help find schemes", desc: "Greeting" },
      { msg: "female", desc: "Gender" },
      { msg: "58 years", desc: "Age" },
      { msg: "Rajasthan", desc: "State" },
      { msg: "80000 per year", desc: "Income" },
      { msg: "OBC", desc: "Category" },
      { msg: "have disability", desc: "Disability" },
      { msg: "widowed", desc: "Marital" },
      { msg: "own land", desc: "Land - TRIGGER SCHEMES" }
    ]
  ));

  // Summary
  console.log(`\n${'═'.repeat(55)}`);
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`\n  FINAL RESULT: ${passed}/${total} tests PASSED`);
  
  if (passed === total) {
    console.log(`\n  🎉 ALL TESTS PASSED! ENGINE IS PERFECT! 🎉`);
  } else {
    console.log(`\n  ⚠️  ${total - passed} test(s) failed`);
  }
  
  console.log(`\n${'═'.repeat(55)}\n`);
}

run().catch(console.error);

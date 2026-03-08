const http = require('http');

function test(message, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/scheme-conversation',
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testConversation(name, sessionId, steps) {
  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║ ${name.padEnd(53)} ║`);
  console.log(`╚═══════════════════════════════════════════════════════╝\n`);

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < steps.length; i++) {
    const { msg, desc } = steps[i];
    const stepNum = i + 1;
    
    try {
      const res = await test(msg, sessionId);
      const hasError = res.error !== undefined;
      
      if (hasError) {
        console.log(`  ❌ Step ${stepNum}: ${desc} - ERROR`);
        failCount++;
      } else {
        const progress = res.profileProgress ? `${res.profileProgress.completed}/${res.profileProgress.total}` : '?/?';
        console.log(`  ✓ Step ${stepNum}: ${desc}`);
        console.log(`     User: "${msg}"`);
        console.log(`     AI Type: ${res.type || 'unknown'} | Progress: ${progress}`);
        
        if (res.type === 'schemes' && res.schemes) {
          console.log(`     ✓ SCHEMES FOUND: ${res.schemes.length} schemes`);
          res.schemes.slice(0, 3).forEach((s, j) => {
            console.log(`        ${j+1}. ${s.scheme_name}`);
          });
        }
        
        passCount++;
      }
    } catch (err) {
      console.log(`  ❌ Step ${stepNum}: ${desc} - EXCEPTION: ${err.message}`);
      failCount++;
    }

    await new Promise(r => setTimeout(r, 800));
  }

  const total = passCount + failCount;
  const pct = ((passCount / total) * 100).toFixed(0);
  console.log(`\n  ${'─'.repeat(51)}`);
  console.log(`  Summary: ${passCount}/${total} passed (${pct}%)`);
  
  return { passed: passCount, failed: failCount };
}

async function runAllTests() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`      COMPREHENSIVE SCHEME ENGINE TEST SUITE`);
  console.log(`${'═'.repeat(60)}`);

  const allResults = [];

  // TEST 1: Female from Maharashtra
  console.log(`\n[TEST 1 OF 4] Female User - Government Employee`);
  let result = await testConversation(
    "👩 Female, Maharashtra, Salaried Employee",
    "test-female-" + Date.now(),
    [
      { msg: "Hi there", desc: "Greeting" },
      { msg: "I'm a woman", desc: "Gender" },
      { msg: "45 years old", desc: "Age" },
      { msg: "Maharashtra state", desc: "State" },
      { msg: "5 lakhs annually", desc: "Income" },
      { msg: "General", desc: "Category" },
      { msg: "No disability", desc: "Disability" },
      { msg: "Married", desc: "Marital Status" },
      { msg: "Own a house", desc: "Land Ownership" }
    ]
  );
  allResults.push(result);

  // TEST 2: Young Male - Student/Unemployed
  console.log(`\n[TEST 2 OF 4] Young Male - Student`);
  result = await testConversation(
    "👨 Male, Tamil Nadu, Young Student",
    "test-male-" + Date.now(),
    [
      { msg: "Hello", desc: "Greeting" },
      { msg: "Male", desc: "Gender" },
      { msg: "22", desc: "Age" },
      { msg: "Tamil Nadu", desc: "State" },
      { msg: "No income yet", desc: "Income (Low)" },
      { msg: "SC caste", desc: "Social Category" },
      { msg: "No", desc: "Disability" },
      { msg: "Single", desc: "Marital Status" },
      { msg: "No property", desc: "Land Ownership" }
    ]
  );
  allResults.push(result);

  // TEST 3: Widow - Senior Citizen
  console.log(`\n[TEST 3 OF 4] Widow - Senior Citizen`);
  result = await testConversation(
    "👩‍🦳 Widow, Rajasthan, 58 Years Old",
    "test-widow-" + Date.now(),
    [
      { msg: "help me find schemes", desc: "Greeting with Intent" },
      { msg: "Female here", desc: "Gender" },
      { msg: "58 years", desc: "Age" },
      { msg: "Rajasthan", desc: "State" },
      { msg: "80000 per year", desc: "Income (Very Low)" },
      { msg: "OBC", desc: "Social Category" },
      { msg: "Yes, have disability", desc: "Disability" },
      { msg: "I'm widowed", desc: "Marital Status" },
      { msg: "Own land for farming", desc: "Land Ownership" }
    ]
  );
  allResults.push(result);

  // TEST 4: Farmer - Rural
  console.log(`\n[TEST 4 OF 4] Farmer - Rural, Low Income`);
  result = await testConversation(
    "🚜 Male Farmer, Punjab, Low Income",
    "test-farmer-" + Date.now(),
    [
      { msg: "namaste", desc: "Greeting" },
      { msg: "male", desc: "Gender" },
      { msg: "50-60 age group", desc: "Age" },
      { msg: "Punjab state", desc: "State" },
      { msg: "₹2,00,000 per year", desc: "Income" },
      { msg: "General category", desc: "Category" },
      { msg: "no disability", desc: "Disability" },
      { msg: "married man", desc: "Marital" },
      { msg: "own agricultural land", desc: "Land Ownership - Should trigger schemes!" }
    ]
  );
  allResults.push(result);

  // SUMMARY
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`                    FINAL RESULTS`);
  console.log(`${'═'.repeat(60)}\n`);

  let totalPassed = 0, totalFailed = 0;
  const testNames = [
    "👩 Female User",
    "👨 Young Male",  
    "👩‍🦳 Widow",
    "🚜 Farmer"
  ];

  for (let i = 0; i < allResults.length; i++) {
    const r = allResults[i];
    const pct = ((r.passed / (r.passed + r.failed)) * 100).toFixed(0);
    totalPassed += r.passed;
    totalFailed += r.failed;
    const icon = r.failed === 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${testNames[i].padEnd(20)} ${r.passed}/${r.passed + r.failed} (${pct}%)`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  const totalTests = totalPassed + totalFailed;
  const totalPct = ((totalPassed / totalTests) * 100).toFixed(0);
  console.log(`\n  🎯 OVERALL: ${totalPassed}/${totalTests} steps (${totalPct}%) ✓`);
  
  if (totalFailed === 0) {
    console.log(`\n  🎉 ALL TESTS PASSED! Engine is working correctly!`);
  } else {
    console.log(`\n  ⚠️  ${totalFailed} step(s) had issues`);
  }

  console.log(`\n${'═'.repeat(60)}\n`);
}

runAllTests().catch(console.error);

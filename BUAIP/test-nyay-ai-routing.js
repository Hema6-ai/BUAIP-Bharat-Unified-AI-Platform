/**
 * NYAY AI ROUTING TEST
 * 
 * Tests the BUAIP Master Router's ability to detect legal queries
 * and route them to the Nyay AI Legal Intelligence Engine
 */

const API_CANDIDATES = ['http://localhost:3000/api', 'http://localhost:3001/api'];

async function detectApiBase() {
  if (process.env.BASE_URL) {
    return `${process.env.BASE_URL.replace(/\/$/, '')}/api`;
  }

  for (const base of API_CANDIDATES) {
    try {
      const response = await fetch(`${base}/unified-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: 'ping' })
      });

      if (response.ok || response.status >= 400) {
        return base;
      }
    } catch {
      // Try next candidate.
    }
  }

  return API_CANDIDATES[0];
}

// Test queries covering all legal categories
const legalTestQueries = [
  // Tenant Rights
  {
    query: "My landlord locked me out of my apartment without notice. What can I do?",
    expectedIntent: "legal_rights",
    expectedCategory: "TENANT_RIGHTS",
    description: "Tenant Rights - Illegal Eviction"
  },
  {
    query: "Landlord is not returning my security deposit after I vacated the flat.",
    expectedIntent: "legal_rights",
    expectedCategory: "TENANT_RIGHTS",
    description: "Tenant Rights - Security Deposit"
  },
  
  // Labour Rights
  {
    query: "I was fired from my job without any reason. Is this legal?",
    expectedIntent: "legal_rights",
    expectedCategory: "LABOUR_RIGHTS",
    description: "Labour Rights - Wrongful Termination"
  },
  {
    query: "My employer has not paid my salary for the last 3 months. What should I do?",
    expectedIntent: "legal_rights",
    expectedCategory: "LABOUR_RIGHTS",
    description: "Labour Rights - Unpaid Wages"
  },
  
  // Consumer Rights
  {
    query: "I bought a defective refrigerator and the company is refusing to replace it.",
    expectedIntent: "legal_rights",
    expectedCategory: "CONSUMER_RIGHTS",
    description: "Consumer Rights - Defective Product"
  },
  {
    query: "Online seller sent me a fake product and is not giving refund. How to file complaint?",
    expectedIntent: "legal_rights",
    expectedCategory: "CONSUMER_RIGHTS",
    description: "Consumer Rights - Fraud"
  },
  
  // Domestic Violence
  {
    query: "I am facing domestic violence at home. Where can I get help?",
    expectedIntent: "legal_rights",
    expectedCategory: "DOMESTIC_VIOLENCE",
    description: "Domestic Violence - Emergency"
  },
  
  // Criminal Rights
  {
    query: "Police arrested me without telling me the reason. What are my rights?",
    expectedIntent: "legal_rights",
    expectedCategory: "CRIMINAL_RIGHTS",
    description: "Criminal Rights - Illegal Arrest"
  },
  {
    query: "How do I file an FIR for theft at the police station?",
    expectedIntent: "legal_rights",
    expectedCategory: "CRIMINAL_RIGHTS",
    description: "Criminal Rights - FIR Filing"
  },
  
  // Land/Property Dispute
  {
    query: "My neighbor has encroached 10 feet into my plot. What is the legal remedy?",
    expectedIntent: "legal_rights",
    expectedCategory: "LAND_DISPUTE",
    description: "Land Dispute - Encroachment"
  },
  
  // RTI Rights
  {
    query: "How do I file RTI to get information from government office?",
    expectedIntent: "legal_rights",
    expectedCategory: "RTI_RIGHTS",
    description: "RTI Request"
  },
  
  // General Legal
  {
    query: "I need a lawyer but cannot afford one. Where can I get free legal help?",
    expectedIntent: "legal_rights",
    expectedCategory: "GENERAL_LEGAL",
    description: "Legal Aid Request"
  }
];

// Test to verify routing doesn't conflict with other engines
const nonLegalQueries = [
  {
    query: "What government schemes can I apply for?",
    expectedIntent: "scheme_eligibility",
    description: "Should route to Scheme Engine, not Legal"
  },
  {
    query: "What crop should I grow in Punjab?",
    expectedIntent: "agriculture_farming",
    description: "Should route to Agriculture Engine, not Legal"
  },
  {
    query: "How to sell on Amazon India?",
    expectedIntent: "global_seller_intelligence",
    description: "Should route to GlobalSeller Engine, not Legal"
  },
  {
    query: "I am visiting India from USA. What visa do I need?",
    expectedIntent: "pre_arrival_planning",
    description: "Should route to India Insider, not Legal"
  }
];

// ============================================================================
// TEST EXECUTION
// ============================================================================

async function testLegalRouting() {
  const API_BASE = await detectApiBase();
  console.log('🔧 NYAY AI ROUTING TEST\n');
  console.log(`Using API base: ${API_BASE}\n`);
  console.log('Testing BUAIP Master Router legal intent detection...\n');
  console.log('='.repeat(80));

  let passedTests = 0;
  let failedTests = 0;
  const failures = [];

  // Test legal queries
  console.log('\n📋 TESTING LEGAL QUERIES (should route to Nyay AI)\n');
  
  for (const test of legalTestQueries) {
    try {
      const response = await fetch(`${API_BASE}/unified-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: test.query })
      });

      const data = await response.json();
      
      const isCorrectIntent = data.intent === test.expectedIntent;
      const isCorrectCategory = !test.expectedCategory || data.legalCategory === test.expectedCategory;
      const isNyayEngine = data.engine === 'NyayAI' || data.engine?.includes('Legal Rights');
      
      if (isCorrectIntent && isCorrectCategory && isNyayEngine) {
        console.log(`✅ ${test.description}`);
        console.log(`   Intent: ${data.intent} | Category: ${data.legalCategory} | Engine: ${data.engine}`);
        passedTests++;
      } else {
        console.log(`❌ ${test.description}`);
        console.log(`   Expected: ${test.expectedIntent} / ${test.expectedCategory}`);
        console.log(`   Got: ${data.intent} / ${data.legalCategory} | Engine: ${data.engine}`);
        failedTests++;
        failures.push({
          test: test.description,
          query: test.query,
          expected: test.expectedIntent,
          got: data.intent,
          engine: data.engine
        });
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.description} - ERROR`);
      console.log(`   ${error.message}`);
      failedTests++;
      failures.push({
        test: test.description,
        query: test.query,
        error: error.message
      });
      console.log('');
    }
  }

  // Test non-legal queries (ensure no false positives)
  console.log('\n📋 TESTING NON-LEGAL QUERIES (should NOT route to Nyay AI)\n');
  
  for (const test of nonLegalQueries) {
    try {
      const response = await fetch(`${API_BASE}/unified-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: test.query })
      });

      const data = await response.json();
      
      const isCorrectIntent = data.intent === test.expectedIntent;
      const notLegalEngine = data.intent !== 'legal_rights' && data.engine !== 'NyayAI';
      
      if (isCorrectIntent && notLegalEngine) {
        console.log(`✅ ${test.description}`);
        console.log(`   Intent: ${data.intent} | Engine: ${data.engine}`);
        passedTests++;
      } else {
        console.log(`❌ ${test.description}`);
        console.log(`   Expected: ${test.expectedIntent} (not legal)`);
        console.log(`   Got: ${data.intent} | Engine: ${data.engine}`);
        failedTests++;
        failures.push({
          test: test.description,
          query: test.query,
          expected: test.expectedIntent,
          got: data.intent,
          issue: 'False positive - routed to legal when it should not'
        });
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.description} - ERROR`);
      console.log(`   ${error.message}`);
      failedTests++;
      failures.push({
        test: test.description,
        query: test.query,
        error: error.message
      });
      console.log('');
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`Total Tests: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ FAILURES:\n');
    failures.forEach((failure, idx) => {
      console.log(`${idx + 1}. ${failure.test}`);
      console.log(`   Query: "${failure.query}"`);
      if (failure.error) {
        console.log(`   Error: ${failure.error}`);
      } else {
        console.log(`   Expected: ${failure.expected}`);
        console.log(`   Got: ${failure.got}`);
        if (failure.engine) console.log(`   Engine: ${failure.engine}`);
        if (failure.issue) console.log(`   Issue: ${failure.issue}`);
      }
      console.log('');
    });
  }

  console.log('\n' + '='.repeat(80));
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Nyay AI routing is working perfectly.\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review the failures above.\n');
  }
}

// ============================================================================
// RUN TESTS
// ============================================================================

testLegalRouting().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});

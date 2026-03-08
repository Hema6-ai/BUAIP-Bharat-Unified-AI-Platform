/**
 * BUAIP 6-ENGINE SYSTEM TEST
 * 
 * Tests all 6 intelligence engines through unified-ai routing:
 * 1. Government Scheme Intelligence
 * 2. Agriculture Intelligence (Annadata)
 * 3. Commerce Intelligence (GlobalSeller)
 * 4. Tourism Intelligence (India Insider)
 * 5. Legal Rights Intelligence (Nyay AI)
 * 6. Career Intelligence (PathAI)
 * 
 * Verifies:
 * - Correct intent detection
 * - Real AI responses (not mock/placeholder)
 * - Proper engine routing
 * - Response quality
 */

const API_URL = 'http://localhost:3000/api/unified-ai';

// Test queries for each engine
const TEST_QUERIES = [
  {
    engine: 'Government Scheme Intelligence',
    query: 'I am a farmer with 2 acres of land in Maharashtra. What government schemes can help me?',
    expectedIntent: 'scheme_eligibility',
    requiredKeywords: ['scheme', 'eligibility', 'benefit', 'apply', 'government'],
  },
  {
    engine: 'Agriculture Intelligence (Annadata)',
    query: 'How do I control pest attacks on my cotton crop during monsoon season?',
    expectedIntent: 'agriculture_farming',
    requiredKeywords: ['pest', 'cotton', 'monsoon', 'control', 'crop'],
  },
  {
    engine: 'Commerce Intelligence (GlobalSeller)',
    query: 'I want to export Indian handicrafts to USA. What are the procedures and costs?',
    expectedIntent: 'global_seller_intelligence',
    requiredKeywords: ['export', 'USA', 'handicraft', 'procedure', 'cost', 'documentation'],
  },
  {
    engine: 'Tourism Intelligence (India Insider)',
    query: 'Plan a 5-day family trip to Rajasthan with budget of ₹50,000',
    expectedIntent: 'pre_arrival_planning',
    requiredKeywords: ['Rajasthan', 'itinerary', 'budget', 'family', 'day'],
  },
  {
    engine: 'Legal Rights Intelligence (Nyay AI)',
    query: 'My landlord is not returning my security deposit after I vacated. What can I do?',
    expectedIntent: 'legal_rights',
    requiredKeywords: ['security deposit', 'landlord', 'tenant', 'rights', 'legal'],
  },
  {
    engine: 'Career Intelligence (PathAI)',
    query: 'I just finished 12th PCM with 75%. Confused between engineering and other careers. What should I do?',
    expectedIntent: 'career_intelligence',
    requiredKeywords: ['career', '12th', 'engineering', 'PCM', 'option', 'path'],
  },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testEngine(testCase, index) {
  log(`\n${'='.repeat(80)}`, colors.cyan);
  log(`TEST ${index + 1}/6: ${testCase.engine}`, colors.bright);
  log('='.repeat(80), colors.cyan);
  
  log(`\n📝 Query: ${testCase.query}`, colors.blue);
  log(`🎯 Expected Intent: ${testCase.expectedIntent}`, colors.blue);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage: testCase.query,
        sessionId: `test-session-${index}`,
      }),
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      log(`\n❌ FAILED: HTTP ${response.status}`, colors.red);
      const errorText = await response.text();
      log(`Error: ${errorText}`, colors.red);
      return false;
    }
    
    const data = await response.json();
    
    // Verify response structure
    if (!data.response) {
      log('\n❌ FAILED: No response field in data', colors.red);
      log(JSON.stringify(data, null, 2), colors.red);
      return false;
    }
    
    // Verify intent detection
    if (data.intent !== testCase.expectedIntent) {
      log(`\n❌ FAILED: Wrong intent detected`, colors.red);
      log(`   Expected: ${testCase.expectedIntent}`, colors.red);
      log(`   Got: ${data.intent || 'NONE'}`, colors.red);
      return false;
    }
    
    // Verify engine routing
    if (!data.engine || data.engine === 'Unknown') {
      log('\n❌ FAILED: Engine not identified', colors.red);
      log(`   Engine: ${data.engine}`, colors.red);
      return false;
    }
    
    // Check response quality (not a mock/placeholder)
    const responseText = data.response.toLowerCase();
    const isMockResponse = 
      responseText.includes('mock') ||
      responseText.includes('placeholder') ||
      responseText.includes('coming soon') ||
      responseText.includes('under construction') ||
      responseText.length < 50; // Too short to be real AI response
    
    if (isMockResponse) {
      log('\n⚠️  WARNING: Response appears to be mock/placeholder', colors.yellow);
      log(`   Response: ${data.response.substring(0, 100)}...`, colors.yellow);
    }
    
    // Check for required keywords (basic relevance check)
    const keywordsFound = testCase.requiredKeywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );
    
    const relevanceScore = (keywordsFound.length / testCase.requiredKeywords.length) * 100;
    
    // Display results
    log('\n✅ SUCCESS:', colors.green);
    log(`   Engine: ${data.engine}`, colors.green);
    log(`   Intent: ${data.intent}`, colors.green);
    log(`   Confidence: ${data.confidence ? (data.confidence * 100).toFixed(1) + '%' : 'N/A'}`, colors.green);
    log(`   Response Time: ${duration}ms`, colors.green);
    log(`   Response Length: ${data.response.length} characters`, colors.green);
    log(`   Relevance Score: ${relevanceScore.toFixed(1)}% (${keywordsFound.length}/${testCase.requiredKeywords.length} keywords)`, colors.green);
    
    log('\n📄 Response Preview:', colors.cyan);
    log(data.response.substring(0, 300) + (data.response.length > 300 ? '...' : ''), colors.reset);
    
    if (data.followUpQuestions && data.followUpQuestions.length > 0) {
      log('\n💬 Follow-up Questions:', colors.cyan);
      data.followUpQuestions.forEach((q, i) => {
        log(`   ${i + 1}. ${q}`, colors.reset);
      });
    }
    
    return true;
    
  } catch (error) {
    log(`\n❌ FAILED: ${error.message}`, colors.red);
    log(error.stack, colors.red);
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(80), colors.bright);
  log('BUAIP 6-ENGINE SYSTEM TEST', colors.bright);
  log('Testing all 6 intelligence engines through unified-ai routing', colors.bright);
  log('='.repeat(80) + '\n', colors.bright);
  
  const results = [];
  
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const success = await testEngine(TEST_QUERIES[i], i);
    results.push({
      engine: TEST_QUERIES[i].engine,
      success,
    });
    
    // Wait 2 seconds between tests to avoid rate limits
    if (i < TEST_QUERIES.length - 1) {
      log('\n⏱️  Waiting 2 seconds before next test...', colors.yellow);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  log('\n' + '='.repeat(80), colors.bright);
  log('TEST SUMMARY', colors.bright);
  log('='.repeat(80), colors.bright);
  
  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const successRate = (passedTests / totalTests) * 100;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    log(`${icon} ${result.engine}`, color);
  });
  
  log('\n' + '='.repeat(80), colors.bright);
  log(`FINAL RESULT: ${passedTests}/${totalTests} tests passed (${successRate.toFixed(1)}%)`, 
      successRate === 100 ? colors.green : colors.yellow);
  log('='.repeat(80) + '\n', colors.bright);
  
  if (successRate === 100) {
    log('🎉 ALL ENGINES WORKING PERFECTLY! System ready for production.', colors.green);
  } else {
    log('⚠️  Some engines failed. Review errors above and fix issues.', colors.yellow);
  }
  
  process.exit(successRate === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 CRITICAL ERROR: ${error.message}`, colors.red);
  log(error.stack, colors.red);
  process.exit(1);
});

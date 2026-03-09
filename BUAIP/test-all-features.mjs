/**
 * Comprehensive BUAIP Feature Test
 * Tests all 8 critical issues
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/unified-ai`;

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(message) {
  log(`✅ PASS: ${message}`, 'green');
}

function fail(message) {
  log(`❌ FAIL: ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test counter
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function testAPI(testName, query, expectedKeywords, shouldInvokeLLM = true) {
  totalTests++;
  info(`\nTesting: ${testName}`);
  info(`Query: "${query}"`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: query,
        selectedLanguage: 'en',
        conversationHistory: [],
        sessionId: `test-${Date.now()}`
      })
    });

    if (!response.ok) {
      fail(`${testName} - API returned ${response.status}`);
      failedTests++;
      return false;
    }

    const data = await response.json();
    
    // Check response exists
    if (!data.response || data.response.length < 50) {
      fail(`${testName} - Response too short (${data.response?.length || 0} chars)`);
      info(`Response: ${data.response?.substring(0, 100)}`);
      failedTests++;
      return false;
    }

    // Check for static fallback responses (bad)
    const staticPhrases = [
      'Real-time data is currently unavailable',
      'I cannot search the web',
      'I apologize, but I do not have',
      'I do not have access to',
      'Data unavailable'
    ];
    
    for (const phrase of staticPhrases) {
      if (data.response.includes(phrase)) {
        fail(`${testName} - Contains static fallback: "${phrase}"`);
        failedTests++;
        return false;
      }
    }

    // Check for expected keywords
    let keywordFound = false;
    if (expectedKeywords && expectedKeywords.length > 0) {
      for (const keyword of expectedKeywords) {
        if (data.response.toLowerCase().includes(keyword.toLowerCase())) {
          keywordFound = true;
          break;
        }
      }
      if (!keywordFound) {
        warn(`${testName} - Expected keywords not found: ${expectedKeywords.join(', ')}`);
        info(`Got engine: ${data.engine || 'unknown'}`);
      }
    }

    // Check LLM was invoked (structured response)
    if (shouldInvokeLLM) {
      const hasStructure = 
        data.response.includes('##') || // Markdown headers
        data.response.includes('Understanding') ||
        data.response.includes('Explanation') ||
        data.response.includes('Practical');
      
      if (!hasStructure) {
        warn(`${testName} - Response may not be LLM-generated (no structure)`);
      }
    }

    pass(`${testName} - Got ${data.response.length} chars from ${data.engine || 'API'}`);
    info(`First 200 chars: ${data.response.substring(0, 200)}...`);
    passedTests++;
    return true;

  } catch (error) {
    fail(`${testName} - Error: ${error.message}`);
    failedTests++;
    return false;
  }
}

async function testPageLoad() {
  totalTests++;
  info('\n\n═══════════════════════════════════════');
  info('TEST 1: Initial Page Load (No Refresh Needed)');
  info('═══════════════════════════════════════');
  
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      fail('Page load - Server returned ' + response.status);
      failedTests++;
      return;
    }
    
    const html = await response.text();
    
    // Check for critical elements
    const checks = [
      { name: 'HTML structure', test: html.includes('<!DOCTYPE html>') },
      { name: 'React root', test: html.includes('root') || html.includes('__next') },
      { name: 'No error page', test: !html.includes('Application error') },
      { name: 'Has content', test: html.length > 1000 }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      if (check.test) {
        pass(`Page load - ${check.name}`);
      } else {
        fail(`Page load - ${check.name}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      passedTests++;
      pass('Page loads successfully without refresh');
    } else {
      failedTests++;
    }
    
  } catch (error) {
    fail(`Page load test failed: ${error.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.clear();
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║     BUAIP COMPREHENSIVE FEATURE TEST                     ║', 'blue');
  log('║     Testing All 8 Critical Issues                        ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝\n', 'blue');

  // TEST 1: Page Load
  await testPageLoad();

  // TEST 2-7: All 6 Engines
  info('\n\n═══════════════════════════════════════');
  info('TEST 2-7: All 6 Engines with LLM Reasoning');
  info('═══════════════════════════════════════');
  
  await testAPI(
    'Agriculture Engine',
    'What are the best crops to grow in Telangana during summer season?',
    ['crop', 'summer', 'telangana', 'kharif', 'season', 'cotton', 'maize'],
    true
  );

  await testAPI(
    'Scheme Engine', 
    'What government schemes are available for farmers in Andhra Pradesh?',
    ['scheme', 'pm-kisan', 'subsidy', 'benefit', 'eligibility'],
    true
  );

  await testAPI(
    'Commerce Engine',
    'How can I start selling handmade products on Amazon from India?',
    ['amazon', 'seller', 'register', 'gst', 'marketplace'],
    true
  );

  await testAPI(
    'Tourism Engine',
    'I am visiting India from Germany. What safety tips should I know?',
    ['safety', 'travel', 'emergency', 'transport', 'tourist'],
    true
  );

  await testAPI(
    'Legal Engine (Nyaya)',
    'My landlord is trying to evict me without notice. What are my rights?',
    ['tenant', 'rights', 'eviction', 'notice', 'legal', 'rent'],
    true
  );

  await testAPI(
    'Career Engine (PathAI)',
    'What career options do I have after completing 12th science?',
    ['engineering', 'medicine', 'career', 'course', 'entrance', 'roadmap'],
    true
  );

  // TEST 8: Web / Mandi Prices
  info('\n\n═══════════════════════════════════════');
  info('TEST 8: Live Web Lookup (Weather/Mandi)');
  info('═══════════════════════════════════════');
  
  await testAPI(
    'Weather Query (Live Web)',
    'What is the current weather in Hyderabad today?',
    ['temperature', 'weather', 'hyderabad', '°c', 'forecast'],
    true
  );

  await testAPI(
    'Mandi Price Query (Live Web)',
    'What is the current mandi price of rice in Guntur?',
    ['rice', 'price', 'mandi', 'quintal', 'guntur', 'modal'],
    true
  );

  // SUMMARY
  log('\n\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║                    TEST SUMMARY                          ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝\n', 'blue');
  
  log(`Total Tests: ${totalTests}`);
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${Math.round((passedTests/totalTests)*100)}%\n`, 
      passedTests === totalTests ? 'green' : 'yellow');

  // MANUAL TEST REMINDERS
  if (passedTests === totalTests) {
    log('╔══════════════════════════════════════════════════════════╗', 'green');
    log('║  🎉 ALL AUTOMATED TESTS PASSED!                          ║', 'green');
    log('╚══════════════════════════════════════════════════════════╝\n', 'green');
  } else {
    log('╔══════════════════════════════════════════════════════════╗', 'red');
    log('║  ⚠️  SOME TESTS FAILED - CHECK LOGS ABOVE                ║', 'red');
    log('╚══════════════════════════════════════════════════════════╝\n', 'red');
  }

  warn('\n⚠️  MANUAL TESTS REQUIRED (Cannot automate):');
  console.log('');
  console.log('🎤 MICROPHONE:');
  console.log('   1. Open http://localhost:3000');
  console.log('   2. Click microphone button (🎤)');
  console.log('   3. If "permission denied" → Click 🔒 in address bar');
  console.log('   4. → Site settings → Microphone → Allow');
  console.log('   5. Refresh page and test again');
  console.log('');
  console.log('📸 PHOTO UPLOAD:');
  console.log('   1. Click + button → "Photo → Answer"');
  console.log('   2. Upload any image');
  console.log('   3. Check browser console (F12) if error appears');
  console.log('   4. Verify AWS Rekognition permissions if fails');
  console.log('');
  console.log('📄 DOCUMENT UPLOAD:');
  console.log('   1. Click + button → "Document Explainer"');
  console.log('   2. Upload PDF/DOCX file');
  console.log('   3. Should get automatic section-by-section explanation');
  console.log('');

  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  fail(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

/**
 * Test the new intelligent reasoning system
 * Tests:
 * 1. Profile extraction from natural language
 * 2. Inference logic (farmer → farming=true)
 * 3. No redundant questions
 * 4. Scheme recommendations after minimal questions
 */

const API_URL = 'http://localhost:3001/api/unified-ai';
const SESSION_ID = `test-intelligent-${Date.now()}`;

async function sendMessage(userMessage, conversationHistory = []) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userMessage,
      conversationHistory,
      sessionId: SESSION_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  return await response.json();
}

async function testIntelligentReasoning() {
  console.log('=== TESTING INTELLIGENT REASONING SYSTEM ===\n');
  
  const conversation = [];
  
  // Test 1: Initial message with multiple profile details
  console.log('TEST 1: Extract multiple profile details from natural message');
  console.log('USER: "I am a 37-year-old farmer in Andhra Pradesh, Eluru district, rural area"');
  
  let result = await sendMessage(
    'I am a 37-year-old farmer in Andhra Pradesh, Eluru district, rural area',
    conversation
  );
  
  conversation.push(
    { role: 'user', content: 'I am a 37-year-old farmer in Andhra Pradesh, Eluru district, rural area' },
    { role: 'assistant', content: result.response }
  );
  
  console.log('\nAI RESPONSE:', result.response);
  console.log('\nEXTRACTED PROFILE:', JSON.stringify(result.profile, null, 2));
  
  // Verify profile extraction
  console.log('\n✓ Verification:');
  console.log(`  Age extracted: ${result.profile.age === 37 ? '✓' : '✗'} (${result.profile.age})`);
  console.log(`  Occupation extracted: ${result.profile.occupation === 'Farmer' ? '✓' : '✗'} (${result.profile.occupation})`);
  console.log(`  State extracted: ${result.profile.state === 'Andhra Pradesh' ? '✓' : '✗'} (${result.profile.state})`);
  console.log(`  District extracted: ${result.profile.district === 'Eluru' ? '✓' : '✗'} (${result.profile.district})`);
  console.log(`  Area type extracted: ${result.profile.areaType === 'rural' ? '✓' : '✗'} (${result.profile.areaType})`);
  console.log(`  Farming inferred: ${result.profile.farming === true ? '✓' : '✗'} (${result.profile.farming})`);
  console.log(`  Senior citizen inferred: ${result.profile.seniorCitizen === false ? '✓' : '✗'} (${result.profile.seniorCitizen})`);
  
  // Check that AI is NOT asking redundant questions
  const lowerResponse = result.response.toLowerCase();
  const hasRedundantFarmingQuestion = /are you.*farming|involved.*agriculture|work.*farm/i.test(result.response);
  const hasSeniorCitizenQuestion = /senior.*citizen|over 60|above 60/i.test(result.response);
  
  console.log(`  No redundant farming question: ${!hasRedundantFarmingQuestion ? '✓' : '✗'}`);
  console.log(`  No redundant senior citizen question: ${!hasSeniorCitizenQuestion ? '✓' : '✗'}`);
  
  // Test 2: Provide additional information
  console.log('\n\nTEST 2: Provide income and category');
  console.log('USER: "My monthly household income is ₹20,000 and I am ST category"');
  
  result = await sendMessage(
    'My monthly household income is ₹20,000 and I am ST category',
    conversation
  );
  
  conversation.push(
    { role: 'user', content: 'My monthly household income is ₹20,000 and I am ST category' },
    { role: 'assistant', content: result.response }
  );
  
  console.log('\nAI RESPONSE:', result.response);
  console.log('\nUPDATED PROFILE:', JSON.stringify(result.profile, null, 2));
  
  // Verify income and category extraction
  console.log('\n✓ Verification:');
  console.log(`  Income extracted: ${result.profile.monthlyIncome === 20000 ? '✓' : '✗'} (${result.profile.monthlyIncome})`);
  console.log(`  Category extracted: ${result.profile.category === 'ST' ? '✓' : '✗'} (${result.profile.category})`);
  
  // Test 3: Provide land ownership
  console.log('\n\nTEST 3: Provide land ownership');
  console.log('USER: "I own 1 acre of agricultural land"');
  
  result = await sendMessage(
    'I own 1 acre of agricultural land',
    conversation
  );
  
  conversation.push(
    { role: 'user', content: 'I own 1 acre of agricultural land' },
    { role: 'assistant', content: result.response }
  );
  
  console.log('\nAI RESPONSE:', result.response);
  console.log('\nFINAL PROFILE:', JSON.stringify(result.profile, null, 2));
  
  // Verify land ownership
  console.log('\n✓ Verification:');
  console.log(`  Land ownership extracted: ${result.profile.landOwned === 1 ? '✓' : '✗'} (${result.profile.landOwned})`);
  
  // Check if AI is providing scheme recommendations
  const hasSchemes = /scheme|yojana|pm-kisan|rythu|bharosa|eligib/i.test(result.response);
  const hasLinks = /https?:\/\//i.test(result.response);
  
  console.log(`  Scheme recommendations provided: ${hasSchemes ? '✓' : '✗'}`);
  console.log(`  Clickable links included: ${hasLinks ? '✓' : '✗'}`);
  
  // Test 4: Count total questions asked
  console.log('\n\n=== SUMMARY ===');
  console.log(`  Total messages exchanged: ${conversation.length}`);
  console.log(`  Total user inputs: ${conversation.filter(m => m.role === 'user').length}`);
  console.log(`  Profile completeness: ${Object.keys(result.profile).length} fields captured`);
  
  // Calculate question efficiency
  const aiMessages = conversation.filter(m => m.role === 'assistant');
  const questionCount = aiMessages.filter(msg => msg.content.includes('?')).length;
  console.log(`  Questions asked by AI: ${questionCount}`);
  console.log(`  Questions per profile field: ${(questionCount / Object.keys(result.profile).length).toFixed(2)}`);
  
  console.log('\n✓ INTELLIGENT REASONING TEST COMPLETE');
  
  // Test session debugging endpoint
  console.log('\n\nTEST 5: Session debugging endpoint');
  const sessionResponse = await fetch(`${API_URL}?sessionId=${SESSION_ID}`);
  const sessionData = await sessionResponse.json();
  console.log('\nSESSION DATA:', JSON.stringify(sessionData, null, 2));
  
  // Final checks
  console.log('\n\n=== FINAL VALIDATION ===');
  
  const checks = [
    { name: 'Profile extraction works', pass: result.profile.age === 37 },
    { name: 'Inference logic works', pass: result.profile.farming === true },
    { name: 'No redundant questions', pass: !hasRedundantFarmingQuestion },
    { name: 'Minimal questioning', pass: questionCount <= 3 },
    { name: 'Scheme recommendations', pass: hasSchemes },
    { name: 'Clickable links', pass: hasLinks },
  ];
  
  checks.forEach(check => {
    console.log(`${check.pass ? '✓' : '✗'} ${check.name}`);
  });
  
  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '✓✓✓ ALL TESTS PASSED ✓✓✓' : '⚠️  SOME TESTS FAILED'}`);
}

// Run tests
testIntelligentReasoning().catch(error => {
  console.error('\n✗ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
});

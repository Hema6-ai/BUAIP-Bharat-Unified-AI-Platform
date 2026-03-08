const BASE_URL = 'http://localhost:3000/api/scheme-conversation';

// Test scenarios with different user profiles
const testScenarios = [
  {
    name: 'Female Farmer, Maharashtra, Income 3 Lakh',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'I want to find schemes for me' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Female' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '35 years old' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Maharashtra' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Around 3 lakh per year' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'OBC' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'No, no disability' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Married' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Yes, I own land' },
    ],
  },
  {
    name: 'Young Student, Delhi, Low Income',
    messages: [
      { role: 'user', content: 'Hi! can you help me find schemes?' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Male' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '22 years' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Delhi' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Below 1 lakh' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'General' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'No' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Single' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'No, dont own property' },
    ],
  },
  {
    name: 'Widowed Woman, Tamil Nadu, Moderate Income',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Show me government schemes' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Female' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '48' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Tamil Nadu' },
      { role: 'assistant', content: '' },
      { role: 'user', content: '2.5 lakh' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'SC' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'I have a hearing disability' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'I am widowed' },
      { role: 'assistant', content: '' },
      { role: 'user', content: 'Own a small house' },
    ],
  },
];

async function testConversation(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TESTING: ${scenario.name}`);
  console.log('='.repeat(80));

  const messages = [];
  let sessionId = null;

  for (let i = 0; i < scenario.messages.length; i++) {
    const testMessage = scenario.messages[i];
    
    if (testMessage.role === 'user') {
      messages.push(testMessage);
      
      console.log(`\n[STEP ${i + 1}] USER: "${testMessage.content}"`);
      
      try {
        const response = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, sessionId }),
        });

        const data = await response.json();
        sessionId = data.sessionId;

        console.log(`[AI RESPONSE]:`);
        console.log(data.response);

        if (data.isProfileComplete) {
          console.log(`\n✅ PROFILE COMPLETE - ${data.profileProgress.step}/${data.profileProgress.totalSteps} fields`);
          console.log(`Completed fields: ${data.profileProgress.completedFields.join(', ')}`);
        } else {
          console.log(`⏳ Profile Progress: ${data.profileProgress.step}/${data.profileProgress.totalSteps}`);
        }

        if (data.recommendedSchemes && data.recommendedSchemes.length > 0) {
          console.log(`\n✨ RECOMMENDED SCHEMES (${data.recommendedSchemes.length} found):`);
          data.recommendedSchemes.forEach((scheme, idx) => {
            console.log(`\n  ${idx + 1}. ${scheme.schemeName}`);
            console.log(`     Ministry: ${scheme.ministry}`);
            console.log(`     Benefit: ${scheme.benefit}`);
            console.log(`     Why Qualify: ${scheme.whyYouQualify}`);
            console.log(`     Documents: ${scheme.requiredDocuments?.join(', ')}`);
            console.log(`     Apply: ${scheme.howToApplyOnline}`);
          });
        }

        // Add assistant response to messages
        messages.push({ role: 'assistant', content: data.response });

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        throw error;
      }
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

async function runAllTests() {
  try {
    console.log('🧪 SCHEME ELIGIBILITY ENGINE - COMPREHENSIVE TEST SUITE');
    console.log('Testing conversational AI with RAG retrieval');
    
    for (const scenario of testScenarios) {
      await testConversation(scenario);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between scenarios
    }

    console.log('\n✅ ALL TESTS COMPLETED');
  } catch (error) {
    console.error('❌ TEST SUITE FAILED:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);

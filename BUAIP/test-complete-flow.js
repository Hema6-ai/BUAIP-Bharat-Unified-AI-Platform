// Test complete eligibility flow with answers
const testCompleteFlow = async () => {
  console.log('🧪 Testing Complete Scheme Eligibility Flow with Answers...\n');

  const conversation = [
    'I want to find government schemes',
    'Male',
    '28 years old',
    'Maharashtra',
    'Annual income is 2.5 lakh rupees',
  ];

  let conversationHistory = [];

  for (const userMessage of conversation) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📤 User: "${userMessage}"`);
    console.log('⏳ Calling API...\n');

    try {
      const response = await fetch('http://localhost:3000/api/unified-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        console.error('❌ API Error:', response.status);
        const error = await response.text();
        console.error('Error:', error.substring(0, 500));
        break;
      }

      const data = await response.json();
      console.log('🤖 BUAIP AI:');
      console.log(data.response);

      // Add to history
      conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      );

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ Error:', error.message);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test completed! The AI should be asking follow-up questions one at a time.');
};

testCompleteFlow().catch(console.error);

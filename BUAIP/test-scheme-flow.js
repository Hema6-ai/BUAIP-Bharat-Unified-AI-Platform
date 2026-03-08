// Test the scheme eligibility flow
const testSchemeFlow = async () => {
  console.log('🧪 Testing Scheme Eligibility Flow...\n');

  const conversation = [
    { user: 'I want to find government schemes', ai: null },
    { user: 'Yes, let\'s start', ai: null },
  ];

  let conversationHistory = [];

  for (const turn of conversation) {
    console.log(`\n📤 User: "${turn.user}"`);
    console.log('⏳ Sending to API...');

    try {
      const response = await fetch('http://localhost:3000/api/unified-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: turn.user,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        console.error('❌ API Error:', response.status);
        const error = await response.text();
        console.error('Error details:', error);
        break;
      }

      const data = await response.json();
      console.log('✅ AI Response:');
      console.log(data.response);
      console.log('\n' + '='.repeat(80));

      // Add to conversation history
      conversationHistory.push(
        { role: 'user', content: turn.user },
        { role: 'assistant', content: data.response }
      );
    } catch (error) {
      console.error('❌ Error:', error.message);
      break;
    }
  }

  console.log('\n✅ Test completed! The AI should be asking for the first eligibility question (gender).');
};

testSchemeFlow().catch(console.error);

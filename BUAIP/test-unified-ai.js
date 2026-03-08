// Test the unified AI brain API
const testUnifiedAI = async () => {
  console.log('🧪 Testing Unified AI Brain...\n');

  const testMessages = [
    'Hello',
    'I want to find government schemes',
  ];

  for (const message of testMessages) {
    console.log(`\n📤 User: "${message}"`);
    console.log('⏳ Sending to API...');

    try {
      const response = await fetch('http://localhost:3000/api/unified-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: message,
          conversationHistory: [],
        }),
      });

      if (!response.ok) {
        console.error('❌ API Error:', response.status, response.statusText);
        const error = await response.text();
        console.error('Error details:', error);
        continue;
      }

      const data = await response.json();
      console.log('✅ AI Response:');
      console.log(data.response);
      console.log('\n' + '='.repeat(80));
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
};

testUnifiedAI().catch(console.error);

// Test strict eligibility flow - one question at a time
const testStrictFlow = async () => {
  console.log('🧪 Testing STRICT Eligibility Flow (No Guessing, One Question at a Time)...\n');

  const conversation = [
    'Find government schemes for me',
    'I want to know schemes',
    'Female',
    '25',
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
        console.error('Error:', error.substring(0, 300));
        break;
      }

      const data = await response.json();
      console.log('🤖 BUAIP AI (STRICT MODE):');
      console.log(data.response);

      // Add to history
      conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: data.response }
      );

      // Delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('❌ Error:', error.message);
      break;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Expected Behavior:');
  console.log('1. AI should ask: "What is your gender?" (ONE question only)');
  console.log('2. After "Female", AI should ask: "What is your age?" (ONE question only)');
  console.log('3. After "25", AI should ask the NEXT question (state or district)');
  console.log('4. AI should NEVER guess or assume missing information');
  console.log('5. AI should NEVER ask multiple questions at once');
};

testStrictFlow().catch(console.error);

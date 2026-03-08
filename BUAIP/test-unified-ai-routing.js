// Test Unified AI Routing to GlobalSeller Engine

async function testUnifiedAIRouting() {
  console.log('Testing Unified AI Routing to GlobalSeller...\n');

  // Test 1: GlobalSeller query should route to GlobalSeller engine
  console.log('Test 1: Seller Query - Should Route to GlobalSeller');
  try {
    const response1 = await fetch('http://localhost:3000/api/unified-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'How do I source manufacturers from IndiaMART?',
        language: 'en'
      })
    });
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Engine:', data1.engine);
    console.log('Mode:', data1.mode);
    console.log('Response Preview:', data1.response?.substring(0, 150) + '...');
    console.log('✅ Test 1:', data1.engine === 'GlobalSellerEngine' ? 'PASSED' : 'FAILED');
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 1 Error:', error.message);
  }

  // Test 2: Non-seller query should NOT route to GlobalSeller
  console.log('Test 2: Scheme Query - Should NOT Route to GlobalSeller');
  try {
    const response2 = await fetch('http://localhost:3000/api/unified-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'What government schemes am I eligible for as a farmer?',
        language: 'en',
        userProfile: {
          age_group: '26-40',
          state: 'Maharashtra',
          occupation: 'farmer',
          income: 200000
        }
      })
    });
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Engine:', data2.engine || 'Not specified');
    console.log('Response Preview:', data2.response?.substring(0, 150) + '...');
    console.log('✅ Test 2:', data2.engine !== 'GlobalSellerEngine' ? 'PASSED' : 'FAILED');
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 2 Error:', error.message);
  }

  // Test 3: Amazon seller query
  console.log('Test 3: Amazon Seller Query - Should Route to GlobalSeller');
  try {
    const response3 = await fetch('http://localhost:3000/api/unified-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: 'I want to become an Amazon seller and expand globally',
        language: 'en'
      })
    });
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Engine:', data3.engine);
    console.log('Mode:', data3.mode);
    console.log('Response Preview:', data3.response?.substring(0, 150) + '...');
    console.log('✅ Test 3:', data3.engine === 'GlobalSellerEngine' ? 'PASSED' : 'FAILED');
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 3 Error:', error.message);
  }

  console.log('✅ All unified-ai routing tests completed!');
}

testUnifiedAIRouting().catch(console.error);

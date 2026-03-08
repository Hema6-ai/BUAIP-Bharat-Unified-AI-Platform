// Test GlobalSeller Engine Endpoint

async function testGlobalSellerEngine() {
  console.log('Testing GlobalSeller Engine...\n');

  // Test 1: INDIA mode query
  console.log('Test 1: INDIA Mode - Sourcing Query');
  try {
    const response1 = await fetch('http://localhost:3000/api/globalseller-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Where can I find reliable manufacturers in India for handicrafts?',
        mode: 'INDIA',
        language: 'English'
      })
    });
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Engine:', data1.engine);
    console.log('Mode:', data1.mode);
    console.log('Active Modules:', data1.activeModules);
    console.log('Response Preview:', data1.response?.substring(0, 200) + '...');
    console.log('Data Context Keys:', Object.keys(data1.dataContext || {}));
    console.log('Routed by Intent:', data1.routedByIntent);
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 1 Error:', error.message);
  }

  // Test 2: GLOBAL mode query
  console.log('Test 2: GLOBAL Mode - Amazon Expansion Query');
  try {
    const response2 = await fetch('http://localhost:3000/api/globalseller-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'How do I expand my Amazon business from India to UK marketplace?',
        mode: 'GLOBAL',
        language: 'English'
      })
    });
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Engine:', data2.engine);
    console.log('Mode:', data2.mode);
    console.log('Active Modules:', data2.activeModules);
    console.log('Response Preview:', data2.response?.substring(0, 200) + '...');
    console.log('Data Context Keys:', Object.keys(data2.dataContext || {}));
    console.log('Routed by Intent:', data2.routedByIntent);
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 2 Error:', error.message);
  }

  // Test 3: Auto-detect mode
  console.log('Test 3: Auto-Detect Mode - Flipkart Query');
  try {
    const response3 = await fetch('http://localhost:3000/api/globalseller-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What are the GST requirements for selling on Flipkart?',
        language: 'English'
      })
    });
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Engine:', data3.engine);
    console.log('Mode (auto-detected):', data3.mode);
    console.log('Active Modules:', data3.activeModules);
    console.log('Response Preview:', data3.response?.substring(0, 200) + '...');
    console.log('Routed by Intent:', data3.routedByIntent);
    console.log('\n---\n');
  } catch (error) {
    console.error('Test 3 Error:', error.message);
  }

  console.log('✅ All tests completed!');
}

testGlobalSellerEngine().catch(console.error);

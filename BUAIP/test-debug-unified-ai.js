// Debug Unified AI Endpoint

async function debugUnifiedAI() {
  try {
    const response = await fetch('http://localhost:3000/api/unified-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do I source manufacturers from IndiaMART?',
        language: 'en'
      })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
    
    try {
      const json = JSON.parse(text);
      console.log('\nParsed JSON:', JSON.stringify(json, null, 2));
    } catch {
      console.log('\n(Response is not JSON)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugUnifiedAI();

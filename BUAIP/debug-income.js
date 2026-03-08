const http = require('http');

function test(message, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/scheme-conversation',
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
      timeout: 5000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: body, parseError: e.message });
        }
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('\nDEBUG: Testing Income Parsing Issue\n');
  
  const sessionId = 'debug-' + Date.now();
  const messages = [
    'namaste',
    'male',
    '50 years',
    'Punjab',
    '₹2,00,000 per year'  // This one fails
  ];

  for (let i = 0; i < messages.length; i++) {
    console.log(`\nStep ${i+1}: "${messages[i]}"`);
    try {
      const res = await test(messages[i], sessionId);
      console.log(`  Status: ${res.status}`);
      
      if (res.data) {
        console.log(`  Type: ${res.data.type}`);
        console.log(`  Response: ${JSON.stringify(res.data, null, 2).substring(0, 200)}`);
      } else if (res.rawBody) {
        console.log(`  Raw Body: ${res.rawBody.substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 600));
  }
}

run().catch(console.error);

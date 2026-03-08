const http = require('http');

function test(message, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/scheme-conversation',
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: e.message });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data, 'utf8');
    req.end();
  });
}

async function run() {
  console.log('\nFull Conversation Test (Plaintext Numbers)\n');
  
  const sessionId = 'plain-' + Date.now();
  
  const steps = [
    'hello',
    'female',
    '35',
    'Maharashtra',
    '3 lakhs annually',
    'OBC',
    'no',
    'married',
    'own house'
  ];

  for (let i = 0; i < steps.length; i++) {
    console.log(`\nStep ${i+1}: "${steps[i]}"`);
    try {
      const res = await test(steps[i], sessionId);
      console.log(`  Type: ${res.type}`);
      console.log(`  Progress: ${res.profileProgress?.completed}/${res.profileProgress?.total}`);
      
      if (res.type === 'schemes' && res.schemes) {
        console.log(`  ✓ SCHEMES: ${res.schemes.length} found`);
        res.schemes.slice(0, 3).forEach((s, j) => {
          console.log(`    ${j+1}. ${s.scheme_name}`);
        });
      } else if (res.type === 'message') {
        console.log(`  AI: ${res.text?.substring(0, 60)}...`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 600));
  }
}

run().catch(console.error);

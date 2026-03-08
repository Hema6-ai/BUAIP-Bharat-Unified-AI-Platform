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
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, rawBody: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data, 'utf8');
    req.end();
  });
}

async function run() {
  console.log('\n✓ Testing Income Formats\n');
  
  const sessionId = 'income-test-' + Date.now();
  
  const steps = [
    { msg: 'hello', desc: 'Greeting' },
    { msg: 'male', desc: 'Gender' },
    { msg: '50 years', desc: 'Age' },
    { msg: 'Punjab', desc: 'State' },
    { msg: '2 lakh per year', desc: 'Income (without rupee symbol)' },
    { msg: 'general', desc: 'Category' },
    { msg: 'no', desc: 'Disability' },
    { msg: 'married', desc: 'Marital' },
    { msg: 'own land', desc: 'Land - Should trigger schemes' }
  ];

  for (let i = 0; i < steps.length; i++) {
    const { msg, desc } = steps[i];
    try {
      const res = await test(msg, sessionId);
      const status = res.status === 200 ? '✓' : '❌';
      console.log(`  ${status} Step ${i+1}: ${desc} (${msg})`);
      if (res.data?.type === 'schemes') {
        console.log(`     → Found ${res.data.schemes?.length} schemes!`);
      }
    } catch (e) {
      console.log(`  ❌ Step ${i+1}: ${desc} - ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\nAll tests complete!')
}

run().catch(console.error);

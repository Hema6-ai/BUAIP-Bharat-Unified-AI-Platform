const http = require('http');

function test(message, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    const req = http.request({
      hostname: 'localhost',
      port: 3002,
      path: '/api/scheme-conversation',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('🧪 Testing Scheme Engine...\n');
  const sessionId = 'test-' + Date.now();
  
  const steps = [
    'hello',
    'female',
    '38 years old',
    'Maharashtra',
    '3 lakh per year',
    'OBC',
    'no'
  ];

  for (let i = 0; i < steps.length; i++) {
    console.log(Step : "");
    try {
      const res = await test(steps[i], sessionId);
      console.log(  Type: );
      console.log(  Progress: /);
      if (res.type === 'schemes') {
        console.log(  Schemes:  found);
        res.schemes?.slice(0, 2).forEach((s, j) => console.log(    $ { j+1 }. ));
      } else {
        console.log(  AI: ...);
      }
    } catch (e) {
      console.log(  ERROR: );
    }
    console.log('');
    await new Promise(r => setTimeout(r, 1000));
  }
}

run().catch(console.error);

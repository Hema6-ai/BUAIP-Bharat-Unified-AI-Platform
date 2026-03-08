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
          resolve({ rawError: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  TESTING SCHEME ELIGIBILITY ENGINE');
  console.log('════════════════════════════════════════════════════════════\n');
  
  const sessionId = 'test-female-' + Date.now();
  
  const steps = [
    { msg: 'hello', desc: 'Greeting' },
    { msg: 'female', desc: 'Gender' },
    { msg: '38 years old', desc: 'Age' },
    { msg: 'Maharashtra', desc: 'State' },
    { msg: '3 lakh per year', desc: 'Income' },
    { msg: 'OBC', desc: 'Social Category' },
    { msg: 'no', desc: 'Disability' }
  ];

  for (let i = 0; i < steps.length; i++) {
    console.log(`├─ Step ${i+1}/7: ${steps[i].desc}`);
    console.log(`│  User: "${steps[i].msg}"`);
    
    try {
      const res = await test(steps[i].msg, sessionId);
      
      if (res.rawError) {
        console.log(`│  ❌ ERROR: ${res.rawError.substring(0, 100)}`);
      } else {
        console.log(`│  ✓ Type: ${res.type}`);
        console.log(`│  ✓ Progress: ${res.profileProgress?.completed}/${res.profileProgress?.total}`);
        
        if (res.type === 'schemes') {
          console.log(`│  ✓ Schemes: ${res.schemes?.length} found`);
          if (res.schemes && res.schemes.length > 0) {
            res.schemes.slice(0, 3).forEach((s, j) => {
              console.log(`│     ${j+1}. ${s.scheme_name}`);
            });
          }
        } else if (res.type === 'message') {
          const aiMsg = res.text || res.message || '';
          console.log(`│  ✓ AI: ${aiMsg.substring(0, 70)}...`);
        }
        
        if (res.profile) {
          const fields = ['gender', 'age_group', 'state', 'annual_income', 'social_category', 'disability'];
          const filled = fields.filter(f => res.profile[f] !== undefined).length;
          console.log(`│  ✓ Profile: ${filled} fields filled`);
        }
      }
    } catch (e) {
      console.log(`│  ❌ EXCEPTION: ${e.message}`);
    }
    
    console.log('│');
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log('└─ Test Complete!');
  console.log('\n════════════════════════════════════════════════════════════\n');
}

run().catch(console.error);

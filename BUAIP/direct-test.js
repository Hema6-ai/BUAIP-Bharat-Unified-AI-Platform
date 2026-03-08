const http = require('http');

const data = JSON.stringify({ message: 'hello', sessionId: 'test-direct' });

const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/api/scheme-conversation',
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('\nResponse Body:');
    console.log(body.substring(0, 500));
  });
});

req.on('error', (err) => console.error('Error:', err.message));
req.write(data);
req.end();

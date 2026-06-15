import https from 'https';

https.get('https://backend-production-68b98.up.railway.app/health', (res) => {
  let data = '';
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Health check response:', data);
  });
}).on('error', (e) => {
  console.error('Request failed:', e);
});

require('dotenv').config();
const https = require('https');

console.log('Testing network connectivity to Supabase...');
console.log('Host from .env:', process.env.DB_HOST);

// Test basic HTTPS connectivity
const options = {
  hostname: 'supabase.com',
  port: 443,
  path: '/',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('✅ Can reach supabase.com - status:', res.statusCode);
  console.log('Network connectivity is working');
  
  // Now test your specific host
  console.log('\n🔍 Please double-check your Supabase project URL in the dashboard:');
  console.log('1. Go to Settings → Database');
  console.log('2. Look for "Host" in Connection Info');
  console.log('3. Make sure it matches:', process.env.DB_HOST);
  console.log('\n💡 Common issues:');
  console.log('- Wrong project reference ID');
  console.log('- Project not fully initialized');
  console.log('- Network firewall blocking connection');
});

req.on('error', (error) => {
  console.error('❌ Network error:', error.message);
  console.log('💡 This indicates a network connectivity issue');
});

req.end();

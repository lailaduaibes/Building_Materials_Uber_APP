/**
 * Google Places API Key Test Script
 */

const https = require('https');

const API_KEY = 'AIzaSyDgcKABlWbsVN5ai14wj05W1-NJM2G0GaI';
const testUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=riyadh&key=${API_KEY}`;

console.log('🔍 Testing Google Places API Key...');
console.log('📍 URL:', testUrl);
console.log('');

https.get(testUrl, (res) => {
  let data = '';
  
  console.log('📡 Status Code:', res.statusCode);
  console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ API Response:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.status === 'OK') {
        console.log('');
        console.log('🎉 SUCCESS: Google Places API key is working!');
        console.log(`📍 Found ${jsonData.predictions?.length || 0} predictions`);
      } else {
        console.log('');
        console.log('❌ ERROR: API returned status:', jsonData.status);
        console.log('💡 Error message:', jsonData.error_message || 'No error message');
      }
    } catch (error) {
      console.log('❌ Failed to parse JSON response');
      console.log('📄 Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.log('❌ Request failed:', err.message);
});

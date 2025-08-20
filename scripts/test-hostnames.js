require('dotenv').config();
const { Pool } = require('pg');

// Common Supabase hostname patterns to try
const hostnameVariations = [
  'db.pjbbtmuhlpscmrbgsyzb.supabase.co',
  'db.pjbbtmuhlpscmrbgsyzb.supabase.com', 
  'pjbbtmuhlpscmrbgsyzb.supabase.co',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com'
];

async function testConnections() {
  console.log('🔍 Testing different hostname variations for Supabase...\n');
  
  for (const hostname of hostnameVariations) {
    console.log(`🔗 Testing: ${hostname}`);
    
    const pool = new Pool({
      host: hostname,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '1412',
      ssl: { rejectUnauthorized: false },
      connectTimeoutMillis: 5000
    });
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ SUCCESS! Connected to:', hostname);
      console.log('📅 Server time:', result.rows[0].now);
      client.release();
      await pool.end();
      
      // Update the .env file with working hostname
      console.log('\n🎉 Found working connection!');
      console.log(`📝 Update your .env file with: DB_HOST=${hostname}`);
      return hostname;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message.substring(0, 50)}...`);
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  console.log('\n💡 None of the common hostnames worked.');
  console.log('📋 Please copy the EXACT hostname from your Supabase dashboard:');
  console.log('   Settings → Database → Connection Info → Host');
  return null;
}

testConnections();

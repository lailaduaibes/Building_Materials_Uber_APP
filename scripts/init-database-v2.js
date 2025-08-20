const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  console.log('🔄 Initializing database...');
  
  // Try multiple connection configurations
  const connectionConfigs = [
    // Direct connection string
    {
      name: 'Connection String',
      config: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    },
    // Individual parameters
    {
      name: 'Individual Parameters',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      }
    },
    // With different SSL config
    {
      name: 'Require SSL',
      config: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { require: true, rejectUnauthorized: false }
      }
    }
  ];

  for (const { name, config } of connectionConfigs) {
    console.log(`\n🔗 Trying ${name}...`);
    const pool = new Pool(config);
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW(), version()');
      console.log('✅ Database connected successfully!');
      console.log('📅 Server time:', result.rows[0].now);
      console.log('🗄️ PostgreSQL version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
      client.release();

      // Success! Use this connection for schema setup
      console.log('\n📄 Reading database schema...');
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('🏗️ Creating database tables...');
      await pool.query(schema);
      
      console.log('✅ Database initialization completed successfully!');
      console.log('📊 Tables created:');
      console.log('   - users');
      console.log('   - vehicles'); 
      console.log('   - drivers');
      console.log('   - orders');
      console.log('   - order_items');
      
      await pool.end();
      return; // Exit successfully
      
    } catch (error) {
      console.error(`❌ ${name} failed:`, error.message);
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      continue; // Try next configuration
    }
  }
  
  console.error('\n💔 All connection attempts failed!');
  console.log('\n🔍 Please verify in your Supabase dashboard:');
  console.log('1. Project is fully initialized (not "Setting up...")');
  console.log('2. Database password is correct');
  console.log('3. Your IP is not blocked by any firewall');
  process.exit(1);
}

initDatabase();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspectTableSchemas() {
  console.log('🔍 INSPECTING TABLE SCHEMAS');
  console.log('============================\n');
  
  try {
    // Test each table by querying actual data to see column names
    const tables = ['driver_profiles', 'materials', 'trip_requests', 'users'];
    
    for (const tableName of tables) {
      console.log(`🔧 ${tableName.toUpperCase()} TABLE:`);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Error accessing ${tableName}:`, error);
        } else if (data && data.length > 0) {
          console.log(`✅ Columns found:`, Object.keys(data[0]).join(', '));
          console.log(`📝 Sample data structure:`);
          Object.entries(data[0]).forEach(([key, value]) => {
            const valueType = value === null ? 'null' : typeof value;
            const preview = value === null ? 'NULL' : 
                           typeof value === 'string' && value.length > 50 ? 
                           value.substring(0, 50) + '...' : 
                           String(value);
            console.log(`   ${key}: ${valueType} = ${preview}`);
          });
        } else {
          console.log(`⚠️ Table ${tableName} exists but is empty`);
          // Try to get structure even if empty
          const { data: emptyData, error: emptyError } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);
          
          if (!emptyError) {
            console.log(`✅ Table structure confirmed (empty table)`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to access ${tableName}:`, error.message);
      }
      console.log('');
    }
    
    // Check specific problematic columns
    console.log('🧪 TESTING SPECIFIC COLUMN ACCESS:');
    console.log('');
    
    // Test driver_profiles with different possible column names
    console.log('🚗 Testing driver_profiles column variations:');
    const driverColumns = ['full_name', 'name', 'driver_name', 'first_name', 'last_name'];
    for (const col of driverColumns) {
      try {
        const { data, error } = await supabase
          .from('driver_profiles')
          .select(col)
          .limit(1);
        
        if (!error) {
          console.log(`✅ Column '${col}' exists in driver_profiles`);
        }
      } catch (error) {
        console.log(`❌ Column '${col}' not found in driver_profiles`);
      }
    }
    console.log('');
    
    // Test materials with different possible column names
    console.log('🧱 Testing materials column variations:');
    const materialColumns = ['unit_price', 'price', 'price_per_unit', 'cost', 'rate'];
    for (const col of materialColumns) {
      try {
        const { data, error } = await supabase
          .from('materials')
          .select(col)
          .limit(1);
        
        if (!error) {
          console.log(`✅ Column '${col}' exists in materials`);
        }
      } catch (error) {
        console.log(`❌ Column '${col}' not found in materials`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error inspecting schemas:', error);
  }
}

inspectTableSchemas();

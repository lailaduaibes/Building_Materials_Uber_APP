const { createClient } = require('@supabase/supabase-js');

const serviceSupabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function runLailaSQLChecks() {
  console.log('🔍 Running Laila\'s SQL validation checks...');
  
  // Check 1: LAILA_DATA_CHECK
  console.log('\n📊 LAILA_DATA_CHECK:');
  const query1 = `
    SELECT 
        'LAILA_DATA_CHECK' as info,
        first_name,
        vehicle_plate,
        vehicle_model,
        SPLIT_PART(vehicle_model, ' ', 1) as make_part,
        SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1) as model_part,
        vehicle_max_payload,
        vehicle_max_volume,
        CASE 
            WHEN vehicle_plate IS NULL THEN 'vehicle_plate IS NULL'
            WHEN vehicle_model IS NULL THEN 'vehicle_model IS NULL'
            WHEN SPLIT_PART(vehicle_model, ' ', 1) = '' THEN 'make will be empty'
            WHEN vehicle_max_payload IS NULL THEN 'vehicle_max_payload IS NULL'
            WHEN vehicle_max_volume IS NULL THEN 'vehicle_max_volume IS NULL'
            ELSE 'DATA_LOOKS_GOOD'
        END as validation_issue
    FROM driver_profiles
    WHERE first_name ILIKE '%Laila%';
  `;
  
  const { data: check1, error: error1 } = await serviceSupabase.rpc('execute_sql', { sql_query: query1 });
  if (error1) {
    console.error('❌ Error in check 1:', error1);
  } else {
    console.log('Results:', check1);
  }

  // Check 2: TRIGGER_LOGIC_TEST
  console.log('\n🔧 TRIGGER_LOGIC_TEST:');
  const query2 = `
    SELECT 
        'TRIGGER_LOGIC_TEST' as info,
        COALESCE(SPLIT_PART('Honda Civic', ' ', 1), 'Unknown') as make_result,
        COALESCE(SUBSTRING('Honda Civic' FROM POSITION(' ' IN 'Honda Civic') + 1), 'Honda Civic') as model_result,
        COALESCE(NULL::numeric, 5.0) as payload_result,
        COALESCE(NULL::numeric, 10.0) as volume_result;
  `;
  
  const { data: check2, error: error2 } = await serviceSupabase.rpc('execute_sql', { sql_query: query2 });
  if (error2) {
    console.error('❌ Error in check 2:', error2);
  } else {
    console.log('Results:', check2);
  }

  // Check 3: STRING_FUNCTIONS_TEST  
  console.log('\n🔍 STRING_FUNCTIONS_TEST:');
  const query3 = `
    SELECT 
        'STRING_FUNCTIONS_TEST' as info,
        vehicle_model,
        SPLIT_PART(vehicle_model, ' ', 1) as make_extracted,
        SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1) as model_extracted,
        LENGTH(SPLIT_PART(vehicle_model, ' ', 1)) as make_length,
        LENGTH(SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1)) as model_length
    FROM driver_profiles
    WHERE first_name ILIKE '%Laila%';
  `;
  
  const { data: check3, error: error3 } = await serviceSupabase.rpc('execute_sql', { sql_query: query3 });
  if (error3) {
    console.error('❌ Error in check 3:', error3);
  } else {
    console.log('Results:', check3);
  }
}

runLailaSQLChecks().catch(console.error);

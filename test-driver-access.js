const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function testDriverAccess() {
  console.log('🔍 Testing driver access with service key...');
  
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('id, user_id, first_name, last_name, phone')
    .limit(3);
    
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Found drivers:', data.length);
    data.forEach(d => console.log(`- ${d.first_name} ${d.last_name}: id=${d.id}, user_id=${d.user_id}`));
  }
  
  // Test specific lookup
  console.log('\n🔍 Testing specific lookup for 4ab16336-a414-4b73-8dc9-ab97d0eed1a7...');
  const { data: specific, error: specificError } = await supabase
    .from('driver_profiles')
    .select('id, user_id, first_name, last_name, phone')
    .eq('user_id', '4ab16336-a414-4b73-8dc9-ab97d0eed1a7')
    .single();
    
  if (specificError) {
    console.error('❌ Specific lookup error:', specificError);
  } else {
    console.log('✅ Found specific driver:', specific);
  }
}

testDriverAccess();

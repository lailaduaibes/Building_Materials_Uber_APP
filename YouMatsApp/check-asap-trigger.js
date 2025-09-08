// Check if ASAP trigger exists in database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2ODM3NjYsImV4cCI6MjA0OTI1OTc2Nn0.HjCG5v4WUOGfgBo0D4IXKz_o4b7PGYd_c-HEd1KRGXk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkASAPTrigger() {
  console.log('🔍 Checking if ASAP trigger exists in database...');
  
  try {
    // Check if trigger exists
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .or('trigger_name.ilike.%asap%,action_statement.ilike.%asap%,action_statement.ilike.%start_asap_matching%');
    
    if (triggerError) {
      console.log('⚠️ Cannot query triggers table directly, trying alternative method...');
      
      // Alternative: Check if trigger function exists
      const { data: functions, error: funcError } = await supabase
        .rpc('check_function_exists', { function_name: 'trigger_asap_matching' });
      
      if (funcError) {
        console.log('⚠️ Cannot check trigger function, trying SQL query...');
        
        // Try direct SQL query
        const { data: sqlResult, error: sqlError } = await supabase
          .from('pg_trigger')
          .select('*')
          .ilike('tgname', '%asap%');
        
        if (sqlError) {
          console.error('❌ Cannot access trigger information:', sqlError);
          
          // Last resort: Try to query pg_stat_user_functions
          console.log('🔄 Trying to check functions instead...');
          
          const { data: funcList, error: funcListError } = await supabase
            .rpc('get_function_list');
          
          if (funcListError) {
            console.error('❌ Cannot access function information:', funcListError);
            console.log('📝 Manual check needed - trigger status unknown');
          } else {
            console.log('✅ Functions found:', funcList);
          }
        } else {
          console.log('📋 Trigger results:', sqlResult);
        }
      } else {
        console.log('📋 Function check results:', functions);
      }
    } else {
      console.log('📋 Trigger results:', triggers);
    }
    
    // Check if start_asap_matching_uber_style function exists
    console.log('\n🔍 Checking if start_asap_matching_uber_style function exists...');
    
    const { data: uberStyleResult, error: uberStyleError } = await supabase
      .rpc('start_asap_matching_uber_style', { trip_request_id: '00000000-0000-0000-0000-000000000000' });
    
    if (uberStyleError) {
      if (uberStyleError.message && uberStyleError.message.includes('does not exist')) {
        console.log('❌ start_asap_matching_uber_style function does NOT exist');
      } else if (uberStyleError.message && uberStyleError.message.includes('Trip request not found')) {
        console.log('✅ start_asap_matching_uber_style function EXISTS (returned expected error for fake ID)');
      } else {
        console.log('⚠️ Unexpected error checking function:', uberStyleError.message);
      }
    } else {
      console.log('✅ start_asap_matching_uber_style function EXISTS and returned:', uberStyleResult);
    }
    
    // Check recent ASAP trips to see if they were processed
    console.log('\n🔍 Checking recent ASAP trips...');
    
    const { data: recentTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id, acceptance_deadline, created_at, pickup_time_preference')
      .eq('pickup_time_preference', 'asap')
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tripsError) {
      console.error('❌ Error fetching recent trips:', tripsError);
    } else {
      console.log('📋 Recent ASAP trips:');
      recentTrips.forEach(trip => {
        console.log(`  - ${trip.id.substring(0, 8)}: status="${trip.status}", driver="${trip.assigned_driver_id ? trip.assigned_driver_id.substring(0, 8) : 'NULL'}", deadline="${trip.acceptance_deadline || 'NULL'}"`);
      });
      
      // Analyze the trips
      if (recentTrips.length === 0) {
        console.log('ℹ️ No recent ASAP trips found');
      } else {
        const assignedTrips = recentTrips.filter(t => t.assigned_driver_id);
        const withDeadlines = recentTrips.filter(t => t.acceptance_deadline);
        
        console.log(`\n📊 Analysis:`);
        console.log(`  - Total ASAP trips: ${recentTrips.length}`);
        console.log(`  - Assigned to drivers: ${assignedTrips.length}`);
        console.log(`  - With acceptance deadlines: ${withDeadlines.length}`);
        
        if (assignedTrips.length === 0) {
          console.log('⚠️ NO TRIPS WERE ASSIGNED - Trigger is likely NOT working');
        } else if (assignedTrips.length === recentTrips.length) {
          console.log('✅ ALL trips were assigned - Trigger appears to be working');
        } else {
          console.log('⚠️ SOME trips were assigned - Trigger may be partially working');
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error checking trigger:', error);
  }
}

checkASAPTrigger();

/**
 * 🔍 ASAP System Diagnostic - Check Current Database Functions
 * This will help identify which ASAP functions are active and why multiple drivers get trips
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseASAPSystem() {
  console.log('🔍 === ASAP SYSTEM DIAGNOSTIC === 🔍\n');

  try {
    // 1. Check what ASAP-related functions exist in database
    console.log('📋 1. CHECKING EXISTING ASAP FUNCTIONS:');
    const { data: functions, error: funcError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          routine_name,
          routine_type,
          specific_name,
          routine_definition
        FROM information_schema.routines 
        WHERE routine_name LIKE '%asap%' 
           OR routine_name LIKE '%start_%matching%'
        ORDER BY routine_name;
      `
    });

    if (funcError) {
      console.log('❌ Error checking functions:', funcError);
    } else {
      console.log(`Found ${functions?.length || 0} ASAP-related functions:`);
      functions?.forEach(func => {
        console.log(`  - ${func.routine_name} (${func.routine_type})`);
      });
    }

    // 2. Check if asap_driver_queue table exists and has data
    console.log('\n📋 2. CHECKING ASAP_DRIVER_QUEUE TABLE:');
    const { data: queueCheck, error: queueError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          COUNT(*) as total_queue_entries,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_entries,
          COUNT(CASE WHEN status = 'notified' THEN 1 END) as notified_entries,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_entries,
          COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_entries,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_entries
        FROM asap_driver_queue;
      `
    });

    if (queueError) {
      console.log('❌ Error checking queue:', queueError);
    } else {
      console.log('Queue statistics:', queueCheck?.[0]);
    }

    // 3. Check recent ASAP trips and their assigned_driver_id status
    console.log('\n📋 3. CHECKING RECENT ASAP TRIPS:');
    const { data: recentTrips, error: tripsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          id,
          status,
          pickup_time_preference,
          assigned_driver_id,
          created_at,
          load_description
        FROM trip_requests 
        WHERE pickup_time_preference = 'asap' 
        ORDER BY created_at DESC 
        LIMIT 5;
      `
    });

    if (tripsError) {
      console.log('❌ Error checking trips:', tripsError);
    } else {
      console.log('Recent ASAP trips:');
      recentTrips?.forEach(trip => {
        console.log(`  - ${trip.id.substring(0, 8)}... | Status: ${trip.status} | Driver: ${trip.assigned_driver_id || 'NONE'} | ${trip.load_description}`);
      });
    }

    // 4. Check what triggers exist on trip_requests
    console.log('\n📋 4. CHECKING DATABASE TRIGGERS:');
    const { data: triggers, error: triggerError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_statement,
          action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'trip_requests'
        ORDER BY trigger_name;
      `
    });

    if (triggerError) {
      console.log('❌ Error checking triggers:', triggerError);
    } else {
      console.log(`Found ${triggers?.length || 0} triggers on trip_requests:`);
      triggers?.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
      });
    }

    // 5. Check driver availability
    console.log('\n📋 5. CHECKING AVAILABLE DRIVERS:');
    const { data: drivers, error: driverError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          dp.user_id,
          dp.first_name,
          dp.last_name,
          dp.is_approved,
          dp.approval_status,
          CASE WHEN dl.user_id IS NOT NULL THEN 'HAS_LOCATION' ELSE 'NO_LOCATION' END as location_status
        FROM driver_profiles dp
        LEFT JOIN driver_locations dl ON dp.user_id = dl.user_id
        WHERE dp.is_approved = true 
          AND dp.approval_status = 'approved'
        LIMIT 5;
      `
    });

    if (driverError) {
      console.log('❌ Error checking drivers:', driverError);
    } else {
      console.log(`Found ${drivers?.length || 0} approved drivers:`);
      drivers?.forEach(driver => {
        console.log(`  - ${driver.first_name} ${driver.last_name} | Status: ${driver.approval_status} | Location: ${driver.location_status}`);
      });
    }

    // 6. Test which start_asap_matching function is currently active
    console.log('\n📋 6. TESTING CURRENT START_ASAP_MATCHING FUNCTION:');
    
    // First, let's see what the function definition looks like
    const { data: funcDef, error: funcDefError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT routine_definition 
        FROM information_schema.routines 
        WHERE routine_name = 'start_asap_matching'
        LIMIT 1;
      `
    });

    if (funcDefError) {
      console.log('❌ Error getting function definition:', funcDefError);
    } else if (funcDef?.[0]?.routine_definition) {
      const definition = funcDef[0].routine_definition;
      console.log('Current start_asap_matching function definition (first 200 chars):');
      console.log(definition.substring(0, 200) + '...');
      
      // Check which variant it's calling
      if (definition.includes('start_asap_matching_uber_style')) {
        console.log('✅ Function calls: start_asap_matching_uber_style');
      } else if (definition.includes('start_asap_matching_bulletproof')) {
        console.log('✅ Function calls: start_asap_matching_bulletproof');  
      } else if (definition.includes('start_asap_matching_final_fix')) {
        console.log('✅ Function calls: start_asap_matching_final_fix');
      } else {
        console.log('⚠️ Function calls: Unknown or direct implementation');
      }
    }

    console.log('\n🎯 === DIAGNOSTIC SUMMARY ===');
    console.log('Now please run this script and share the output so we can identify the issue!');

  } catch (error) {
    console.error('💥 Diagnostic failed:', error);
  }
}

// Run the diagnostic
diagnoseASAPSystem();

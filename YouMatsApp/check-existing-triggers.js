/**
 * 🔍 CHECK EXISTING TRIGGERS
 * Let's find what triggers are already in the database
 */

async function checkExistingTriggers() {
  console.log('🔍 Checking Existing Triggers in Database...\n');

  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📋 1. CHECKING TRIGGERS ON trip_requests TABLE:');
    console.log('=' .repeat(60));

    // Method 1: Query information_schema.triggers
    const { data: triggers1, error: error1 } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            trigger_name,
            event_manipulation,
            action_timing,
            action_statement
          FROM information_schema.triggers 
          WHERE event_object_table = 'trip_requests'
          ORDER BY trigger_name;
        `
      });

    if (error1) {
      console.log('❌ Method 1 failed:', error1.message);
    } else {
      console.log(`Method 1 found ${triggers1?.length || 0} triggers:`);
      triggers1?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
        console.log(`     Action: ${trigger.action_statement?.substring(0, 100)}...`);
      });
    }

    console.log('\n📋 2. CHECKING ALL TRIGGERS IN DATABASE:');
    console.log('=' .repeat(60));

    // Method 2: Get all triggers
    const { data: allTriggers, error: error2 } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            trigger_name,
            event_object_table,
            event_manipulation,
            action_timing
          FROM information_schema.triggers 
          WHERE trigger_name LIKE '%asap%' 
             OR trigger_name LIKE '%trip%'
             OR trigger_name LIKE '%matching%'
          ORDER BY trigger_name;
        `
      });

    if (error2) {
      console.log('❌ Method 2 failed:', error2.message);
    } else {
      console.log(`Method 2 found ${allTriggers?.length || 0} ASAP/trip related triggers:`);
      allTriggers?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} on ${trigger.event_object_table} (${trigger.event_manipulation} ${trigger.action_timing})`);
      });
    }

    console.log('\n📋 3. CHECKING TRIGGER FUNCTIONS:');
    console.log('=' .repeat(60));

    // Method 3: Check for trigger functions
    const { data: triggerFuncs, error: error3 } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            routine_name,
            routine_type
          FROM information_schema.routines 
          WHERE routine_name LIKE '%trigger%'
             OR routine_name LIKE '%asap%'
             OR routine_name LIKE '%matching%'
          ORDER BY routine_name;
        `
      });

    if (error3) {
      console.log('❌ Method 3 failed:', error3.message);
    } else {
      console.log(`Method 3 found ${triggerFuncs?.length || 0} trigger-related functions:`);
      triggerFuncs?.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    }

    console.log('\n📋 4. DIRECT POSTGRES SYSTEM CATALOG CHECK:');
    console.log('=' .repeat(60));

    // Method 4: Direct postgres system catalogs
    const { data: pgTriggers, error: error4 } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            t.tgname as trigger_name,
            c.relname as table_name,
            p.proname as function_name
          FROM pg_trigger t
          JOIN pg_class c ON t.tgrelid = c.oid
          JOIN pg_proc p ON t.tgfoid = p.oid
          WHERE c.relname = 'trip_requests'
            AND NOT t.tgisinternal
          ORDER BY t.tgname;
        `
      });

    if (error4) {
      console.log('❌ Method 4 failed:', error4.message);
    } else {
      console.log(`Method 4 found ${pgTriggers?.length || 0} triggers on trip_requests:`);
      pgTriggers?.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} → calls function ${trigger.function_name}`);
      });
    }

    console.log('\n🎯 === TRIGGER ANALYSIS SUMMARY ===');
    console.log('Now I can see what triggers are already set up!');

  } catch (error) {
    console.error('💥 Trigger check failed:', error);
  }
}

// Run the check
checkExistingTriggers();

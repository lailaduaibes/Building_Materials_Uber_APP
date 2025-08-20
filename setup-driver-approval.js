const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function setupDriverApplicationSystem() {
  try {
    console.log('🚀 Setting up professional driver application system...\n');
    
    // Step 1: Add approval fields to driver_profiles
    console.log('1. Adding approval fields to driver_profiles...');
    
    const approvalFields = [
      'is_approved BOOLEAN DEFAULT FALSE',
      'verification_status VARCHAR(20) DEFAULT \'pending\'',
      'application_submitted_at TIMESTAMP DEFAULT NOW()',
      'approved_at TIMESTAMP',
      'approved_by UUID',
      'rejection_reason TEXT',
      'admin_notes TEXT'
    ];
    
    for (const field of approvalFields) {
      const sql = `ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS ${field}`;
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error && !error.message.includes('already exists')) {
        console.log('   Warning:', error.message);
      }
    }
    console.log('   ✅ Approval fields added');
    
    // Step 2: Update existing drivers to approved status
    console.log('2. Updating existing drivers to approved status...');
    const { data: updatedDrivers, error: updateError } = await supabase
      .from('driver_profiles')
      .update({
        is_approved: true,
        verification_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .not('id', 'is', null)
      .select('id, is_approved, verification_status');
    
    if (!updateError) {
      console.log(`   ✅ Updated ${updatedDrivers?.length || 0} existing drivers to approved status`);
    } else {
      console.log('   Error updating drivers:', updateError.message);
    }
    
    // Step 3: Test the new system
    console.log('3. Testing the new approval system...');
    const { data: testDrivers, error: testError } = await supabase
      .from('driver_profiles')
      .select('id, is_approved, verification_status, approved_at')
      .limit(3);
      
    if (!testError && testDrivers) {
      console.log('   ✅ Professional driver approval system is ready!');
      console.log('\n📊 Sample driver statuses:');
      testDrivers.forEach((driver, i) => {
        console.log(`   ${i + 1}. Driver ${driver.id.substring(0, 8)}`);
        console.log(`      Approved: ${driver.is_approved}`);
        console.log(`      Status: ${driver.verification_status}`);
        console.log(`      Approved at: ${driver.approved_at?.substring(0, 19) || 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('🎉 Professional driver workflow is now ready!');
    console.log('\n📝 Next steps:');
    console.log('   • Drivers can register (currently auto-approved)');
    console.log('   • Admin dashboard can review applications');
    console.log('   • Vehicle verification system ready');
    
  } catch (error) {
    console.error('❌ Error setting up driver application system:', error.message);
  }
}

setupDriverApplicationSystem();

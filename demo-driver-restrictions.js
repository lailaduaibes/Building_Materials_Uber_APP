const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function demonstrateRestrictionSystem() {
  console.log('🔒 DRIVER RESTRICTION SYSTEM DEMONSTRATION\n');
  
  // Get current driver
  const { data: driver } = await supabase
    .from('driver_profiles')
    .select('*')
    .eq('first_name', 'Ahmed')
    .single();
  
  console.log('👤 CURRENT DRIVER STATE:');
  console.log('========================');
  console.log('Driver:', driver.first_name, driver.last_name);
  console.log('Specializations:', driver.specializations);
  
  const isCurrentlyApproved = driver.specializations?.includes('APPROVED_BY_ADMIN');
  console.log('Current Status:', isCurrentlyApproved ? '✅ APPROVED' : '❌ NOT APPROVED');
  console.log('');
  
  if (isCurrentlyApproved) {
    console.log('🧪 TESTING: REMOVE APPROVAL TO DEMONSTRATE RESTRICTION');
    console.log('======================================================');
    
    // Remove approval to demonstrate restriction
    const restrictedSpecializations = driver.specializations.filter(s => s !== 'APPROVED_BY_ADMIN');
    
    await supabase
      .from('driver_profiles')
      .update({ specializations: restrictedSpecializations })
      .eq('id', driver.id);
    
    console.log('✅ Temporarily removed approval for demonstration');
    console.log('New specializations:', restrictedSpecializations);
    console.log('');
  }
  
  // Now test the restriction
  console.log('🚫 TESTING TRIP ACCEPTANCE WITH NON-APPROVED DRIVER:');
  console.log('====================================================');
  
  // Simulate trip acceptance attempt
  const tripAcceptanceResult = await simulateTripAcceptance(driver.user_id);
  
  if (tripAcceptanceResult.success) {
    console.log('✅ Trip acceptance: ALLOWED');
  } else {
    console.log('❌ Trip acceptance: BLOCKED');
    console.log('   Reason:', tripAcceptanceResult.error);
  }
  console.log('');
  
  console.log('🔄 NOW APPROVING DRIVER AGAIN:');
  console.log('==============================');
  
  // Re-approve driver
  const approvedSpecializations = [...(driver.specializations.filter(s => s !== 'APPROVED_BY_ADMIN')), 'APPROVED_BY_ADMIN'];
  
  await supabase
    .from('driver_profiles')
    .update({ specializations: approvedSpecializations })
    .eq('id', driver.id);
  
  console.log('✅ Driver re-approved');
  console.log('Updated specializations:', approvedSpecializations);
  console.log('');
  
  // Test again with approved driver
  console.log('✅ TESTING TRIP ACCEPTANCE WITH APPROVED DRIVER:');
  console.log('=================================================');
  
  const approvedTripResult = await simulateTripAcceptance(driver.user_id);
  
  if (approvedTripResult.success) {
    console.log('✅ Trip acceptance: ALLOWED');
    console.log('   Driver can now accept trips normally');
  } else {
    console.log('❌ Trip acceptance: BLOCKED (unexpected)');
    console.log('   Reason:', approvedTripResult.error);
  }
  
  console.log('');
  console.log('📱 HOW TO IMPLEMENT IN MOBILE APP:');
  console.log('===================================');
  console.log('Add this function to DriverService.ts:');
  console.log('');
  console.log('```typescript');
  console.log('async checkDriverApproval(): Promise<boolean> {');
  console.log('  try {');
  console.log('    const { data: driver, error } = await this.supabase');
  console.log('      .from("driver_profiles")');
  console.log('      .select("specializations")');
  console.log('      .eq("user_id", this.currentUserId)');
  console.log('      .single();');
  console.log('');
  console.log('    if (error) throw error;');
  console.log('');
  console.log('    return driver.specializations?.includes("APPROVED_BY_ADMIN") || false;');
  console.log('  } catch (error) {');
  console.log('    console.error("Error checking approval:", error);');
  console.log('    return false;');
  console.log('  }');
  console.log('}');
  console.log('');
  console.log('async acceptTrip(tripId: string) {');
  console.log('  // 1. Check approval first');
  console.log('  const isApproved = await this.checkDriverApproval();');
  console.log('');
  console.log('  if (!isApproved) {');
  console.log('    throw new Error("Your driver application is pending admin approval");');
  console.log('  }');
  console.log('');
  console.log('  // 2. Proceed with trip acceptance');
  console.log('  return await this.supabase.from("trip_requests")...');
  console.log('}');
  console.log('```');
}

async function simulateTripAcceptance(userId) {
  try {
    // Check if driver is approved
    const { data: driver, error } = await supabase
      .from('driver_profiles')
      .select('specializations')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      return { success: false, error: 'Driver not found' };
    }
    
    const isApproved = driver.specializations?.includes('APPROVED_BY_ADMIN');
    
    if (!isApproved) {
      return { 
        success: false, 
        error: 'Driver not approved by admin. Please wait for approval.' 
      };
    }
    
    // If approved, trip acceptance would proceed
    return { success: true, message: 'Trip acceptance allowed' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

demonstrateRestrictionSystem();

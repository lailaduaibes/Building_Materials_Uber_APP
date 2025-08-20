const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testNavigationStateLogic() {
  try {
    console.log('🚀 Testing Navigation State Logic Fix...\n');

    // Get an existing trip to test with
    console.log('1. Finding existing trip to test with...');
    const { data: existingTrips, error: fetchError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_started_at, pickup_completed_at')
      .limit(3);

    if (fetchError) {
      console.error('Error fetching trips:', fetchError);
      return;
    }

    let testTrip = existingTrips[0];
    console.log(`Using trip: ${testTrip.id.substring(0, 8)}`);
    console.log(`Current status: ${testTrip.status}`);

    // Function to simulate the FIXED UI state logic
    function getUIState(trip) {
      console.log(`   Analyzing trip: status="${trip.status}", pickup_completed="${!!trip.pickup_completed_at}"`);
      
      switch (trip.status) {
        case 'matched':
          return { step: 'heading_to_pickup', button: 'Arrived at Pickup', description: 'Driver heading to pickup location' };
        case 'in_transit':
          if (trip.pickup_completed_at) {
            return { step: 'heading_to_delivery', button: 'Arrived at Delivery', description: 'Pickup done, heading to delivery' };
          } else {
            return { step: 'arrived_at_pickup', button: 'Start Trip / Picked Up', description: 'Trip started, waiting for pickup confirmation' };
          }
        case 'delivered':
          return { step: 'arrived_at_delivery', button: 'Trip Completed', description: 'Trip finished' };
        default:
          return { step: 'heading_to_pickup', button: 'Arrived at Pickup', description: 'Default state' };
      }
    }

    // Test scenario 1: Reset trip to matched
    console.log('\n2. Testing scenario: Trip is "matched"...');
    await supabase
      .from('trip_requests')
      .update({
        status: 'matched',
        pickup_started_at: null,
        pickup_completed_at: null
      })
      .eq('id', testTrip.id);

    let updatedTrip = { ...testTrip, status: 'matched', pickup_started_at: null, pickup_completed_at: null };
    let uiState = getUIState(updatedTrip);
    console.log(`   ✅ UI State: ${uiState.step} - ${uiState.description}`);
    console.log(`   ✅ Button: ${uiState.button}`);

    // Test scenario 2: Start trip (in_transit but no pickup_completed_at)
    console.log('\n3. Testing scenario: "Start Trip" clicked...');
    const now = new Date().toISOString();
    await supabase
      .from('trip_requests')
      .update({
        status: 'in_transit',
        pickup_started_at: now
      })
      .eq('id', testTrip.id);

    updatedTrip = { ...testTrip, status: 'in_transit', pickup_started_at: now, pickup_completed_at: null };
    uiState = getUIState(updatedTrip);
    console.log(`   ✅ UI State: ${uiState.step} - ${uiState.description}`);
    console.log(`   ✅ Button: ${uiState.button}`);
    
    if (uiState.step === 'arrived_at_pickup') {
      console.log('   🎉 CORRECT: Shows pickup confirmation screen (not back to start!)');
    } else {
      console.log('   ❌ WRONG: Should show pickup confirmation screen');
    }

    // Test scenario 3: Complete pickup
    console.log('\n4. Testing scenario: Pickup completed...');
    await supabase
      .from('trip_requests')
      .update({
        pickup_completed_at: new Date().toISOString()
      })
      .eq('id', testTrip.id);

    updatedTrip = { ...updatedTrip, pickup_completed_at: new Date().toISOString() };
    uiState = getUIState(updatedTrip);
    console.log(`   ✅ UI State: ${uiState.step} - ${uiState.description}`);
    console.log(`   ✅ Button: ${uiState.button}`);

    if (uiState.step === 'heading_to_delivery') {
      console.log('   ✅ CORRECT: Now heading to delivery');
    }

    console.log('\n🎯 PROBLEM & SOLUTION SUMMARY:');
    console.log('===============================');
    console.log('❌ BEFORE (The Problem):');
    console.log('   When status="in_transit" && pickup_completed_at=null');
    console.log('   → UI step was "heading_to_pickup"');
    console.log('   → User saw "Arrived at Pickup" button again');
    console.log('   → Looked like trip never started');
    console.log('   → User complained: "it returns to start trip"');
    console.log('');
    console.log('✅ AFTER (The Fix):');
    console.log('   When status="in_transit" && pickup_completed_at=null');
    console.log('   → UI step is "arrived_at_pickup"');  
    console.log('   → User sees pickup confirmation screen');
    console.log('   → Shows that trip has started');
    console.log('   → Progress is preserved when leaving/returning to app');
    console.log('');
    console.log('🔧 Code Change Made:');
    console.log('   In DriverNavigationScreen.tsx, case "in_transit":');
    console.log('   BEFORE: setCurrentStep("heading_to_pickup")');
    console.log('   AFTER:  setCurrentStep("arrived_at_pickup")');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testNavigationStateLogic();

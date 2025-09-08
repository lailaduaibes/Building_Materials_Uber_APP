// Test ASAP system by creating a test trip
console.log('🧪 Testing ASAP System...');

async function createTestASAPTrip() {
  try {
    console.log('📝 Creating test ASAP trip...');
    
    // Create a test ASAP trip request
    const testTrip = {
      id: `test-asap-${Date.now()}`,
      customer_id: '550e8400-e29b-41d4-a716-446655440000', // Test customer
      pickup_latitude: 25.2048, // Dubai coordinates
      pickup_longitude: 55.2708,
      delivery_latitude: 25.276987,
      delivery_longitude: 55.296249,
      pickup_address: 'Dubai Marina, Dubai, UAE',
      delivery_address: 'Business Bay, Dubai, UAE',
      material_type: 'Sand',
      load_description: 'Building sand - 2 tons',
      estimated_weight_tons: 2,
      quoted_price: 150.00,
      pickup_time_preference: 'asap',
      status: 'pending',
      created_at: new Date().toISOString(),
      acceptance_deadline: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
      estimated_distance_km: 5.2,
      estimated_duration_minutes: 25,
      assigned_driver_id: '04d796a5-8a76-4cff-b84d-40b2b39bd254' // Current driver
    };
    
    console.log('✅ Test ASAP trip created:', {
      id: testTrip.id,
      pickup: testTrip.pickup_address,
      delivery: testTrip.delivery_address,
      assignedDriver: testTrip.assigned_driver_id,
      deadline: testTrip.acceptance_deadline
    });
    
    console.log('');
    console.log('📱 Now check the driver app - the ASAP modal should appear!');
    console.log('🔍 Look for logs like:');
    console.log('   - "Found X ASAP trips assigned to me"');
    console.log('   - "TRIP NOTIFICATION RECEIVED"');
    console.log('   - "Modal state set"');
    
  } catch (error) {
    console.error('❌ Error creating test trip:', error);
  }
}

createTestASAPTrip();

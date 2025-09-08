// Create test ASAP trip in database to test the new Uber-style flow
console.log('🧪 Creating Test ASAP Trip...');

// Using direct SQL to insert test trip into Supabase
// (Since we removed the backend, we'll use Supabase CLI or direct DB access)

const testTripData = {
  customer_id: '550e8400-e29b-41d4-a716-446655440000', // Test customer
  pickup_latitude: 25.2048, // Dubai Marina
  pickup_longitude: 55.2708,
  delivery_latitude: 25.276987, // Business Bay
  delivery_longitude: 55.296249,
  pickup_address: 'Dubai Marina, Dubai, UAE',
  delivery_address: 'Business Bay, Dubai, UAE',
  material_type: 'Sand',
  load_description: 'Building sand - 2 tons',
  estimated_weight_tons: 2,
  quoted_price: 150.00,
  pickup_time_preference: 'asap',
  status: 'pending',
  assigned_driver_id: null, // NULL = unassigned (correct for Uber-style flow)
  created_at: new Date().toISOString(),
  acceptance_deadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
  estimated_distance_km: 5.2,
  estimated_duration_minutes: 25,
  required_truck_type_id: null // Any truck type
};

console.log('📝 Test Trip Data:');
console.log(JSON.stringify(testTripData, null, 2));

console.log('');
console.log('🔧 To create this trip, run the following SQL in Supabase:');
console.log('');
console.log(`INSERT INTO trip_requests (
  customer_id, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude,
  pickup_address, delivery_address, material_type, load_description, estimated_weight_tons,
  quoted_price, pickup_time_preference, status, assigned_driver_id, created_at,
  acceptance_deadline, estimated_distance_km, estimated_duration_minutes, required_truck_type_id
) VALUES (
  '${testTripData.customer_id}',
  ${testTripData.pickup_latitude},
  ${testTripData.pickup_longitude},
  ${testTripData.delivery_latitude},
  ${testTripData.delivery_longitude},
  '${testTripData.pickup_address}',
  '${testTripData.delivery_address}',
  '${testTripData.material_type}',
  '${testTripData.load_description}',
  ${testTripData.estimated_weight_tons},
  ${testTripData.quoted_price},
  '${testTripData.pickup_time_preference}',
  '${testTripData.status}',
  NULL,
  '${testTripData.created_at}',
  '${testTripData.acceptance_deadline}',
  ${testTripData.estimated_distance_km},
  ${testTripData.estimated_duration_minutes},
  NULL
);`);

console.log('');
console.log('📱 After creating this trip:');
console.log('1. The nearest available driver should receive an ASAP notification');
console.log('2. If they accept, the trip gets assigned to them');
console.log('3. If they reject/timeout, it goes to the next closest driver');
console.log('4. This is the proper Uber-style ASAP flow!');

console.log('');
console.log('🔍 Expected logs in driver app:');
console.log('   - "Found 1 unassigned ASAP trips"');
console.log('   - "Driver is closest to trip..." OR "Driver is not closest..."');
console.log('   - "TRIP NOTIFICATION RECEIVED" (if closest)');
console.log('   - Modal should appear (if closest)');

// Test script to verify trip history functionality
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA3NzAsImV4cCI6MjA1MDI4Njc3MH0.hxjZ7PJaWrVCdkjnDJNrOdFDfshJE-8BjGMBJQT2E5k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripHistory() {
  try {
    console.log('🔍 Testing trip history functionality...\n');

    // Test 1: Check if trip_requests table exists and has data
    console.log('1. Checking trip_requests table...');
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(5);

    if (tripsError) {
      console.error('❌ Error querying trip_requests:', tripsError);
      return;
    }

    console.log(`✅ Found ${trips.length} trips in trip_requests table`);
    if (trips.length > 0) {
      console.log('📋 Sample trip data:');
      trips.forEach(trip => {
        console.log(`   - Trip ID: ${trip.id}`);
        console.log(`   - Customer ID: ${trip.customer_id}`);
        console.log(`   - Material: ${trip.material_type}`);
        console.log(`   - Status: ${trip.status}`);
        console.log(`   - Created: ${trip.created_at}`);
        console.log('   ---');
      });
    }

    // Test 2: Check users table to see customer data
    console.log('\n2. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', 'customer')
      .limit(3);

    if (usersError) {
      console.error('❌ Error querying users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} customers in users table`);
    users.forEach(user => {
      console.log(`   - User ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Name: ${user.first_name} ${user.last_name}`);
      console.log('   ---');
    });

    // Test 3: Check if any trips exist for any customer
    console.log('\n3. Checking trip-customer relationships...');
    const { data: tripCustomers, error: tripCustomersError } = await supabase
      .from('trip_requests')
      .select(`
        id,
        customer_id,
        material_type,
        status,
        created_at,
        users!trip_requests_customer_id_fkey(email, first_name, last_name)
      `)
      .limit(5);

    if (tripCustomersError) {
      console.error('❌ Error querying trip-customer relationships:', tripCustomersError);
      return;
    }

    console.log(`✅ Found ${tripCustomers.length} trips with customer info`);
    tripCustomers.forEach(trip => {
      console.log(`   - Trip: ${trip.id}`);
      console.log(`   - Customer: ${trip.users?.email || 'Unknown'}`);
      console.log(`   - Material: ${trip.material_type}`);
      console.log('   ---');
    });

    // Test 4: Test the specific transformation logic
    console.log('\n4. Testing trip-to-order transformation...');
    const transformTripsToOrders = (trips) => {
      return trips.map(trip => ({
        id: trip.id,
        orderNumber: `TR-${trip.id.slice(0, 8)}`,
        status: trip.status || 'pending',
        items: [{
          materialName: trip.material_type || 'Building Material',
          quantity: trip.estimated_weight_tons || 1,
          unit: trip.estimated_weight_tons ? 'tons' : 'units',
          pricePerUnit: trip.quoted_price || 0,
          totalPrice: trip.quoted_price || 0
        }],
        deliveryAddress: {
          street: trip.delivery_address?.street || 'Unknown',
          city: trip.delivery_address?.city || 'Unknown',
          state: trip.delivery_address?.state || 'Unknown',
          zipCode: trip.delivery_address?.postal_code || 'Unknown'
        },
        finalAmount: trip.quoted_price || 0,
        orderDate: trip.created_at,
        estimatedDelivery: trip.scheduled_pickup_time,
        driverName: trip.assigned_driver_id ? 'Driver Assigned' : undefined
      }));
    };

    const orders = transformTripsToOrders(trips);
    console.log(`✅ Successfully transformed ${orders.length} trips to order format`);
    
    if (orders.length > 0) {
      console.log('📋 Sample order format:');
      const firstOrder = orders[0];
      console.log(`   - Order Number: ${firstOrder.orderNumber}`);
      console.log(`   - Status: ${firstOrder.status}`);
      console.log(`   - Material: ${firstOrder.items[0].materialName}`);
      console.log(`   - Amount: $${firstOrder.finalAmount}`);
      console.log(`   - Date: ${firstOrder.orderDate}`);
    }

    console.log('\n🎉 Trip history test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTripHistory();

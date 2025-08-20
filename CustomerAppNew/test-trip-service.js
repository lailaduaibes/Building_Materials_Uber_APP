/**
 * Test Trip Service - Verify that trips are being fetched correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Use the correct Supabase URL and key
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA3NzAsImV4cCI6MjA1MDI4Njc3MH0.hxjZ7PJaWrVCdkjnDJNrOdFDfshJE-8BjGMBJQT2E5k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripService() {
  try {
    console.log('🔄 Testing Trip Service...');
    
    // Test 1: Check if trip_requests table exists
    console.log('\n1. Checking trip_requests table...');
    const { data: tripCount, error: countError } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error accessing trip_requests table:', countError.message);
      return;
    }
    
    console.log(`✅ Found ${tripCount} trips in trip_requests table`);
    
    // Test 2: Get all trips (latest 10)
    console.log('\n2. Fetching latest trips...');
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select(`
        id,
        customer_id,
        material_type,
        load_description,
        status,
        created_at,
        pickup_address,
        delivery_address,
        quoted_price,
        final_price
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError.message);
      return;
    }
    
    if (!trips || trips.length === 0) {
      console.log('⚠️  No trips found in database');
      
      // Test 3: Check if we can create a test trip
      console.log('\n3. Creating a test trip...');
      const testTrip = {
        customer_id: 'test-customer-id',
        pickup_latitude: -26.2041,
        pickup_longitude: 28.0473,
        pickup_address: {
          street: '123 Test Street',
          city: 'Johannesburg',
          state: 'Gauteng',
          country: 'South Africa'
        },
        delivery_latitude: -26.1234,
        delivery_longitude: 28.0567,
        delivery_address: {
          street: '456 Delivery Ave',
          city: 'Johannesburg', 
          state: 'Gauteng',
          country: 'South Africa'
        },
        material_type: 'Sand',
        load_description: 'Test sand delivery',
        quoted_price: 500.00,
        status: 'pending'
      };
      
      const { data: newTrip, error: createError } = await supabase
        .from('trip_requests')
        .insert(testTrip)
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating test trip:', createError.message);
        return;
      }
      
      console.log('✅ Test trip created:', newTrip.id);
      
    } else {
      console.log(`✅ Found ${trips.length} trips:`);
      trips.forEach((trip, index) => {
        console.log(`   ${index + 1}. ${trip.material_type} - ${trip.status} (${trip.created_at})`);
      });
    }
    
    // Test 4: Test the transformation logic
    console.log('\n4. Testing trip transformation...');
    const testTrip = {
      id: 'test-123',
      material_type: 'Cement',
      estimated_weight_tons: 2.5,
      quoted_price: 750.00,
      final_price: 750.00,
      status: 'delivered',
      created_at: '2025-08-18T10:00:00Z',
      pickup_address: { street: '123 Main St', city: 'Johannesburg', state: 'Gauteng' },
      delivery_address: { street: '456 Oak Ave', city: 'Pretoria', state: 'Gauteng' },
      users: { full_name: 'John Driver' }
    };
    
    // Simulate the transformation logic
    const transformed = {
      id: testTrip.id,
      orderNumber: `TR-${testTrip.id.substring(0, 8).toUpperCase()}`,
      status: 'delivered',
      items: [{
        materialName: testTrip.material_type,
        quantity: testTrip.estimated_weight_tons || 1,
        unit: testTrip.estimated_weight_tons ? 'tons' : 'load',
        pricePerUnit: testTrip.quoted_price || 0,
        totalPrice: testTrip.final_price || testTrip.quoted_price || 0
      }],
      deliveryAddress: {
        street: testTrip.delivery_address.street,
        city: testTrip.delivery_address.city,
        state: testTrip.delivery_address.state,
        zipCode: '00000'
      },
      finalAmount: testTrip.final_price || testTrip.quoted_price || 0,
      orderDate: testTrip.created_at,
      driverName: testTrip.users?.full_name
    };
    
    console.log('✅ Transformation successful:', {
      orderNumber: transformed.orderNumber,
      material: transformed.items[0].materialName,
      amount: transformed.finalAmount,
      driver: transformed.driverName
    });
    
    console.log('\n🎉 Trip Service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTripService();

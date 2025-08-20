/**
 * Test script to debug order creation issues
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

async function testOrderCreation() {
  console.log('🔧 Testing Order Creation...');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Test connection
    const { data, error } = await supabase.from('materials').select('count');
    if (error) {
      console.error('❌ Database connection error:', error.message);
      console.error('   Full error:', error);
    } else {
      console.log('✅ Database connection successful');
    }

    // Test authentication check
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Session check error:', sessionError.message);
    } else if (sessionData.session) {
      console.log('✅ User session found:', sessionData.session.user.email);
    } else {
      console.log('⚠️  No user session found - user needs to log in');
    }

    // Test materials table
    console.log('\n🔍 Checking materials table...');
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('*')
      .limit(5);
    
    if (materialsError) {
      console.error('❌ Materials table error:', materialsError.message);
      console.log('   This might indicate the table doesn\'t exist or has permission issues');
    } else {
      console.log('✅ Materials table accessible, found', materials?.length || 0, 'materials');
      if (materials?.length > 0) {
        console.log('   Sample material:', materials[0]);
      }
    }

    // Test orders table
    console.log('\n🔍 Checking orders table...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.error('❌ Orders table error:', ordersError.message);
      console.log('   This might indicate the table doesn\'t exist or has permission issues');
    } else {
      console.log('✅ Orders table accessible');
    }

    // Test order creation (mock data)
    console.log('\n🧪 Testing order creation with mock data...');
    const mockOrder = {
      customer_id: 'test-user-id',
      customer_name: 'Test User',
      customer_email: 'test@example.com',
      items: JSON.stringify([{
        materialId: 'cement-1',
        materialName: 'Portland Cement',
        quantity: 2,
        unit: 'bag',
        pricePerUnit: 8.50,
        totalPrice: 17.00
      }]),
      delivery_address: JSON.stringify({
        street: '123 Test Street',
        city: 'Dubai',
        state: 'Dubai',
        zipCode: '00000',
        contactPhone: '1234567890'
      }),
      total_amount: 17.00,
      delivery_fee: 25.00,
      final_amount: 42.00,
      status: 'pending',
      order_number: 'TEST123'
    };

    // Only attempt if we have a valid session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      mockOrder.customer_id = session.user.id;
      mockOrder.customer_email = session.user.email;
      
      const { data: newOrder, error: createError } = await supabase
        .from('orders')
        .insert([mockOrder])
        .select();

      if (createError) {
        console.error('❌ Order creation error:', createError.message);
        console.error('   Full error:', createError);
      } else {
        console.log('✅ Order created successfully:', newOrder[0]?.id);
      }
    } else {
      console.log('⚠️  Skipping order creation test - no authenticated user');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

testOrderCreation();

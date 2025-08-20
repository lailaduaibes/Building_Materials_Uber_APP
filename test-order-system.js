#!/usr/bin/env node

// Order Management System Test Script
// Run this to test the full order lifecycle

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// Test data
const testCustomer = {
  email: 'john.builder@construction.com',
  password: 'Password123',
  firstName: 'John',
  lastName: 'Builder',
  role: 'customer'
};

const testDriver = {
  email: 'mike.driver@buildmate.com', 
  password: 'Password123',
  firstName: 'Mike',
  lastName: 'Driver',
  role: 'driver'
};

const sampleOrder = {
  items: [
    {
      materialType: 'cement',
      description: 'Portland Cement 50kg bags',
      quantity: 20,
      unit: 'bags',
      weight: 1000,
      volume: 2.5,
      specialHandling: ['keep_dry', 'handle_with_care']
    },
    {
      materialType: 'steel',
      description: 'Reinforcement Steel Bars 12mm',
      quantity: 100,
      unit: 'pieces', 
      weight: 890,
      volume: 1.2
    }
  ],
  pickupAddress: {
    street: '123 Warehouse District',
    city: 'Industrial City',
    state: 'State',
    zipCode: '12345',
    country: 'Country',
    specialInstructions: 'Loading dock B, security code: 1234'
  },
  deliveryAddress: {
    street: '456 Construction Site Ave',
    city: 'Build City', 
    state: 'State',
    zipCode: '67890',
    country: 'Country',
    specialInstructions: 'Site manager: John Smith, call before arrival'
  },
  scheduledPickupTime: '2025-08-15T08:00:00Z',
  scheduledDeliveryTime: '2025-08-15T14:00:00Z',
  specialRequirements: ['crane_access', 'forklift_needed'],
  notes: 'Rush order for foundation work'
};

async function testOrderManagement() {
  console.log('🚚 Testing Order Management System...\n');

  try {
    // 1. Register customer
    console.log('1. Registering customer...');
    const customerReg = await axios.post(`${API_BASE}/auth/register`, testCustomer);
    console.log('✅ Customer registered:', customerReg.data.data.user.email);

    // 2. Login customer (assuming email is verified for demo)
    console.log('\n2. Logging in customer...');
    const customerLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: testCustomer.email,
      password: testCustomer.password
    });
    const customerToken = customerLogin.data.data.token;
    console.log('✅ Customer logged in successfully');

    // 3. Create order
    console.log('\n3. Creating delivery order...');
    const orderResponse = await axios.post(`${API_BASE}/orders`, sampleOrder, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const orderId = orderResponse.data.data.id;
    console.log('✅ Order created with ID:', orderId);
    console.log('📦 Total Weight:', orderResponse.data.data.totalWeight, 'kg');
    console.log('📏 Total Volume:', orderResponse.data.data.totalVolume, 'm³');

    // 4. Get orders
    console.log('\n4. Retrieving customer orders...');
    const ordersResponse = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✅ Retrieved', ordersResponse.data.data.orders.length, 'orders');

    // 5. Get specific order details
    console.log('\n5. Getting order details...');
    const orderDetails = await axios.get(`${API_BASE}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✅ Order Status:', orderDetails.data.data.status);
    console.log('📍 Pickup:', orderDetails.data.data.pickupAddress.city);
    console.log('📍 Delivery:', orderDetails.data.data.deliveryAddress.city);

    console.log('\n🎉 Order Management System test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   • Test driver assignment');
    console.log('   • Test vehicle assignment'); 
    console.log('   • Test status updates');
    console.log('   • Test internal orders integration');

  } catch (error) {
    console.error('❌ Error during testing:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  testOrderManagement();
}

module.exports = { testOrderManagement };

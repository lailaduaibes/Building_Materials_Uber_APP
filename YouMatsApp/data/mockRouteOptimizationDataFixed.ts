/**
 * Mock Data for Route Optimization Screen
 * Professional sample orders for testing AI route optimization
 */

import { OrderAssignment } from '../services/DriverService';

export const mockAvailableOrders: OrderAssignment[] = [
  {
    id: 'order_001_asap',
    orderId: 'ord_001',
    customerId: 'cust_001',
    customerName: 'Marina Construction Co',
    customerPhone: '+971501234567',
    pickup_address: 'Al Wasl Building Materials, Al Wasl Road, Dubai',
    delivery_address: 'Dubai Marina Construction Site, Marina Walk, Dubai',
    estimatedEarnings: 150,
    material_type: 'Cement bags (40x50kg)',
    pickupTimePreference: 'asap',
    materials: [
      { type: 'Cement', description: 'Portland cement bags', quantity: 40, weight: 2000 }
    ],
    estimatedDuration: 45,
    distanceKm: 12.5,
    pickupLocation: {
      address: 'Al Wasl Building Materials, Al Wasl Road, Dubai',
      latitude: 25.2242,
      longitude: 55.2574
    },
    deliveryLocation: {
      address: 'Dubai Marina Construction Site, Marina Walk, Dubai', 
      latitude: 25.0772,
      longitude: 55.1392
    },
    status: 'pending',
    assignedAt: new Date().toISOString(),
    acceptDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'order_002_scheduled',
    orderId: 'ord_002',
    customerId: 'cust_002',
    customerName: 'JBR Development LLC',
    customerPhone: '+971502345678',
    pickup_address: 'Emirates Steel Trading, Sheikh Zayed Road, Dubai',
    delivery_address: 'Jumeirah Beach Residence Tower 3, JBR, Dubai',
    estimatedEarnings: 200,
    material_type: 'Steel reinforcement bars',
    pickupTimePreference: 'scheduled',
    scheduledPickupTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    materials: [
      { type: 'Steel', description: 'Reinforcement bars 12mm', quantity: 20, weight: 1600 }
    ],
    estimatedDuration: 60,
    distanceKm: 18.3,
    pickupLocation: {
      address: 'Emirates Steel Trading, Sheikh Zayed Road, Dubai',
      latitude: 25.2128,
      longitude: 55.2761
    },
    deliveryLocation: {
      address: 'Jumeirah Beach Residence Tower 3, JBR, Dubai',
      latitude: 25.0707,
      longitude: 55.1391
    },
    status: 'pending',
    assignedAt: new Date().toISOString(),
    acceptDeadline: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'order_003_asap',
    orderId: 'ord_003',
    customerId: 'cust_003',
    customerName: 'Business Bay Properties',
    customerPhone: '+971503456789',
    pickup_address: 'Dubai Tiles & Marble Center, Al Qusais, Dubai',
    delivery_address: 'Business Bay Residential Complex, Business Bay, Dubai',
    estimatedEarnings: 120,
    material_type: 'Ceramic tiles and marble slabs',
    pickupTimePreference: 'asap',
    materials: [
      { type: 'Tiles', description: 'Ceramic floor tiles', quantity: 50, weight: 800 },
      { type: 'Marble', description: 'Italian marble slabs', quantity: 10, weight: 1200 }
    ],
    estimatedDuration: 75,
    distanceKm: 25.7,
    pickupLocation: {
      address: 'Dubai Tiles & Marble Center, Al Qusais, Dubai',
      latitude: 25.2837,
      longitude: 55.3901
    },
    deliveryLocation: {
      address: 'Business Bay Residential Complex, Business Bay, Dubai',
      latitude: 25.1872,
      longitude: 55.2674
    },
    status: 'pending',
    assignedAt: new Date().toISOString(),
    acceptDeadline: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'order_004_scheduled',
    orderId: 'ord_004',
    customerId: 'cust_004',
    customerName: 'Palm Jumeirah Villas',
    customerPhone: '+971504567890',
    pickup_address: 'Home Centre Building Supplies, Motor City, Dubai',
    delivery_address: 'Palm Jumeirah Villa Project, Palm Jumeirah, Dubai',
    estimatedEarnings: 280,
    material_type: 'Mixed construction materials',
    pickupTimePreference: 'scheduled',
    scheduledPickupTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    materials: [
      { type: 'Wood', description: 'Wooden planks and beams', quantity: 30, weight: 900 },
      { type: 'Paint', description: 'Exterior wall paint', quantity: 15, weight: 300 },
      { type: 'Hardware', description: 'Screws, bolts, brackets', quantity: 1, weight: 50 }
    ],
    estimatedDuration: 90,
    distanceKm: 32.4,
    pickupLocation: {
      address: 'Home Centre Building Supplies, Motor City, Dubai',
      latitude: 25.0583,
      longitude: 55.2203
    },
    deliveryLocation: {
      address: 'Palm Jumeirah Villa Project, Palm Jumeirah, Dubai',
      latitude: 25.1124,
      longitude: 55.1390
    },
    status: 'pending',
    assignedAt: new Date().toISOString(),
    acceptDeadline: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'order_005_asap',
    orderId: 'ord_005',
    customerId: 'cust_005',
    customerName: 'Downtown Dubai Apartments',
    customerPhone: '+971505678901',
    pickup_address: 'RAK Ceramics Showroom, Al Barsha, Dubai',
    delivery_address: 'Downtown Dubai Apartment, Downtown Dubai',
    estimatedEarnings: 95,
    material_type: 'Bathroom fixtures and tiles',
    pickupTimePreference: 'asap',
    materials: [
      { type: 'Fixtures', description: 'Bathroom sink and toilet', quantity: 2, weight: 150 },
      { type: 'Tiles', description: 'Bathroom wall tiles', quantity: 25, weight: 400 }
    ],
    estimatedDuration: 50,
    distanceKm: 15.8,
    pickupLocation: {
      address: 'RAK Ceramics Showroom, Al Barsha, Dubai',
      latitude: 25.0993,
      longitude: 55.1847
    },
    deliveryLocation: {
      address: 'Downtown Dubai Apartment, Downtown Dubai',
      latitude: 25.1972,
      longitude: 55.2744
    },
    status: 'pending',
    assignedAt: new Date().toISOString(),
    acceptDeadline: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }
];

export const mockDriverId = 'driver_youmats_001';

// Mock optimization stats for demo
export const mockOptimizationStats = {
  totalRoutesOptimized: 47,
  averageFuelSavings: 23,
  averageTimeSavings: 18,
  averageOptimizationScore: 87
};

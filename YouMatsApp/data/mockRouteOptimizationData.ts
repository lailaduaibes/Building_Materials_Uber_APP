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
    acceptDeadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min deadline
  },
  {
    id: 'order_002_scheduled',
    pickup_address: 'Emirates Steel Trading, Sheikh Zayed Road, Dubai',
    delivery_address: 'Jumeirah Beach Residence Tower 3, JBR, Dubai',
    estimatedEarnings: 200,
    material_type: 'Steel reinforcement bars',
    pickupTimePreference: 'scheduled',
    materials: [
      { type: 'Steel', description: 'Reinforcement bars 12mm', quantity: 20, unit: 'pieces' }
    ],
    priority: 'medium',
    distance: 18.3,
    estimatedDuration: 60,
    pickupLocation: {
      address: 'Emirates Steel Trading, Sheikh Zayed Road, Dubai',
      lat: 25.2128,
      lng: 55.2761
    },
    deliveryLocation: {
      address: 'Jumeirah Beach Residence Tower 3, JBR, Dubai',
      lat: 25.0707,
      lng: 55.1391
    },
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'order_003_flexible',
    pickup_address: 'Dubai Tiles & Marble Center, Al Qusais, Dubai',
    delivery_address: 'Business Bay Residential Complex, Business Bay, Dubai',
    estimatedEarnings: 120,
    material_type: 'Ceramic tiles and marble slabs',
    pickupTimePreference: 'flexible',
    materials: [
      { type: 'Tiles', description: 'Ceramic floor tiles', quantity: 50, unit: 'sqm' },
      { type: 'Marble', description: 'Italian marble slabs', quantity: 10, unit: 'pieces' }
    ],
    priority: 'low',
    distance: 25.7,
    estimatedDuration: 75,
    pickupLocation: {
      address: 'Dubai Tiles & Marble Center, Al Qusais, Dubai',
      lat: 25.2837,
      lng: 55.3901
    },
    deliveryLocation: {
      address: 'Business Bay Residential Complex, Business Bay, Dubai',
      lat: 25.1872,
      lng: 55.2674
    },
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'order_004_asap',
    pickup_address: 'Home Centre Building Supplies, Motor City, Dubai',
    delivery_address: 'Palm Jumeirah Villa Project, Palm Jumeirah, Dubai',
    estimatedEarnings: 280,
    material_type: 'Mixed construction materials',
    pickupTimePreference: 'asap',
    materials: [
      { type: 'Wood', description: 'Wooden planks and beams', quantity: 30, unit: 'pieces' },
      { type: 'Paint', description: 'Exterior wall paint', quantity: 15, unit: 'buckets' },
      { type: 'Hardware', description: 'Screws, bolts, brackets', quantity: 1, unit: 'set' }
    ],
    priority: 'high',
    distance: 32.4,
    estimatedDuration: 90,
    pickupLocation: {
      address: 'Home Centre Building Supplies, Motor City, Dubai',
      lat: 25.0583,
      lng: 55.2203
    },
    deliveryLocation: {
      address: 'Palm Jumeirah Villa Project, Palm Jumeirah, Dubai',
      lat: 25.1124,
      lng: 55.1390
    },
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'order_005_scheduled',
    pickup_address: 'RAK Ceramics Showroom, Al Barsha, Dubai',
    delivery_address: 'Downtown Dubai Apartment, Downtown Dubai',
    estimatedEarnings: 95,
    material_type: 'Bathroom fixtures and tiles',
    pickupTimePreference: 'scheduled',
    materials: [
      { type: 'Fixtures', description: 'Bathroom sink and toilet', quantity: 2, unit: 'sets' },
      { type: 'Tiles', description: 'Bathroom wall tiles', quantity: 25, unit: 'sqm' }
    ],
    priority: 'medium',
    distance: 15.8,
    estimatedDuration: 50,
    pickupLocation: {
      address: 'RAK Ceramics Showroom, Al Barsha, Dubai',
      lat: 25.0993,
      lng: 55.1847
    },
    deliveryLocation: {
      address: 'Downtown Dubai Apartment, Downtown Dubai',
      lat: 25.1972,
      lng: 55.2744
    },
    status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'order_006_flexible',
    pickup_address: 'Al Rostamani Building Materials, Deira, Dubai',
    delivery_address: 'Mirdif Hills Villa Development, Mirdif, Dubai',
    estimatedEarnings: 175,
    material_type: 'Electrical and plumbing supplies',
    pickupTimePreference: 'flexible',
    materials: [
      { type: 'Electrical', description: 'Wires, switches, outlets', quantity: 1, unit: 'set' },
      { type: 'Plumbing', description: 'Pipes, fittings, valves', quantity: 1, unit: 'set' }
    ],
    priority: 'medium',
    distance: 28.9,
    estimatedDuration: 85,
    pickupLocation: {
      address: 'Al Rostamani Building Materials, Deira, Dubai',
      lat: 25.2582,
      lng: 55.3047
    },
    deliveryLocation: {
      address: 'Mirdif Hills Villa Development, Mirdif, Dubai',
      lat: 25.2179,
      lng: 55.4103
    },
    status: 'pending',
    created_at: new Date().toISOString(),
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

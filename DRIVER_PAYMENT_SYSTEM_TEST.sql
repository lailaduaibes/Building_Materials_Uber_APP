-- DRIVER PAYMENT SYSTEM TEST QUERIES
-- Execute these queries to test your driver payment system functionality
-- Run these after setting up the database schema

-- 1. Test Data Setup
-- First, ensure you have a test driver user
INSERT INTO users (id, email, user_type, created_at) 
VALUES (
  'test-driver-uuid-123', 
  'testdriver@youmats.com', 
  'driver', 
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_profiles (user_id, first_name, last_name, phone_number, license_number, vehicle_type, created_at)
VALUES (
  'test-driver-uuid-123',
  'John',
  'Test Driver',
  '+1234567890',
  'DL123456789',
  'truck',
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- 2. Test Driver Payment Method
INSERT INTO driver_payment_methods (
  driver_id,
  type,
  bank_name,
  account_number_last4,
  routing_number_encrypted,
  account_holder_name,
  is_verified,
  is_default
) VALUES (
  'test-driver-uuid-123',
  'bank_account',
  'Test Bank',
  '1234',
  '123456789',
  'John Test Driver',
  true,
  true
) ON CONFLICT DO NOTHING;

-- 3. Test Earnings Data
INSERT INTO driver_earnings (
  driver_id,
  trip_id,
  trip_fare,
  platform_commission,
  driver_earnings,
  tip_amount,
  total_earnings,
  status,
  created_at
) VALUES 
(
  'test-driver-uuid-123',
  'test-trip-1',
  53.00,
  5.30,
  47.70,
  8.00,
  55.70,
  'paid',
  NOW() - INTERVAL '1 day'
),
(
  'test-driver-uuid-123',
  'test-trip-2',
  69.00,
  6.90,
  62.10,
  12.00,
  74.10,
  'paid',
  NOW() - INTERVAL '2 hours'
),
(
  'test-driver-uuid-123',
  'test-trip-3',
  38.00,
  3.80,
  34.20,
  5.00,
  39.20,
  'pending',
  NOW() - INTERVAL '30 minutes'
);

-- 4. Test Payout Request
INSERT INTO driver_payouts (
  driver_id,
  payment_method_id,
  amount,
  payout_type,
  status,
  requested_at
) VALUES (
  'test-driver-uuid-123',
  (SELECT id FROM driver_payment_methods WHERE driver_id = 'test-driver-uuid-123' LIMIT 1),
  47.70,
  'instant',
  'pending',
  NOW()
);

-- VERIFICATION QUERIES
-- Run these to verify the data was inserted correctly

-- Check driver setup
SELECT 
  u.email,
  u.user_type,
  dp.first_name,
  dp.last_name,
  dp.vehicle_type
FROM users u
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.id = 'test-driver-uuid-123';

-- Check payment methods
SELECT 
  type,
  bank_name,
  account_number_last4,
  account_holder_name,
  is_verified,
  is_default
FROM driver_payment_methods 
WHERE driver_id = 'test-driver-uuid-123';

-- Check earnings summary
SELECT 
  COUNT(*) as total_trips,
  SUM(total_earnings) as total_earnings,
  SUM(CASE WHEN status = 'paid' THEN total_earnings ELSE 0 END) as available_earnings,
  SUM(CASE WHEN status = 'pending' THEN total_earnings ELSE 0 END) as pending_earnings
FROM driver_earnings 
WHERE driver_id = 'test-driver-uuid-123';

-- Check payout requests
SELECT 
  amount,
  payout_type,
  status,
  requested_at,
  processed_at
FROM driver_payouts 
WHERE driver_id = 'test-driver-uuid-123'
ORDER BY requested_at DESC;

-- WEEKLY EARNINGS CHECK (for automatic payouts)
SELECT 
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) as trips_count,
  SUM(total_earnings) as week_earnings
FROM driver_earnings 
WHERE driver_id = 'test-driver-uuid-123'
  AND status = 'paid'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

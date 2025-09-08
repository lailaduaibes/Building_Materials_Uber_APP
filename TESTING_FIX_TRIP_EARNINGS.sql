-- TEMPORARY FIX FOR TESTING DRIVER EARNINGS
-- This script modifies the driver_earnings table to allow testing without trip constraints

-- Step 1: Drop the foreign key constraint temporarily
ALTER TABLE driver_earnings DROP CONSTRAINT IF EXISTS driver_earnings_trip_id_fkey;

-- Step 2: Make trip_id nullable for testing (optional)
ALTER TABLE driver_earnings ALTER COLUMN trip_id DROP NOT NULL;

-- Step 3: Add a constraint to ensure either trip_id exists OR it's a test record
ALTER TABLE driver_earnings ADD CONSTRAINT valid_trip_reference 
CHECK (
  trip_id IS NULL OR 
  trip_id IN (SELECT id FROM trip_requests) OR
  trip_id = 'test-trip'
);

-- Step 4: Create a mock test trip record for testing
INSERT INTO trip_requests (
  id,
  customer_id,
  driver_id,
  pickup_location,
  dropoff_location,
  total_price,
  status,
  trip_type,
  vehicle_type,
  materials,
  completed_at,
  created_at,
  updated_at
) VALUES (
  'test-trip',
  (SELECT id FROM users WHERE user_type = 'customer' LIMIT 1),
  (SELECT id FROM users WHERE user_type = 'driver' LIMIT 1),
  '{"address": "Test Pickup Location", "latitude": 40.7128, "longitude": -74.0060}',
  '{"address": "Test Dropoff Location", "latitude": 40.7589, "longitude": -73.9851}',
  35.00,
  'completed',
  'delivery',
  'truck',
  '[{"type": "construction", "description": "Test building materials", "weight": 500}]',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- VERIFICATION: Check if the changes worked
SELECT 
    'trip_requests' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN id = 'test-trip' THEN 1 END) as test_records
FROM trip_requests
UNION ALL
SELECT 
    'driver_earnings' as table_name,
    COUNT(*) as record_count,
    0 as test_records
FROM driver_earnings;

-- TO RESTORE PRODUCTION CONSTRAINTS LATER (run this after testing):
/*
-- Restore the foreign key constraint:
ALTER TABLE driver_earnings ADD CONSTRAINT driver_earnings_trip_id_fkey 
FOREIGN KEY (trip_id) REFERENCES trip_requests(id) ON DELETE CASCADE;

-- Make trip_id required again:
ALTER TABLE driver_earnings ALTER COLUMN trip_id SET NOT NULL;

-- Remove test data:
DELETE FROM trip_requests WHERE id = 'test-trip';
DELETE FROM driver_earnings WHERE trip_id = 'test-trip';
*/

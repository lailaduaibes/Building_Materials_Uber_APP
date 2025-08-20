-- Check truck types table and their IDs
SELECT id, name, description, payload_capacity, suitable_materials
FROM truck_types 
ORDER BY name;

-- Check what truck type ID corresponds to "small truck"
SELECT id, name, description 
FROM truck_types 
WHERE name ILIKE '%small%' OR name ILIKE '%truck%'
ORDER BY name;

-- Check the specific truck type being requested
SELECT id, name, description, payload_capacity
FROM truck_types 
WHERE id = '69949f18-3e1b-4db2-96fc-5dea17fc658f';

-- Check driver profiles and their preferred truck types
SELECT id, first_name, last_name, preferred_truck_types
FROM driver_profiles 
WHERE preferred_truck_types IS NOT NULL
AND preferred_truck_types != '[]'
AND preferred_truck_types != 'null'
LIMIT 5;

-- DEBUG: Check the trip that's causing the live tracking issue
SELECT 
  id,
  status,
  assigned_driver_id,
  assigned_truck_id,
  required_truck_type_id,
  customer_id,
  created_at,
  matched_at
FROM trip_requests 
WHERE required_truck_type_id = '69949f18-3e1b-4db2-96fc-5dea17fc658f'
AND status = 'matched'
ORDER BY created_at DESC
LIMIT 3;

-- Check if there are any drivers with compatible truck types
SELECT 
  dp.id as driver_id,
  dp.first_name,
  dp.last_name,
  dp.preferred_truck_types,
  dp.specializations,
  dp.status as driver_status,
  u.role
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.preferred_truck_types IS NOT NULL
AND dp.preferred_truck_types != '[]'
AND dp.preferred_truck_types != 'null'
AND dp.status = 'approved'
AND u.role = 'driver'
ORDER BY dp.created_at DESC
LIMIT 5;

-- Check if we need to assign a driver to this trip
SELECT 
  t.id as trip_id,
  t.status,
  t.assigned_driver_id,
  t.required_truck_type_id,
  tt.name as required_truck_name,
  t.customer_id
FROM trip_requests t
JOIN truck_types tt ON t.required_truck_type_id = tt.id
WHERE t.status = 'matched' 
AND t.assigned_driver_id IS NULL
ORDER BY t.created_at DESC
LIMIT 5;

-- ADDITIONAL: Check what statuses exist in trip_requests
SELECT DISTINCT status, COUNT(*) as count
FROM trip_requests 
GROUP BY status
ORDER BY status;

-- Check recent trip_requests to understand the data structure
SELECT 
  id,
  status,
  assigned_driver_id,
  customer_id,
  required_truck_type_id,
  pickup_address,
  delivery_address,
  created_at
FROM trip_requests 
ORDER BY created_at DESC
LIMIT 5;

-- CRITICAL: Check if assigned_driver_id is user_id or driver_profile_id
-- Check the specific problematic trip's driver assignment
SELECT 
  tr.id as trip_id,
  tr.assigned_driver_id,
  u.id as user_id,
  u.email,
  dp.id as driver_profile_id,
  dp.first_name,
  dp.last_name
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE tr.id = 'eb07a487-95ba-4b78-b29b-a241d92481c1';

-- Check all relationships for this driver
SELECT 
  u.id as user_id,
  u.email,
  u.role,
  dp.id as driver_profile_id,
  dp.first_name,
  dp.last_name,
  dp.phone
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

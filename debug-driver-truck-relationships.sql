-- DEBUG: Check driver-truck relationships for logical solution

-- STEP 1: Check Laila's driver profile and relationships
SELECT 
  'DRIVER PROFILE' as check_type,
  dp.first_name,
  dp.last_name,
  dp.user_id,
  dp.current_truck_id,
  dp.is_available as driver_available,
  dp.status as driver_status
FROM driver_profiles dp
WHERE dp.phone = '0599313811';

-- STEP 2: Check if there's a truck assigned to this driver via current_driver_id
SELECT 
  'TRUCK BY DRIVER_ID' as check_type,
  t.id as truck_id,
  t.license_plate,
  t.current_driver_id,
  t.is_available as truck_available,
  tt.name as truck_type
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.current_driver_id = (
  SELECT user_id FROM driver_profiles WHERE phone = '0599313811'
);

-- STEP 3: Check if driver has current_truck_id and that truck exists
SELECT 
  'TRUCK BY CURRENT_TRUCK_ID' as check_type,
  t.id as truck_id,
  t.license_plate,
  t.current_driver_id,
  t.is_available as truck_available,
  tt.name as truck_type,
  dp.current_truck_id as driver_current_truck_id
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 4: Check which relationship is missing
SELECT 
  'RELATIONSHIP ANALYSIS' as check_type,
  dp.user_id,
  dp.current_truck_id,
  t1.id as truck_via_driver_id,
  t2.id as truck_via_current_truck_id,
  CASE 
    WHEN t1.id IS NULL AND t2.id IS NULL THEN '❌ NO TRUCK ASSIGNED'
    WHEN t1.id IS NOT NULL AND t2.id IS NULL THEN '⚠️ TRUCK ASSIGNED VIA current_driver_id ONLY'
    WHEN t1.id IS NULL AND t2.id IS NOT NULL THEN '⚠️ TRUCK ASSIGNED VIA current_truck_id ONLY'
    WHEN t1.id IS NOT NULL AND t2.id IS NOT NULL AND t1.id = t2.id THEN '✅ BOTH RELATIONSHIPS SYNCED'
    WHEN t1.id IS NOT NULL AND t2.id IS NOT NULL AND t1.id != t2.id THEN '❌ CONFLICTING RELATIONSHIPS'
    ELSE '❓ UNKNOWN STATE'
  END as relationship_status
FROM driver_profiles dp
LEFT JOIN trucks t1 ON t1.current_driver_id = dp.user_id
LEFT JOIN trucks t2 ON t2.id = dp.current_truck_id
WHERE dp.phone = '0599313811';

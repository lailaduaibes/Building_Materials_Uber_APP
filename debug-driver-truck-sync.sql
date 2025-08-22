-- DEBUG: Check if the app code fix is working or if there are other issues

-- STEP 1: Check current relationship between Laila and her truck
SELECT 
  'CURRENT STATE CHECK' as debug_step,
  dp.first_name,
  dp.last_name,
  dp.user_id as driver_user_id,
  dp.current_truck_id as driver_truck_id,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.id as truck_id,
  t.current_driver_id as truck_driver_id,
  t.is_available as truck_available,
  tt.name as truck_type
FROM driver_profiles dp
LEFT JOIN trucks t ON (dp.current_truck_id = t.id OR t.current_driver_id = dp.user_id)
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 2: Check if user_id exists in users table
SELECT 
  'USER ID CHECK' as debug_step,
  dp.user_id,
  u.id as users_table_id,
  u.phone as users_phone,
  u.first_name as users_first_name
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
WHERE dp.phone = '0599313811';

-- STEP 3: Manually test the sync logic (what the app should do)
-- Force sync the truck with driver status
UPDATE trucks 
SET is_available = (
  SELECT dp.is_available 
  FROM driver_profiles dp 
  WHERE dp.phone = '0599313811'
),
updated_at = NOW()
WHERE id = '5238504c-0a35-4f31-806f-4a6cf5591db6'; -- Car Carrier truck ID

-- STEP 4: Check if the manual sync worked
SELECT 
  'AFTER MANUAL SYNC' as debug_step,
  dp.first_name,
  dp.is_available as driver_available,
  t.is_available as truck_available,
  tt.name as truck_type,
  CASE 
    WHEN dp.is_available = t.is_available THEN '✅ NOW SYNCED' 
    ELSE '❌ STILL NOT SYNCED' 
  END as sync_result
FROM driver_profiles dp
LEFT JOIN trucks t ON t.id = '5238504c-0a35-4f31-806f-4a6cf5591db6'
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 5: Check final customer app result
SELECT 
  'CUSTOMER APP TEST' as debug_step,
  COUNT(DISTINCT tt.id) as total_truck_types_available
FROM truck_types tt
INNER JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true 
AND t.is_available = true;

-- IMMEDIATE FIX: Manually sync Laila's truck since app code isn't working yet

-- STEP 1: Check current state 
SELECT 
  'CURRENT STATE' as status,
  dp.first_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.is_available as truck_available,
  tt.name as truck_type,
  t.id as truck_id
FROM driver_profiles dp
LEFT JOIN trucks t ON t.current_driver_id = dp.user_id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 2: Force sync truck to match driver (Laila is online, so truck should be available)
UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE current_driver_id = (
  SELECT user_id 
  FROM driver_profiles 
  WHERE phone = '0599313811'
);

-- STEP 3: Also update by truck ID directly (Car Carrier)
UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE id = '5238504c-0a35-4f31-806f-4a6cf5591db6';

-- STEP 4: Verify the fix
SELECT 
  'AFTER MANUAL FIX' as status,
  dp.first_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.is_available as truck_available,
  tt.name as truck_type,
  CASE 
    WHEN dp.is_available = t.is_available THEN '✅ SYNCED' 
    ELSE '❌ NOT SYNCED' 
  END as sync_result
FROM driver_profiles dp
LEFT JOIN trucks t ON t.current_driver_id = dp.user_id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 5: Check customer app result (should now show 3 truck types)
SELECT 
  'CUSTOMER APP RESULT' as test,
  tt.name as truck_type,
  COUNT(t.id) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
    THEN '✅ WILL SHOW IN APP' 
    ELSE '❌ NOT AVAILABLE' 
  END as app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- LOGICAL FIX: Sync driver-truck relationships properly

-- STEP 1: Fix Laila's missing current_truck_id relationship
-- She has a truck via current_driver_id, but her profile doesn't know about it
UPDATE driver_profiles 
SET current_truck_id = (
  SELECT id 
  FROM trucks 
  WHERE current_driver_id = '635ba037-656d-4b2f-98da-7d0b609b5886'
),
updated_at = NOW()
WHERE user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 2: Verify the fix worked
SELECT 
  'AFTER FIX' as status,
  dp.first_name,
  dp.user_id,
  dp.current_truck_id,
  dp.is_available as driver_available,
  t.id as truck_id,
  t.is_available as truck_available,
  tt.name as truck_type,
  CASE 
    WHEN dp.current_truck_id = t.id AND t.current_driver_id = dp.user_id 
    THEN '✅ RELATIONSHIPS SYNCED' 
    ELSE '❌ STILL BROKEN' 
  END as sync_status
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 3: Now test the app code logic - simulate driver going offline then online
-- First set driver offline (this should make truck unavailable)
UPDATE driver_profiles 
SET is_available = false,
    status = 'offline',
    updated_at = NOW()
WHERE user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- Update truck to match (simulating what the app code should do)
UPDATE trucks 
SET is_available = false,
    updated_at = NOW()
WHERE current_driver_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 4: Check offline state
SELECT 
  'OFFLINE STATE' as status,
  dp.first_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.is_available as truck_available,
  tt.name as truck_type
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 5: Now set driver online (simulating app code)
UPDATE driver_profiles 
SET is_available = true,
    status = 'online',
    updated_at = NOW()
WHERE user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- Update truck to match (simulating what the app code should do)
UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE current_driver_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 6: Check online state
SELECT 
  'ONLINE STATE' as status,
  dp.first_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.is_available as truck_available,
  tt.name as truck_type
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.user_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- STEP 7: Check customer app result (should now show Car Carrier)
SELECT 
  'CUSTOMER APP RESULT' as test,
  tt.name as truck_type,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
    THEN '✅ WILL SHOW IN CUSTOMER APP' 
    ELSE '❌ NOT AVAILABLE' 
  END as app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- LOGICAL SOLUTION: Fix the broken driver-truck relationships

-- STEP 1: Identify the issue
-- Laila's driver profile: current_truck_id = null
-- Car Carrier truck: current_driver_id = Laila's user_id
-- This creates one-way relationship that breaks the sync

-- STEP 2: Fix Laila's current_truck_id to match the truck that's assigned to her
UPDATE driver_profiles 
SET current_truck_id = '5238504c-0a35-4f31-806f-4a6cf5591db6',
    updated_at = NOW()
WHERE user_id = '635ba037-656d-4b2f-98da-7d0b609b5886'; -- Laila's user_id

-- STEP 3: Also fix Alaa since he has no truck assignment
-- First, let's see what trucks are available for Alaa
SELECT 
  'AVAILABLE TRUCKS FOR ALAA' as info,
  t.id,
  t.license_plate,
  tt.name as truck_type,
  t.current_driver_id
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.current_driver_id IS NULL OR t.current_driver_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- STEP 4: Verify the fix worked - both relationships should now be synced
SELECT 
  'AFTER FIX - RELATIONSHIP CHECK' as status,
  dp.first_name,
  dp.current_truck_id,
  t1.id as truck_via_driver_id,
  t2.id as truck_via_current_truck_id,
  t1.license_plate,
  tt.name as truck_type,
  CASE 
    WHEN t1.id IS NOT NULL AND t2.id IS NOT NULL AND t1.id = t2.id THEN '✅ FULLY SYNCED'
    ELSE '❌ STILL BROKEN'
  END as sync_status
FROM driver_profiles dp
LEFT JOIN trucks t1 ON t1.current_driver_id = dp.user_id
LEFT JOIN trucks t2 ON t2.id = dp.current_truck_id
LEFT JOIN truck_types tt ON t1.truck_type_id = tt.id
WHERE dp.phone IN ('0599313811', '0599313812')
ORDER BY dp.first_name;

-- STEP 5: Test the app sync logic manually
-- Now when driver goes online/offline, BOTH relationships will work:
-- 1. current_driver_id relationship ✅ (was already working)
-- 2. current_truck_id relationship ✅ (now fixed)

-- Simulate what happens when Laila goes online:
UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE current_driver_id = '635ba037-656d-4b2f-98da-7d0b609b5886'; -- via current_driver_id

UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE id = (SELECT current_truck_id FROM driver_profiles WHERE user_id = '635ba037-656d-4b2f-98da-7d0b609b5886'); -- via current_truck_id

-- STEP 6: Final verification - Customer app should now see Car Carrier
SELECT 
  'CUSTOMER APP RESULT' as test,
  tt.name as truck_type,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
    THEN '✅ VISIBLE IN CUSTOMER APP' 
    ELSE '❌ NOT VISIBLE' 
  END as customer_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

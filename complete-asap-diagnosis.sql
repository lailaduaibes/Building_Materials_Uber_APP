-- 🔍 ASAP System Database Diagnostic
-- Run this SQL to understand why multiple drivers get ASAP trips

-- 1. Check what ASAP-related functions exist
SELECT '=== STEP 1: CHECKING ASAP FUNCTIONS ===' as step;

SELECT 
  routine_name,
  routine_type,
  'Function exists' as status
FROM information_schema.routines 
WHERE routine_name LIKE '%asap%' 
   OR routine_name LIKE '%start_%matching%'
ORDER BY routine_name;

-- 2. Check the current start_asap_matching function definition
SELECT '=== STEP 2: CURRENT start_asap_matching FUNCTION ===' as step;

SELECT 
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%start_asap_matching_uber_style%' THEN 'Calls uber_style version'
    WHEN routine_definition LIKE '%start_asap_matching_bulletproof%' THEN 'Calls bulletproof version'  
    WHEN routine_definition LIKE '%start_asap_matching_final_fix%' THEN 'Calls final_fix version'
    WHEN routine_definition LIKE '%start_asap_matching_working%' THEN 'Calls working version'
    ELSE 'Direct implementation or unknown'
  END as implementation_type,
  LENGTH(routine_definition) as definition_length
FROM information_schema.routines 
WHERE routine_name = 'start_asap_matching';

-- 3. Check asap_driver_queue table status
SELECT '=== STEP 3: ASAP DRIVER QUEUE STATUS ===' as step;

SELECT 
  COUNT(*) as total_queue_entries,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_entries,
  COUNT(CASE WHEN status = 'notified' THEN 1 END) as notified_entries,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_entries,
  COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined_entries,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_entries
FROM asap_driver_queue;

-- 4. Check recent ASAP trips and their assignment status
SELECT '=== STEP 4: RECENT ASAP TRIPS ===' as step;

SELECT 
  SUBSTRING(id::text, 1, 8) as trip_id_short,
  status,
  pickup_time_preference,
  CASE 
    WHEN assigned_driver_id IS NULL THEN 'NO_DRIVER_ASSIGNED'
    ELSE 'DRIVER_ASSIGNED'
  END as assignment_status,
  created_at,
  SUBSTRING(load_description, 1, 50) as description_short
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check database triggers on trip_requests
SELECT '=== STEP 5: DATABASE TRIGGERS ===' as step;

SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  CASE 
    WHEN action_statement LIKE '%start_asap_matching%' THEN 'Calls ASAP matching'
    ELSE 'Other action'
  END as trigger_action
FROM information_schema.triggers 
WHERE event_object_table = 'trip_requests'
ORDER BY trigger_name;

-- 6. Check available drivers
SELECT '=== STEP 6: AVAILABLE DRIVERS ===' as step;

SELECT 
  COUNT(*) as total_approved_drivers,
  COUNT(CASE WHEN dl.user_id IS NOT NULL THEN 1 END) as drivers_with_location,
  COUNT(CASE WHEN dl.user_id IS NULL THEN 1 END) as drivers_without_location
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.user_id
WHERE dp.is_approved = true 
  AND dp.approval_status = 'approved';

-- 7. Most important: Check what happens when ASAP trip is created
SELECT '=== STEP 7: TESTING TRIP CREATION FLOW ===' as step;

-- Look for the most recent ASAP trip to understand the flow
WITH recent_asap AS (
  SELECT id, status, assigned_driver_id, created_at
  FROM trip_requests 
  WHERE pickup_time_preference = 'asap' 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  'Recent ASAP trip' as test_type,
  SUBSTRING(id::text, 1, 8) as trip_id,
  status,
  CASE 
    WHEN assigned_driver_id IS NULL THEN '❌ NO_DRIVER_ASSIGNED - This is the problem!'
    ELSE '✅ DRIVER_ASSIGNED - Working correctly'
  END as diagnosis,
  created_at
FROM recent_asap;

-- 8. Final diagnosis
SELECT '=== FINAL DIAGNOSIS ===' as step;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trip_requests 
      WHERE pickup_time_preference = 'asap' 
        AND assigned_driver_id IS NULL 
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '1 hour'
    ) THEN '🚨 PROBLEM: ASAP trips are NOT getting assigned_driver_id set - this causes multiple notifications'
    ELSE '✅ WORKING: Recent ASAP trips have assigned_driver_id set correctly'
  END as root_cause_analysis;

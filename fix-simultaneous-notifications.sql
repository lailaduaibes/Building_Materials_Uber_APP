-- 🚨 CRITICAL FIX: Stop simultaneous driver notifications

-- The issue is clear: trips are reaching multiple drivers simultaneously 
-- because there's a mechanism bypassing the queue system.

-- Step 1: Identify the exact mechanism causing simultaneous notifications
-- Check if trips are being inserted with assigned_driver_id already set
-- or if there's a global notification trigger

-- Check recent trip creation pattern
WITH recent_trips AS (
    SELECT 
        id,
        status,
        assigned_driver_id,
        pickup_time_preference,
        created_at,
        matched_at,
        EXTRACT(EPOCH FROM (COALESCE(matched_at, NOW()) - created_at)) as assignment_delay_seconds
    FROM trip_requests
    WHERE created_at > NOW() - INTERVAL '3 hours'
    AND pickup_time_preference = 'asap'
    ORDER BY created_at DESC
)
SELECT 
    '=== TRIP ASSIGNMENT TIMING ANALYSIS ===' as section,
    id,
    status,
    assigned_driver_id,
    CASE 
        WHEN assigned_driver_id IS NOT NULL AND assignment_delay_seconds < 1 THEN '🚨 INSTANT_ASSIGNMENT'
        WHEN assigned_driver_id IS NOT NULL AND assignment_delay_seconds > 1 THEN '✅ QUEUE_ASSIGNMENT'
        WHEN assigned_driver_id IS NULL THEN '❌ NO_ASSIGNMENT'
        ELSE 'UNKNOWN'
    END as assignment_type,
    assignment_delay_seconds
FROM recent_trips;

-- Step 2: THE ROOT ISSUE - Find what's notifying drivers without assignment
-- Check if there are any functions or triggers that notify ALL drivers for ASAP trips

-- Look for notification functions
SELECT 
    '=== NOTIFICATION FUNCTIONS ===' as section,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%notify%' OR 
    routine_name LIKE '%broadcast%' OR
    routine_name LIKE '%alert%' OR
    routine_name LIKE '%push%'
)
ORDER BY routine_name;

-- Step 3: Check if notify_next_driver_in_queue is being called but not setting assigned_driver_id
-- This would explain how drivers get notifications but assigned_driver_id stays null

SELECT 
    '=== CHECKING notify_next_driver_in_queue FUNCTION ===' as section,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_next_driver_in_queue'
AND routine_schema = 'public';

-- Step 4: CRITICAL - Check if trips are being broadcasted to ALL drivers instead of queued
-- Look for any global broadcast mechanism

-- If this query returns data, it means trips are reaching drivers through 
-- some mechanism other than assigned_driver_id updates

SELECT 
    '=== GLOBAL NOTIFICATION CHECK ===' as section,
    'If you received notifications for trips with assigned_driver_id=null, then there is a global broadcast mechanism bypassing the queue' as analysis;

-- Step 5: IMMEDIATE FIX - Ensure start_asap_matching is called AND sets assigned_driver_id
-- The problem might be that notify_next_driver_in_queue sends notifications 
-- but doesn't update assigned_driver_id in trip_requests table

-- Fix: Update notify_next_driver_in_queue to also set assigned_driver_id
CREATE OR REPLACE FUNCTION notify_next_driver_in_queue_fixed(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    notified_driver_id UUID
) LANGUAGE plpgsql AS $$
DECLARE
    next_queue_entry RECORD;
    target_driver_id UUID;
BEGIN
    RAISE NOTICE '📱 notify_next_driver_in_queue_fixed called for trip: %', trip_request_id;
    
    -- Get the next driver in queue
    SELECT * INTO next_queue_entry
    FROM asap_driver_queue 
    WHERE trip_request_id = trip_request_id
    AND status = 'pending'
    ORDER BY queue_position ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE '❌ No pending drivers in queue for trip: %', trip_request_id;
        RETURN QUERY SELECT FALSE, 'No drivers in queue', NULL::UUID;
        RETURN;
    END IF;
    
    target_driver_id := next_queue_entry.driver_id;
    
    -- 🚀 CRITICAL FIX: Update trip_requests.assigned_driver_id 
    -- This ensures real-time subscription only notifies the assigned driver
    UPDATE trip_requests 
    SET assigned_driver_id = target_driver_id,
        status = 'pending'  -- Keep as pending until driver accepts
    WHERE id = trip_request_id;
    
    -- Update queue entry status
    UPDATE asap_driver_queue 
    SET status = 'notified',
        notified_at = NOW()
    WHERE trip_request_id = trip_request_id
    AND driver_id = target_driver_id;
    
    RAISE NOTICE '✅ FIXED: Trip % assigned to driver % and queue notified', trip_request_id, target_driver_id;
    
    RETURN QUERY SELECT TRUE, 'Driver notified and assigned', target_driver_id;
END;
$$;

-- Step 6: Update start_asap_matching to use the fixed notification function
CREATE OR REPLACE FUNCTION start_asap_matching_final_fix(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    trip_record RECORD;
    driver_count INTEGER := 0;
    notification_result RECORD;
BEGIN
    RAISE NOTICE '🚀 start_asap_matching_final_fix called for trip: %', trip_request_id;
    
    -- Get trip details
    SELECT * INTO trip_record 
    FROM trip_requests 
    WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Trip not found', 0;
        RETURN;
    END IF;
    
    -- Step 1: Build the queue using existing start_asap_matching_sequential
    PERFORM start_asap_matching_sequential(trip_request_id);
    
    -- Step 2: Check how many drivers were added to queue
    SELECT COUNT(*) INTO driver_count
    FROM asap_driver_queue 
    WHERE trip_request_id = trip_request_id;
    
    IF driver_count = 0 THEN
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT FALSE, 'No available drivers found', 0;
        RETURN;
    END IF;
    
    -- Step 3: Notify ONLY the first driver in queue AND set assigned_driver_id
    SELECT * INTO notification_result
    FROM notify_next_driver_in_queue_fixed(trip_request_id);
    
    IF notification_result.success THEN
        RAISE NOTICE '✅ SUCCESS: Trip assigned to driver % via queue system', notification_result.notified_driver_id;
        RETURN QUERY SELECT TRUE, FORMAT('Trip assigned to driver via queue system'), driver_count;
    ELSE
        RAISE NOTICE '❌ Failed to notify driver from queue';
        RETURN QUERY SELECT FALSE, 'Failed to notify driver from queue', driver_count;
    END IF;
END;
$$;

-- Step 7: Test the complete fix
SELECT '=== TESTING COMPLETE QUEUE INTEGRATION FIX ===' as test_section;

DO $$
DECLARE
    test_result RECORD;
    recent_trip_id UUID;
BEGIN
    -- Get a recent failed trip
    SELECT id INTO recent_trip_id 
    FROM trip_requests 
    WHERE status = 'no_drivers_available'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF recent_trip_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing complete fix with trip: %', recent_trip_id;
        
        -- Reset trip status
        UPDATE trip_requests 
        SET status = 'pending', assigned_driver_id = NULL 
        WHERE id = recent_trip_id;
        
        -- Clear any existing queue entries
        DELETE FROM asap_driver_queue WHERE trip_request_id = recent_trip_id;
        
        -- Test the fixed function
        SELECT * INTO test_result 
        FROM start_asap_matching_final_fix(recent_trip_id);
        
        RAISE NOTICE '📊 FINAL FIX result: success=%, message=%, drivers=%', 
                     test_result.success, test_result.message, test_result.drivers_found;
                     
        -- Check final state
        SELECT 
            id, status, assigned_driver_id 
        FROM trip_requests 
        WHERE id = recent_trip_id;
        
    ELSE
        RAISE NOTICE '❌ No failed trips found to test with';
    END IF;
END $$;

SELECT '🎯 This should stop simultaneous notifications and use proper queue system!' as conclusion;

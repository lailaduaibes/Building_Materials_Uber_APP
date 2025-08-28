-- FIX ALL ASAP ISSUES - Comprehensive Solution

-- ==============================================
-- STEP 1: Identify the correct driver_profiles.id
-- ==============================================

SELECT 
    '🔍 FINDING CORRECT DRIVER ID:' as step,
    user_id as user_id_in_profiles,
    id as actual_id_for_locations,
    first_name || ' ' || last_name as name,
    is_available,
    is_approved
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- ==============================================
-- STEP 2: Fix location data using correct ID
-- ==============================================

-- Insert location using the correct driver_profiles.id (not user_id!)
WITH driver_info AS (
    SELECT id as correct_driver_id, user_id, first_name || ' ' || last_name as name
    FROM driver_profiles 
    WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
    AND is_available = true 
    AND is_approved = true
    LIMIT 1
)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT 
    correct_driver_id,  -- Use correct ID!
    32.38882269537229,  -- Your GPS coordinates
    35.321972744900584,
    NOW()
FROM driver_info
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Verify the location was fixed
SELECT 
    '✅ FIXED LOCATION DATA:' as step,
    dl.driver_id as location_table_id,
    dp.user_id as profile_user_id,
    dp.first_name || ' ' || dp.last_name as name,
    dl.latitude,
    dl.longitude,
    'SUCCESS!' as status
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.id  -- Correct join!
WHERE dl.updated_at > NOW() - INTERVAL '1 minute';

-- ==============================================
-- STEP 3: Test proximity matching now
-- ==============================================

SELECT 
    '🎯 PROXIMITY TEST WITH FIXED DATA:' as step,
    driver_id,
    driver_name,
    distance_km,
    'DRIVER FOUND!' as result
FROM find_nearby_available_drivers(
    32.390000,  -- Customer pickup near your location
    35.323000,
    15,         -- 15km radius
    30          -- 30 minutes max age
)
LIMIT 3;

-- ==============================================
-- STEP 4: Fix existing ASAP trips
-- ==============================================

-- Get the most recent customer ASAP trip that's still pending
WITH pending_asap AS (
    SELECT id, load_description, created_at
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
    AND status = 'pending'
    AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🛒 PENDING CUSTOMER ASAP TRIP:' as step,
    id,
    load_description,
    'READY FOR MATCHING' as status
FROM pending_asap;

-- Trigger ASAP matching for the most recent customer trip
DO $$
DECLARE
    asap_trip_id UUID;
    matching_result RECORD;
BEGIN
    -- Get most recent customer ASAP trip
    SELECT id INTO asap_trip_id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
    AND status = 'pending'
    AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1;

    IF asap_trip_id IS NOT NULL THEN
        RAISE NOTICE '🚀 STARTING ASAP MATCHING FOR EXISTING TRIP: %', asap_trip_id;
        
        -- Call the matching function
        SELECT * INTO matching_result FROM start_asap_matching(asap_trip_id);
        
        RAISE NOTICE '📊 RESULT: Success=%, Message=%, Drivers=%', 
                     matching_result.success, matching_result.message, matching_result.drivers_found;
    ELSE
        RAISE NOTICE '⚠️ NO PENDING ASAP TRIPS FOUND';
    END IF;
END $$;

-- ==============================================
-- STEP 5: Check if driver notifications were created
-- ==============================================

SELECT 
    '📱 DRIVER NOTIFICATIONS STATUS:' as step,
    COUNT(*) as notification_count,
    array_agg(DISTINCT tr.assigned_driver_id) filter (where tr.assigned_driver_id IS NOT NULL) as drivers_notified,
    array_agg(DISTINCT dp.first_name || ' ' || dp.last_name) filter (where dp.first_name IS NOT NULL) as driver_names,
    MAX(tr.acceptance_deadline) as latest_deadline,
    CASE 
        WHEN MAX(tr.acceptance_deadline) > NOW() THEN '🟢 ACTIVE - CHECK YOUR APP!'
        WHEN COUNT(*) > 0 THEN '🔴 EXPIRED'
        ELSE '⚠️ NO NOTIFICATIONS CREATED'
    END as status
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
    AND status IN ('pending', 'matching')
    AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Show active driver requests
SELECT 
    '🔔 ACTIVE DRIVER REQUESTS:' as step,
    tr.id as request_id,
    u.id as user_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER as seconds_remaining,
    tr.quoted_price::TEXT || ' NIS' as earnings
FROM trip_requests tr
JOIN users u ON tr.assigned_driver_id = u.id
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE tr.status = 'pending'
AND tr.acceptance_deadline > NOW()
AND tr.original_trip_id IS NOT NULL
ORDER BY tr.created_at DESC;

-- ==============================================
-- STEP 6: Update DriverService location method
-- ==============================================

-- Show what needs to be fixed in the app code
SELECT 
    '🔧 CODE FIX NEEDED:' as instruction,
    'DriverService.updateDriverLocation() must use driver_profiles.id not user_id' as issue,
    'The foreign key constraint expects driver_profiles.id' as explanation,
    'Check the fixed code in the next steps' as action;

-- ==============================================
-- STEP 7: Final verification
-- ==============================================

SELECT 
    '📋 FINAL SYSTEM STATUS:' as step,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) as available_drivers,
    (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '5 minutes') as recent_locations,
    (SELECT COUNT(*) FROM trip_requests WHERE pickup_time_preference = 'asap' AND status = 'pending' AND assigned_driver_id IS NULL) as customer_asap_trips,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) as active_driver_notifications,
    CASE 
        WHEN (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) > 0 
        THEN '✅ SYSTEM WORKING - CHECK YOUR DRIVER APP NOW!'
        ELSE '⚠️ System ready but no active notifications - create new ASAP trip to test'
    END as diagnosis;

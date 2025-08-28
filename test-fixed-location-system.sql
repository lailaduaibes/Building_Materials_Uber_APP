-- Test the fixed location system that updates both tables

-- Step 1: Check what drivers exist first
SELECT 
    '👥 AVAILABLE DRIVERS:' as info,
    dp.user_id,
    dp.first_name || ' ' || dp.last_name as name,
    dp.is_available,
    dp.is_approved,
    dp.status,
    u.current_latitude as users_lat,
    u.current_longitude as users_lng
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
WHERE dp.is_approved = true
ORDER BY dp.is_available DESC, dp.created_at DESC;

-- Step 2: Check current driver_locations table
SELECT 
    '📍 CURRENT LOCATION DATA:' as info,
    driver_id,
    latitude,
    longitude,
    updated_at,
    EXTRACT(MINUTE FROM (NOW() - updated_at)) as minutes_old
FROM driver_locations
ORDER BY updated_at DESC;

-- Step 3: Now test manual location update (simulating what the fixed app will do)
-- Get the first available approved driver
WITH available_driver AS (
    SELECT user_id, first_name || ' ' || last_name as name
    FROM driver_profiles 
    WHERE is_approved = true AND is_available = true 
    LIMIT 1
)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT 
    user_id, 
    32.38882269537229,  -- Your current GPS coordinates
    35.321972744900584,
    NOW()
FROM available_driver
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 4: Verify the location was updated successfully
SELECT 
    '✅ LOCATION UPDATE SUCCESS:' as result,
    dl.driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    'NOW READY FOR ASAP MATCHING!' as status
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dl.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY dl.updated_at DESC;

-- Step 5: Test ASAP matching with your location
SELECT 
    '🎯 ASAP MATCHING TEST:' as test,
    driver_id,
    driver_name,
    distance_km,
    'FOUND YOU!' as matching_status
FROM find_nearby_available_drivers(
    32.390000,  -- Customer pickup near your location
    35.323000,
    15,         -- 15km radius
    30          -- 30 minutes max age
);

-- Step 6: Show the system is now properly connected
SELECT 
    '🔗 LOCATION SYSTEM STATUS:' as final_check,
    COUNT(CASE WHEN dp.is_available = true AND dp.is_approved = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN dl.updated_at > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_locations,
    COUNT(CASE WHEN dp.is_available = true AND dp.is_approved = true AND dl.updated_at > NOW() - INTERVAL '5 minutes' THEN 1 END) as asap_ready_drivers,
    'SYSTEM FIXED!' as status
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id;

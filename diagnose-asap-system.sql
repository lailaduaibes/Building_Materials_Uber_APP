-- Comprehensive diagnosis of why ASAP system isn't working

-- Step 1: Check if ANY drivers exist in the system
SELECT 
    '👥 ALL DRIVERS IN SYSTEM:' as info,
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN is_approved = true AND is_available = true THEN 1 END) as ready_drivers
FROM driver_profiles;

-- Step 2: Show actual driver data
SELECT 
    '🚗 DRIVER DETAILS:' as info,
    user_id,
    first_name,
    last_name,
    email,
    is_approved,
    is_available,
    status,
    created_at
FROM driver_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check driver locations table
SELECT 
    '📍 DRIVER LOCATIONS:' as info,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_locations
FROM driver_locations;

-- Step 4: Show location details
SELECT 
    '🗺️ LOCATION DETAILS:' as info,
    dl.driver_id,
    dp.first_name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    EXTRACT(MINUTE FROM (NOW() - dl.updated_at)) as minutes_old
FROM driver_locations dl
LEFT JOIN driver_profiles dp ON dl.driver_id = dp.user_id
ORDER BY dl.updated_at DESC
LIMIT 5;

-- Step 5: Check the customer ASAP trip we just created
SELECT 
    '🛒 CUSTOMER TRIP STATUS:' as info,
    id,
    load_description,
    status,
    assigned_driver_id,
    required_truck_type_id,
    pickup_latitude,
    pickup_longitude,
    pickup_time_preference,
    matching_started_at
FROM trip_requests 
WHERE load_description LIKE 'Customer ASAP Request -%'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 6: Test the proximity function directly
SELECT 
    '🔍 PROXIMITY FUNCTION TEST:' as test,
    'Testing with trip coordinates...' as note;

SELECT 
    driver_id,
    driver_name,
    distance_km,
    last_updated
FROM find_nearby_available_drivers(
    32.390000, -- pickup from our customer trip
    35.323000,
    50,        -- Expand to 50km radius
    1440       -- 24 hours (very permissive)
);

-- Step 7: Check if start_asap_matching function exists and works
SELECT 
    '🔧 FUNCTION TEST:' as test,
    'Checking if ASAP functions exist...' as note;

-- Test with our customer trip
WITH test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 ASAP MATCHING TEST:' as test,
    id as trip_id,
    'Attempting to start ASAP matching...' as action
FROM test_trip;

SELECT '🔍 Diagnosis complete! Review results above.' as final_message;

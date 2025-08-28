-- Quick fix to get the correct driver ID and test ASAP

-- Step 1: Find your actual driver ID
SELECT 
    '👤 YOUR DRIVER:' as info,
    user_id,
    first_name,
    last_name,
    email,
    is_available,
    is_approved,
    status
FROM driver_profiles 
WHERE is_available = true AND is_approved = true
LIMIT 1;

-- Step 2: Just use a simple update to add/update location for ANY available driver
-- This will work regardless of which driver exists
WITH available_driver AS (
    SELECT user_id FROM driver_profiles 
    WHERE is_available = true AND is_approved = true
    LIMIT 1
)
UPDATE driver_locations 
SET 
    latitude = 32.387000,
    longitude = 35.324000,
    updated_at = NOW()
WHERE driver_id IN (SELECT user_id FROM available_driver);

-- If no location exists, insert for the first available driver
WITH available_driver AS (
    SELECT user_id FROM driver_profiles 
    WHERE is_available = true AND is_approved = true
    LIMIT 1
)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT user_id, 32.387000, 35.324000, NOW()
FROM available_driver
WHERE NOT EXISTS (
    SELECT 1 FROM driver_locations 
    WHERE driver_id = available_driver.user_id
);

-- Step 3: Show the updated driver location
SELECT 
    '📍 DRIVER LOCATION READY:' as status,
    dl.driver_id,
    dp.first_name || ' ' || dp.last_name as name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    'FRESH DATA!' as note
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dp.is_available = true AND dp.is_approved = true;

-- Step 4: Test proximity search
SELECT 
    '🔍 PROXIMITY SEARCH:' as test,
    driver_id,
    driver_name,
    distance_km,
    'SHOULD FIND DRIVER!' as result
FROM find_nearby_available_drivers(
    32.387000, -- pickup lat
    35.324000, -- pickup lng  
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Find the correct driver ID from your system

-- Find all available and approved drivers
SELECT 
    '👤 ALL AVAILABLE DRIVERS:' as info,
    user_id,
    first_name,
    last_name,
    is_available,
    is_approved,
    status,
    selected_truck_type_id
FROM driver_profiles 
WHERE is_available = true AND is_approved = true
ORDER BY created_at DESC;

-- Check existing driver locations
SELECT 
    '📍 EXISTING DRIVER LOCATIONS:' as info,
    dl.driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    EXTRACT(MINUTE FROM (NOW() - dl.updated_at)) as minutes_ago
FROM driver_locations dl
LEFT JOIN driver_profiles dp ON dl.driver_id = dp.user_id
ORDER BY dl.updated_at DESC;

-- Show the truck types to match drivers
SELECT 
    '🚛 TRUCK TYPES:' as info,
    id,
    name,
    description
FROM truck_types
ORDER BY name;

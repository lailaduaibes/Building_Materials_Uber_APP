-- Test queries to check if you have real driver data

-- 1. Check if you have any actual drivers registered
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.user_type,
    u.role,
    u.created_at
FROM users u
WHERE u.user_type = 'driver' OR u.role = 'driver'
ORDER BY u.created_at DESC
LIMIT 5;

-- 2. Check driver profiles with real registration data
SELECT 
    dp.id,
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.years_experience,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_max_payload,
    dp.vehicle_max_volume,
    dp.specializations,
    dp.preferred_truck_types,
    dp.approval_status,
    dp.is_approved,
    dp.status,
    dp.created_at
FROM driver_profiles dp
ORDER BY dp.created_at DESC
LIMIT 5;

-- 3. Check if any driver is currently logged in (has recent activity)
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.is_online,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    dp.status,
    dp.is_available,
    dp.last_seen
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE (u.user_type = 'driver' OR u.role = 'driver')
  AND (u.is_online = true OR dp.last_seen > NOW() - INTERVAL '24 hours')
ORDER BY dp.last_seen DESC
LIMIT 3;

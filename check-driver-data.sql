-- Check what driver profile data is actually stored in the database
-- This will help us see if the registration data was saved correctly

-- 1. Check recent driver profiles (last 5)
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    phone,
    years_experience,
    vehicle_model,
    vehicle_year,
    vehicle_plate,
    specializations,
    preferred_truck_types,
    rating,
    total_trips,
    total_earnings,
    is_approved,
    approval_status,
    application_submitted_at,
    created_at
FROM driver_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if the corresponding users exist
SELECT 
    dp.id as profile_id,
    dp.first_name as profile_first_name,
    dp.last_name as profile_last_name,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    u.email,
    u.role,
    u.user_type
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
ORDER BY dp.created_at DESC
LIMIT 5;

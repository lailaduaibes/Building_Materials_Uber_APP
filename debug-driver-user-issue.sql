-- Check if the driver profile exists
SELECT 'Driver Profile:' as check_type, id, first_name, last_name, phone, user_id 
FROM driver_profiles 
WHERE id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- Check if corresponding user exists in auth.users
SELECT 'Auth User:' as check_type, id, email, created_at 
FROM auth.users 
WHERE id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- Check all driver profiles and their user_id relationships
SELECT 'All Drivers:' as check_type, dp.id as driver_profile_id, dp.user_id as user_id_ref, 
       dp.first_name, dp.last_name, u.email as user_email
FROM driver_profiles dp
LEFT JOIN auth.users u ON dp.user_id = u.id
ORDER BY dp.created_at DESC
LIMIT 5;

-- Check trip_call_logs table structure
\d trip_call_logs;

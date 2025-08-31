-- Check the driver_profiles table schema and data for phone field
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_profiles'
AND column_name ILIKE '%phone%'
ORDER BY ordinal_position;

-- Check actual driver profile data for the current user
SELECT user_id, first_name, last_name, phone, email
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Also check the users table for phone data
SELECT id, first_name, last_name, phone, email
FROM users 
WHERE id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Check if phone is in a different field in driver_profiles
SELECT *
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Check if driver profile exists for the failing driver_id
SELECT 
    'Checking driver profile existence' as step,
    '2bd7bd97-5cf9-431f-adfc-4ec4448be52c' as driver_id;

-- Check if user exists in users table
SELECT 
    'User exists in users table:' as check_type,
    id, 
    email, 
    first_name, 
    last_name, 
    role, 
    user_type,
    current_latitude,
    current_longitude,
    last_location_update
FROM users 
WHERE id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Check if driver profile exists in driver_profiles table
SELECT 
    'Driver profile exists:' as check_type,
    user_id, 
    vehicle_type, 
    is_available, 
    is_online,
    availability_status,
    created_at
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Check foreign key constraints on driver_locations
SELECT 
    'Foreign key constraints:' as check_type,
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    a.attname as column_name,
    af.attname as referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f' 
AND c.conrelid = 'driver_locations'::regclass;

-- Check if there are any existing records in driver_locations
SELECT 
    'Existing driver_locations records:' as check_type,
    driver_id,
    latitude,
    longitude,
    updated_at
FROM driver_locations 
LIMIT 5;

-- Check the driver_profiles table structure to see id vs user_id
SELECT 
    'Driver profiles table structure:' as check_type,
    id as profile_id,
    user_id,
    vehicle_type,
    is_available
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
   OR id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Check if the foreign key is pointing to the wrong column
SELECT 
    'Foreign key constraint definition:' as check_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
WHERE c.conname = 'driver_locations_driver_id_fkey';

-- Check all tables in the database
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check structure of users table (from registration)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check structure of driver_profiles table (from driver registration)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'driver_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check structure of vehicles/trucks table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trucks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check actual user data from registration
SELECT id, email, full_name, phone, user_type, created_at, last_seen
FROM users
WHERE user_type = 'driver'
ORDER BY created_at DESC
LIMIT 10;

-- Check actual driver profile data
SELECT 
    dp.id,
    dp.user_id,
    dp.license_number,
    dp.years_of_experience,
    dp.max_distance_km,
    dp.availability_status,
    dp.current_location,
    dp.vehicle_type,
    dp.emergency_contact,
    u.full_name,
    u.email
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
ORDER BY dp.created_at DESC
LIMIT 10;

-- Check actual vehicle/truck data
SELECT 
    id,
    driver_id,
    license_plate,
    make,
    model,
    year,
    capacity_kg,
    capacity_m3,
    vehicle_type,
    status,
    created_at
FROM trucks
ORDER BY created_at DESC
LIMIT 10;

-- Check trip_requests structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'trip_requests' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check actual trip data with customer information
SELECT 
    tr.id,
    tr.customer_id,
    tr.driver_id,
    tr.status,
    tr.pickup_address,
    tr.delivery_address,
    tr.material_type,
    tr.quantity,
    customer.full_name as customer_name,
    customer.phone as customer_phone,
    driver.full_name as driver_name
FROM trip_requests tr
LEFT JOIN users customer ON tr.customer_id = customer.id
LEFT JOIN users driver ON tr.driver_id = driver.id
ORDER BY tr.created_at DESC
LIMIT 10;

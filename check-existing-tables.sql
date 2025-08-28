-- Check existing trip_requests table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
ORDER BY ordinal_position;

-- Check if trip_requests table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'trip_requests'
);

-- Check existing trips table structure (relevant columns)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trips' 
    AND column_name IN (
        'id', 'customer_id', 'driver_id', 'status', 
        'pickup_time_preference', 'scheduled_pickup_time',
        'pickup_address', 'delivery_address', 'material_type',
        'quoted_price', 'estimated_duration_minutes', 'created_at'
    )
ORDER BY ordinal_position;

-- Check driver_profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
    AND column_name IN ('user_id', 'is_online', 'availability_status')
ORDER BY ordinal_position;

-- Check if driver_locations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'driver_locations'
);

-- If driver_locations exists, show structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_locations'
ORDER BY ordinal_position;

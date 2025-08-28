-- Check the actual trips table structure (full table)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trips'
ORDER BY ordinal_position;

-- Check existing trip_requests table data
SELECT * FROM trip_requests LIMIT 3;

-- Check what status values exist in trips
SELECT DISTINCT status FROM trip_requests;

-- Check driver_profiles table structure (complete)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles'
ORDER BY ordinal_position;

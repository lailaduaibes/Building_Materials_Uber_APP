-- Check the actual schema of trip_tracking table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trip_tracking' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check what columns exist in the users table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any location-related columns in trip_tracking
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'trip_tracking' 
AND table_schema = 'public'
AND (column_name LIKE '%latitude%' OR column_name LIKE '%longitude%' OR column_name LIKE '%location%')
ORDER BY column_name;

-- Check what tables contain trip tracking data
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public'
AND (column_name LIKE '%latitude%' OR column_name LIKE '%longitude%')
ORDER BY table_name, column_name;

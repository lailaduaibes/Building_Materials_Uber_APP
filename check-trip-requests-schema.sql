-- Check the schema of trip_requests table to find the correct driver field name
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_requests'
ORDER BY ordinal_position;

-- Also check for any foreign key relationships
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='trip_requests'
AND kcu.column_name LIKE '%driver%';

-- Check current data in trip_requests to see what driver-related fields exist
SELECT column_name
FROM information_schema.columns 
WHERE table_name = 'trip_requests'
AND column_name ILIKE '%driver%';

-- Sample data from trip_requests to see the actual field names
SELECT *
FROM trip_requests
LIMIT 3;

-- Check the actual structure of driver_documents table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'driver_documents' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any documents for this specific driver
SELECT *
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb';

-- Check all driver documents to see what exists
SELECT 
    dd.*,
    dp.first_name,
    dp.last_name
FROM driver_documents dd
JOIN driver_profiles dp ON dd.driver_id = dp.id
ORDER BY dd.uploaded_at DESC
LIMIT 10;

-- Alternative: Check if driver_id should be user_id instead
SELECT 
    dd.*,
    u.first_name,
    u.last_name  
FROM driver_documents dd
JOIN users u ON dd.driver_id = u.id
ORDER BY dd.uploaded_at DESC
LIMIT 5;

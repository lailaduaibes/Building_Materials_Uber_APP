-- Check the actual schema of asap_driver_queue table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'asap_driver_queue'
ORDER BY ordinal_position;

-- Also check what data is in the table
SELECT * FROM asap_driver_queue LIMIT 5;

-- Check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'asap_driver_queue'
);

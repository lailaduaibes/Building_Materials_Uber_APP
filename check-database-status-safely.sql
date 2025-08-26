-- =============================================================================
-- SAFE DATABASE STATUS CHECK - RUN THIS FIRST
-- This script only READS data to check current status - NO MODIFICATIONS
-- =============================================================================

-- 1. Check if trip_requests table exists and its structure
SELECT 
    'trip_requests table structure' as check_type,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
ORDER BY ordinal_position;

-- 2. Check if payment_methods table exists and its structure  
SELECT 
    'payment_methods table structure' as check_type,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
ORDER BY ordinal_position;

-- 3. Check for existing payment-related columns in trip_requests
SELECT 
    'existing payment columns in trip_requests' as check_type,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND (column_name LIKE '%payment%' OR column_name LIKE '%paid%')
ORDER BY ordinal_position;

-- 4. Check foreign key constraints between tables
SELECT 
    'foreign key constraints' as check_type,
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
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
AND (tc.table_name = 'trip_requests' OR tc.table_name = 'payment_methods');

-- 5. Count records in each table to see what data exists
SELECT 
    'trip_requests count' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
    COUNT(CASE WHEN quoted_price > 0 THEN 1 END) as trips_with_price
FROM trip_requests;

SELECT 
    'payment_methods count' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_default = true THEN 1 END) as default_methods
FROM payment_methods 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods');

-- 6. Sample trip_requests data (first 3 records)
SELECT 
    'sample trip_requests data' as check_type,
    id,
    customer_id,
    status,
    quoted_price,
    pickup_address,
    delivery_address,
    material_type,
    created_at
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 3;

-- 7. Sample payment_methods data (if table exists)
SELECT 
    'sample payment_methods data' as check_type,
    id,
    user_id,
    type,
    last4,
    brand,
    is_default,
    created_at
FROM payment_methods 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods')
ORDER BY created_at DESC 
LIMIT 3;

-- 8. Check for any existing indexes on relevant tables
SELECT 
    'existing indexes' as check_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('trip_requests', 'payment_methods')
ORDER BY tablename, indexname;

-- 9. Check table permissions and RLS policies
SELECT 
    'table permissions and RLS' as check_type,
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('trip_requests', 'payment_methods');

-- 10. Final status summary
SELECT 
    'STATUS SUMMARY' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trip_requests' AND column_name = 'payment_status') 
        THEN 'Payment fields already exist in trip_requests'
        ELSE 'Payment fields need to be added to trip_requests'
    END as payment_fields_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') 
        THEN 'payment_methods table exists'
        ELSE 'payment_methods table missing'
    END as payment_methods_table_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'trip_requests' AND kcu.column_name = 'payment_method_id' AND tc.constraint_type = 'FOREIGN KEY'
        )
        THEN 'Foreign key relationship exists'
        ELSE 'Foreign key relationship needs to be created'
    END as foreign_key_status;

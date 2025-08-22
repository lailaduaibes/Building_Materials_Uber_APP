-- GET MAIN TABLE STRUCTURES
-- Run these queries to see the detailed structure of your main tables

-- QUERY 1: ORDERS table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- QUERY 2: TRIP_REQUESTS table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trip_requests'
ORDER BY ordinal_position;

-- QUERY 3: ORDER_ITEMS table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'order_items'
ORDER BY ordinal_position;

-- QUERY 4: TRIP_TRACKING table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trip_tracking'
ORDER BY ordinal_position;

-- QUERY 5: USERS table structure (your custom one)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- QUERY 6: Sample data from ORDERS
SELECT * FROM orders LIMIT 5;

-- QUERY 7: Sample data from TRIP_REQUESTS
SELECT * FROM trip_requests LIMIT 5;

-- QUERY 8: Sample data from ORDER_ITEMS
SELECT * FROM order_items LIMIT 5;

-- QUERY 9: Check what values exist in any order_type or category fields
SELECT DISTINCT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') 
        THEN 'order_type_exists'
        ELSE 'no_order_type_column'
    END as order_type_status;

-- QUERY 10: Check what status values exist in orders
SELECT DISTINCT status FROM orders WHERE status IS NOT NULL;

-- QUERY 11: Check what status values exist in trip_requests
SELECT DISTINCT status FROM trip_requests WHERE status IS NOT NULL;

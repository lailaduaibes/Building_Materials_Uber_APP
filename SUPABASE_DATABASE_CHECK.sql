-- SUPABASE DATABASE EXAMINATION QUERIES
-- Run these in your Supabase SQL Editor to see current database structure

-- 1. CHECK ALL TABLES
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. CHECK TRIP/ORDER RELATED TABLES
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%trip%' OR table_name LIKE '%order%' OR table_name LIKE '%delivery%' OR table_name LIKE '%material%')
ORDER BY table_name;

-- 3. CHECK TRIPS TABLE STRUCTURE (if exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trips'
ORDER BY ordinal_position;

-- 4. CHECK ORDERS TABLE STRUCTURE (if exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- 5. CHECK TRIP_REQUESTS TABLE STRUCTURE (if exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trip_requests'
ORDER BY ordinal_position;

-- 6. CHECK DELIVERIES TABLE STRUCTURE (if exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'deliveries'
ORDER BY ordinal_position;

-- 7. CHECK USER RELATED TABLES
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%user%' OR table_name LIKE '%customer%' OR table_name LIKE '%driver%')
ORDER BY table_name;

-- 8. CHECK TRUCK/VEHICLE RELATED TABLES
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%truck%' OR table_name LIKE '%vehicle%')
ORDER BY table_name;

-- 9. SAMPLE DATA FROM MAIN TABLES (run individually)
-- SELECT * FROM trips LIMIT 5;
-- SELECT * FROM orders LIMIT 5;
-- SELECT * FROM trip_requests LIMIT 5;
-- SELECT * FROM deliveries LIMIT 5;

-- 10. CHECK MATERIAL TYPES OR CATEGORIES
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%material%' OR table_name LIKE '%category%' OR table_name LIKE '%type%')
ORDER BY table_name;

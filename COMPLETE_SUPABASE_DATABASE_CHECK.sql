-- COMPLETE SUPABASE DATABASE EXAMINATION
-- Run these queries one by one in your Supabase SQL Editor

-- 1. CHECK ALL TABLES IN PUBLIC SCHEMA
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. CHECK ALL TABLES IN AUTH SCHEMA (private/system tables)
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'auth' 
ORDER BY table_name;

-- 3. CHECK ALL SCHEMAS AVAILABLE
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
ORDER BY schema_name;

-- 4. CHECK ALL TABLES IN ALL CUSTOM SCHEMAS
SELECT table_schema, table_name, table_type 
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
ORDER BY table_schema, table_name;

-- 5. DETAILED STRUCTURE OF MATERIALS TABLE
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'materials'
ORDER BY ordinal_position;

-- 6. DETAILED STRUCTURE OF TRUCK_TYPES TABLE
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'truck_types'
ORDER BY ordinal_position;

-- 7. DETAILED STRUCTURE OF DOCUMENT_TYPES_REFERENCE TABLE
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'document_types_reference'
ORDER BY ordinal_position;

-- 8. CHECK FOR TRIP/ORDER RELATED TABLES (broader search)
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%trip%' 
   OR table_name ILIKE '%order%' 
   OR table_name ILIKE '%delivery%' 
   OR table_name ILIKE '%request%'
   OR table_name ILIKE '%booking%'
   OR table_name ILIKE '%service%'
ORDER BY table_schema, table_name;

-- 9. CHECK FOR USER/CUSTOMER/DRIVER TABLES
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%user%' 
   OR table_name ILIKE '%customer%' 
   OR table_name ILIKE '%driver%'
   OR table_name ILIKE '%profile%'
ORDER BY table_schema, table_name;

-- 10. SAMPLE DATA FROM MATERIALS TABLE
SELECT * FROM materials LIMIT 10;

-- 11. SAMPLE DATA FROM TRUCK_TYPES TABLE
SELECT * FROM truck_types LIMIT 10;

-- 12. SAMPLE DATA FROM DOCUMENT_TYPES_REFERENCE TABLE
SELECT * FROM document_types_reference LIMIT 10;

-- 13. CHECK AUTH.USERS TABLE STRUCTURE (Supabase auth users)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 14. CHECK IF THERE ARE CUSTOM USER PROFILES
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%profile%' 
   OR table_name ILIKE '%customer%'
   OR table_name ILIKE '%user_data%'
ORDER BY table_schema, table_name;

-- 15. SEARCH FOR ANY TABLE WITH LOCATION/ADDRESS FIELDS
SELECT DISTINCT table_schema, table_name
FROM information_schema.columns 
WHERE column_name ILIKE '%location%' 
   OR column_name ILIKE '%address%'
   OR column_name ILIKE '%latitude%'
   OR column_name ILIKE '%longitude%'
ORDER BY table_schema, table_name;

-- 16. SEARCH FOR ANY TABLE WITH STATUS/STATE FIELDS (for tracking orders)
SELECT DISTINCT table_schema, table_name
FROM information_schema.columns 
WHERE column_name ILIKE '%status%' 
   OR column_name ILIKE '%state%'
ORDER BY table_schema, table_name;

-- 17. SEARCH FOR ANY TABLE WITH PRICE/AMOUNT FIELDS
SELECT DISTINCT table_schema, table_name
FROM information_schema.columns 
WHERE column_name ILIKE '%price%' 
   OR column_name ILIKE '%amount%'
   OR column_name ILIKE '%cost%'
ORDER BY table_schema, table_name;

-- 18. GET ROW COUNTS FOR ALL TABLES (CORRECTED)
SELECT 
    schemaname,
    relname as tablename,
    n_tup_ins as "Total Rows"
FROM pg_stat_user_tables 
ORDER BY schemaname, relname;

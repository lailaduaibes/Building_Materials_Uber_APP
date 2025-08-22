-- PRIORITY QUERIES - RUN THESE FIRST
-- Copy and paste each query individually into Supabase SQL Editor

-- QUERY 1: All tables in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- QUERY 2: Materials table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'materials'
ORDER BY ordinal_position;

-- QUERY 3: Truck types table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'truck_types'
ORDER BY ordinal_position;

-- QUERY 4: Sample data from materials
SELECT * FROM materials LIMIT 10;

-- QUERY 5: Sample data from truck_types
SELECT * FROM truck_types LIMIT 10;

-- QUERY 6: Find trip/order tables
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%trip%' 
   OR table_name ILIKE '%order%' 
   OR table_name ILIKE '%delivery%' 
   OR table_name ILIKE '%request%'
   OR table_name ILIKE '%booking%'
ORDER BY table_schema, table_name;

-- QUERY 7: Find user/profile tables
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name ILIKE '%user%' 
   OR table_name ILIKE '%customer%' 
   OR table_name ILIKE '%driver%'
   OR table_name ILIKE '%profile%'
ORDER BY table_schema, table_name;

-- QUERY 8: Find tables with location data
SELECT DISTINCT table_schema, table_name
FROM information_schema.columns 
WHERE column_name ILIKE '%location%' 
   OR column_name ILIKE '%address%'
   OR column_name ILIKE '%latitude%'
   OR column_name ILIKE '%longitude%'
ORDER BY table_schema, table_name;

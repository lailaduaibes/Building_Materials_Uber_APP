-- DIAGNOSIS: Check the foreign key constraint causing the error
-- Run this to understand the table relationships

-- 1. Check trucks table foreign key constraints
SELECT 
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
  AND tc.table_name='trucks'
  AND kcu.column_name = 'current_driver_id';

-- 2. Check what tables exist for driver references
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%driver%' 
  AND table_schema = 'public';

-- 3. Check if driver_profiles has the right ID column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
  AND column_name LIKE '%id%';

-- 4. Check current trucks table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trucks' 
  AND column_name LIKE '%driver%';

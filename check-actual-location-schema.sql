-- 🔍 CHECK: What location columns actually exist in your database

-- Check auth.users table structure
SELECT 
    '=== AUTH.USERS TABLE COLUMNS ===' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name LIKE '%lat%' OR column_name LIKE '%lng%' OR column_name LIKE '%location%'
ORDER BY column_name;

-- Check public.users table structure (if it exists)
SELECT 
    '=== PUBLIC.USERS TABLE COLUMNS ===' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND (column_name LIKE '%lat%' OR column_name LIKE '%lng%' OR column_name LIKE '%location%')
ORDER BY column_name;

-- Check driver_profiles table for location columns
SELECT 
    '=== DRIVER_PROFILES LOCATION COLUMNS ===' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'driver_profiles'
AND (column_name LIKE '%lat%' OR column_name LIKE '%lng%' OR column_name LIKE '%location%' OR column_name LIKE '%current%')
ORDER BY column_name;

-- Show all columns in users table to see the full structure
SELECT 
    '=== ALL AUTH.USERS COLUMNS ===' as section,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if there's a separate location table
SELECT 
    '=== LOCATION-RELATED TABLES ===' as section,
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema IN ('public', 'auth')
AND (table_name LIKE '%location%' OR table_name LIKE '%position%' OR table_name LIKE '%track%')
ORDER BY table_name;

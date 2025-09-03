-- Check the existing notifications table structure
-- This will show us what fields are already available for push notifications

-- 1. Get all columns in notifications table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any constraints on the notifications table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'notifications' 
    AND tc.table_schema = 'public';

-- 3. Show sample data to understand the actual structure
SELECT *
FROM notifications 
LIMIT 5;

-- 4. Check what notification types exist
SELECT 
    type,
    COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;

-- 5. Check if there are any push token related fields
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
    AND (column_name LIKE '%push%' OR column_name LIKE '%token%' OR column_name LIKE '%device%')
ORDER BY column_name;

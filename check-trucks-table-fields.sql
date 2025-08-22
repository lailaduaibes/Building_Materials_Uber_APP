-- CHECK TRUCKS TABLE FIELDS STRUCTURE
-- This will show us the exact field definitions and constraints

-- 1. Get complete trucks table structure
SELECT 
    'TRUCKS_TABLE_STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'trucks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Get all constraints on trucks table
SELECT 
    'TRUCKS_CONSTRAINTS' as info,
    constraint_name,
    constraint_type,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'trucks' 
AND tc.table_schema = 'public';

-- 3. Check if current_driver_id field exists and its exact definition
SELECT 
    'CURRENT_DRIVER_ID_FIELD' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trucks' 
AND column_name = 'current_driver_id';

-- 4. Check if there are any CHECK constraints that might be failing
SELECT 
    'CHECK_CONSTRAINTS' as info,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'trucks'
);

-- 5. Check data types of related fields
SELECT 
    'DATA_TYPE_COMPARISON' as info,
    'trucks.current_driver_id' as field,
    (SELECT data_type FROM information_schema.columns WHERE table_name = 'trucks' AND column_name = 'current_driver_id') as trucks_type,
    'users.id' as related_field,
    (SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') as users_type;

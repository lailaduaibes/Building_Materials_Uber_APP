-- SQL queries to check current database structure for truck recommendation system

-- 1. Check truck types table structure and data
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'truck_types' 
ORDER BY ordinal_position;

-- 2. Check current truck types data
SELECT * FROM truck_types ORDER BY name;

-- 3. Check materials table structure (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'materials' 
ORDER BY ordinal_position;

-- 4. Check materials data (if exists)
SELECT * FROM materials LIMIT 10;

-- 5. Check trip requests table to see what data we collect
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
ORDER BY ordinal_position;

-- 6. Check sample trip request data to understand material info structure
SELECT 
    id,
    material_type,
    estimated_weight,
    load_description,
    special_requirements,
    truck_type_id,
    created_at
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. Check if there are any existing truck-material compatibility tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%truck%' 
   OR table_name LIKE '%material%' 
   OR table_name LIKE '%compatibility%'
   OR table_name LIKE '%recommendation%';

-- 8. Check for any constraints or relationships
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name LIKE '%truck%' OR tc.table_name LIKE '%material%');

-- 9. Check truck equipment/features (if any special equipment columns exist)
SELECT 
    id,
    name,
    payload_capacity,
    volume_capacity,
    equipment_type,
    special_features
FROM truck_types;

-- 10. Check if there are weight/volume patterns in existing orders
SELECT 
    material_type,
    AVG(estimated_weight) as avg_weight,
    MIN(estimated_weight) as min_weight,
    MAX(estimated_weight) as max_weight,
    COUNT(*) as order_count
FROM trip_requests 
WHERE estimated_weight IS NOT NULL
GROUP BY material_type
ORDER BY order_count DESC;

-- 11. Check truck usage patterns
SELECT 
    tt.name as truck_name,
    tt.payload_capacity,
    tt.volume_capacity,
    COUNT(tr.id) as times_used,
    AVG(tr.estimated_weight) as avg_load_weight
FROM truck_types tt
LEFT JOIN trip_requests tr ON tt.id = tr.truck_type_id
GROUP BY tt.id, tt.name, tt.payload_capacity, tt.volume_capacity
ORDER BY times_used DESC;

-- 12. Check for any enum values for material types
SELECT 
    enumlabel as material_type
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'material_type'
);

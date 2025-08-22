-- Check current is_available status of all trucks
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.is_available,
    t.is_active,
    t.current_driver_id,
    tt.name as truck_type_name,
    t.created_at,
    t.updated_at
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
ORDER BY t.created_at DESC;

-- Summary of truck availability
SELECT 
    'AVAILABILITY SUMMARY' as summary,
    COUNT(*) as total_trucks,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_trucks,
    COUNT(CASE WHEN is_available = false THEN 1 END) as unavailable_trucks,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_trucks,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_trucks
FROM trucks;

-- Check truck types with availability counts
SELECT 
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
    COUNT(CASE WHEN t.is_available = false THEN 1 END) as unavailable_trucks
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- Check default value for is_available column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trucks' 
AND column_name = 'is_available'
AND table_schema = 'public';

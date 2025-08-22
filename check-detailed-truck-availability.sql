-- Check for NULL values and detailed truck status
SELECT 
    'NULL VALUES CHECK' as check_type,
    COUNT(*) as total_trucks,
    COUNT(CASE WHEN is_available IS NULL THEN 1 END) as null_availability,
    COUNT(CASE WHEN is_available = true THEN 1 END) as explicitly_true,
    COUNT(CASE WHEN is_available = false THEN 1 END) as explicitly_false
FROM trucks;

-- Show actual truck data with NULL handling
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    CASE 
        WHEN t.is_available IS NULL THEN 'NULL'
        WHEN t.is_available = true THEN 'TRUE' 
        WHEN t.is_available = false THEN 'FALSE'
    END as availability_status,
    CASE 
        WHEN t.is_active IS NULL THEN 'NULL'
        WHEN t.is_active = true THEN 'TRUE'
        WHEN t.is_active = false THEN 'FALSE' 
    END as active_status,
    tt.name as truck_type_name,
    t.created_at
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
ORDER BY t.created_at DESC
LIMIT 10;

-- Check what getAvailableTruckTypes() would actually return
-- This simulates the exact query from the TripService
SELECT DISTINCT
    tt.id,
    tt.name,
    tt.description,
    tt.payload_capacity,
    tt.volume_capacity,
    COUNT(t.id) as matching_trucks
FROM truck_types tt
INNER JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true 
AND t.is_available = true
GROUP BY tt.id, tt.name, tt.description, tt.payload_capacity, tt.volume_capacity
ORDER BY tt.name;

-- Compare with getTruckTypes() - all active truck types
SELECT 
    tt.id,
    tt.name,
    tt.description,
    tt.payload_capacity,
    tt.volume_capacity,
    COUNT(t.id) as total_trucks_of_this_type,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks_of_this_type
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name, tt.description, tt.payload_capacity, tt.volume_capacity
ORDER BY tt.name;

-- CHECK CURRENT TRUCKS AND THEIR RELATIONSHIP TO TRUCK TYPES
-- This shows your actual vehicle fleet vs available truck types

-- 1. Check truck types (vehicle categories) available for customer selection
SELECT 
    tt.id,
    tt.name as truck_type,
    tt.description,
    tt.payload_capacity,
    tt.volume_capacity,
    tt.suitable_materials,
    tt.base_rate_per_km,
    tt.base_rate_per_hour
FROM truck_types tt
ORDER BY tt.payload_capacity;

-- 2. Check actual trucks in your fleet
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.color,
    t.max_payload,
    t.max_volume,
    t.is_available,
    t.is_active,
    tt.name as truck_type,
    CASE 
        WHEN t.current_driver_id IS NOT NULL THEN 'Assigned'
        ELSE 'Unassigned'
    END as driver_status
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
ORDER BY tt.name, t.license_plate;

-- 3. Fleet summary by truck type
SELECT 
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true AND t.is_active = true THEN 1 END) as available_trucks,
    COUNT(CASE WHEN t.current_driver_id IS NOT NULL THEN 1 END) as trucks_with_drivers
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
GROUP BY tt.id, tt.name
ORDER BY total_trucks DESC;

-- 4. Available trucks for delivery right now
SELECT 
    t.id,
    t.license_plate,
    t.make || ' ' || t.model as vehicle,
    tt.name as truck_type,
    t.max_payload as capacity_tons,
    t.max_volume as capacity_m3,
    t.current_address,
    CASE 
        WHEN t.current_driver_id IS NOT NULL THEN 'Has Driver'
        ELSE 'Needs Driver'
    END as driver_status
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.is_available = true 
  AND t.is_active = true
ORDER BY tt.payload_capacity;

-- 5. Check if you have trucks for each truck type
SELECT 
    tt.name as truck_type_category,
    tt.payload_capacity as type_capacity,
    COALESCE(truck_count.total, 0) as physical_trucks_count,
    CASE 
        WHEN COALESCE(truck_count.total, 0) = 0 THEN 'NO TRUCKS AVAILABLE'
        WHEN COALESCE(truck_count.available, 0) = 0 THEN 'TRUCKS EXIST BUT NONE AVAILABLE'
        ELSE 'TRUCKS AVAILABLE'
    END as availability_status
FROM truck_types tt
LEFT JOIN (
    SELECT 
        truck_type_id,
        COUNT(*) as total,
        COUNT(CASE WHEN is_available = true AND is_active = true THEN 1 END) as available
    FROM trucks 
    GROUP BY truck_type_id
) truck_count ON tt.id = truck_count.truck_type_id
ORDER BY tt.payload_capacity;

-- 6. Potential issues with truck-driver assignments
SELECT 
    'Trucks without drivers' as issue_type,
    COUNT(*) as count
FROM trucks 
WHERE is_available = true 
  AND is_active = true 
  AND current_driver_id IS NULL

UNION ALL

SELECT 
    'Truck types with no physical trucks' as issue_type,
    COUNT(*) as count
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE t.id IS NULL

UNION ALL

SELECT 
    'Inactive trucks' as issue_type,
    COUNT(*) as count
FROM trucks 
WHERE is_active = false;

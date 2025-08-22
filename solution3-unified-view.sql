-- SOLUTION 3: Create a view that combines company fleet + driver vehicles
-- This gives you a unified view without changing existing data

CREATE OR REPLACE VIEW available_truck_capacity AS
SELECT 
  tt.id as truck_type_id,
  tt.name as truck_type_name,
  tt.description,
  tt.payload_capacity,
  tt.volume_capacity,
  tt.suitable_materials,
  tt.base_rate_per_km,
  tt.base_rate_per_hour,
  -- Company fleet count
  COALESCE(fleet.count, 0) as company_fleet_available,
  -- Driver vehicles count (mapped to truck types)
  COALESCE(drivers.count, 0) as driver_vehicles_available,
  -- Total availability
  COALESCE(fleet.count, 0) + COALESCE(drivers.count, 0) as total_capacity,
  -- Availability status
  CASE 
    WHEN COALESCE(fleet.count, 0) + COALESCE(drivers.count, 0) > 0 
    THEN true 
    ELSE false 
  END as has_capacity
FROM truck_types tt
LEFT JOIN (
  -- Company fleet trucks
  SELECT 
    truck_type_id,
    COUNT(*) as count
  FROM trucks 
  WHERE is_available = true AND is_active = true
  GROUP BY truck_type_id
) fleet ON tt.id = fleet.truck_type_id
LEFT JOIN (
  -- Driver vehicles mapped to truck types
  SELECT 
    CASE 
      WHEN LOWER(vehicle_model) LIKE '%hiace%' OR LOWER(vehicle_model) LIKE '%transit%' OR LOWER(vehicle_model) LIKE '%van%'
      THEN (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1)
      WHEN LOWER(vehicle_model) LIKE '%flatbed%' OR LOWER(vehicle_model) LIKE '%npr%'
      THEN (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1)
      WHEN LOWER(vehicle_model) LIKE '%mixer%' OR LOWER(vehicle_model) LIKE '%concrete%'
      THEN (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1)
      WHEN LOWER(vehicle_model) LIKE '%dump%' OR LOWER(vehicle_model) LIKE '%tipper%'
      THEN (SELECT id FROM truck_types WHERE name = 'Dump Truck' LIMIT 1)
      ELSE (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1)
    END as truck_type_id,
    COUNT(*) as count
  FROM driver_profiles 
  WHERE is_approved = true 
    AND is_available = true
    AND vehicle_plate IS NOT NULL 
    AND vehicle_plate != 'TBD'
    AND vehicle_plate != ''
  GROUP BY truck_type_id
) drivers ON tt.id = drivers.truck_type_id
WHERE tt.is_active = true;

-- Test the view
SELECT * FROM available_truck_capacity ORDER BY truck_type_name;

-- SOLUTION 1: Update truck availability to include approved driver vehicles
-- This shows truck types that have either company trucks OR approved driver vehicles

-- New query to get REAL truck availability (company + driver vehicles)
SELECT 
  tt.id,
  tt.name as truck_type_name,
  tt.description,
  tt.payload_capacity,
  tt.volume_capacity,
  tt.suitable_materials,
  -- Count company fleet trucks
  COALESCE(company_trucks.available_count, 0) as company_fleet_count,
  -- Count approved driver vehicles (we'll need to map these to truck types)
  COALESCE(driver_vehicles.available_count, 0) as driver_vehicle_count,
  -- Total availability
  COALESCE(company_trucks.available_count, 0) + COALESCE(driver_vehicles.available_count, 0) as total_available,
  -- Status
  CASE 
    WHEN COALESCE(company_trucks.available_count, 0) + COALESCE(driver_vehicles.available_count, 0) > 0 
    THEN 'AVAILABLE' 
    ELSE 'NO TRUCKS AVAILABLE' 
  END as availability_status
FROM truck_types tt
LEFT JOIN (
  -- Company fleet trucks
  SELECT 
    truck_type_id,
    COUNT(*) as available_count
  FROM trucks 
  WHERE is_available = true AND is_active = true
  GROUP BY truck_type_id
) company_trucks ON tt.id = company_trucks.truck_type_id
LEFT JOIN (
  -- Driver vehicles (need to map vehicle models to truck types)
  SELECT 
    -- This is a simplified mapping - you'd need proper logic
    CASE 
      WHEN LOWER(vehicle_model) LIKE '%hiace%' OR LOWER(vehicle_model) LIKE '%transit%' 
      THEN (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1)
      WHEN LOWER(vehicle_model) LIKE '%flatbed%' OR LOWER(vehicle_model) LIKE '%npr%'
      THEN (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1)
      WHEN LOWER(vehicle_model) LIKE '%mixer%' OR LOWER(vehicle_model) LIKE '%concrete%'
      THEN (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1)
      -- Add more mappings as needed
      ELSE (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1) -- Default
    END as truck_type_id,
    COUNT(*) as available_count
  FROM driver_profiles 
  WHERE is_approved = true 
    AND is_available = true
    AND vehicle_plate IS NOT NULL 
    AND vehicle_plate != 'TBD'
  GROUP BY truck_type_id
) driver_vehicles ON tt.id = driver_vehicles.truck_type_id
WHERE tt.is_active = true
ORDER BY tt.name;

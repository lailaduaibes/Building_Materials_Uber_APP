-- SOLUTION 2: Automatically create truck entries when drivers are approved
-- This syncs driver vehicles to the trucks table

-- Step 1: Create a function to map driver vehicle models to truck types
CREATE OR REPLACE FUNCTION map_vehicle_to_truck_type(vehicle_model TEXT)
RETURNS UUID AS $$
BEGIN
  -- Map vehicle models to truck type IDs
  CASE 
    WHEN LOWER(vehicle_model) LIKE '%hiace%' OR LOWER(vehicle_model) LIKE '%transit%' OR LOWER(vehicle_model) LIKE '%van%'
    THEN RETURN (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
    
    WHEN LOWER(vehicle_model) LIKE '%flatbed%' OR LOWER(vehicle_model) LIKE '%npr%' OR LOWER(vehicle_model) LIKE '%isuzu%'
    THEN RETURN (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1);
    
    WHEN LOWER(vehicle_model) LIKE '%mixer%' OR LOWER(vehicle_model) LIKE '%concrete%'
    THEN RETURN (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1);
    
    WHEN LOWER(vehicle_model) LIKE '%dump%' OR LOWER(vehicle_model) LIKE '%tipper%'
    THEN RETURN (SELECT id FROM truck_types WHERE name = 'Dump Truck' LIMIT 1);
    
    -- Default to Small Truck for unknown models
    ELSE RETURN (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create truck entries for all approved drivers who don't have trucks yet
INSERT INTO trucks (
  truck_type_id,
  license_plate,
  make,
  model,
  year,
  max_payload,
  max_volume,
  current_driver_id,
  is_available,
  is_active
)
SELECT 
  map_vehicle_to_truck_type(dp.vehicle_model) as truck_type_id,
  dp.vehicle_plate as license_plate,
  -- Extract make from vehicle_model (first word)
  COALESCE(SPLIT_PART(dp.vehicle_model, ' ', 1), 'Unknown') as make,
  -- Extract model from vehicle_model (rest of the string)
  COALESCE(SUBSTRING(dp.vehicle_model FROM POSITION(' ' IN dp.vehicle_model) + 1), dp.vehicle_model) as model,
  dp.vehicle_year as year,
  -- Set default capacities based on truck type (you can refine this)
  CASE 
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1) THEN 2.5
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1) THEN 10.0
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1) THEN 12.0
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Dump Truck' LIMIT 1) THEN 15.0
    ELSE 5.0
  END as max_payload,
  CASE 
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1) THEN 8.0
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1) THEN 15.0
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1) THEN 6.0
    WHEN map_vehicle_to_truck_type(dp.vehicle_model) = (SELECT id FROM truck_types WHERE name = 'Dump Truck' LIMIT 1) THEN 10.0
    ELSE 8.0
  END as max_volume,
  dp.id as current_driver_id,
  dp.is_available as is_available,
  true as is_active
FROM driver_profiles dp
WHERE dp.is_approved = true
  AND dp.vehicle_plate IS NOT NULL 
  AND dp.vehicle_plate != 'TBD'
  AND dp.vehicle_plate != ''
  -- Only insert if truck doesn't already exist
  AND NOT EXISTS (
    SELECT 1 FROM trucks t 
    WHERE t.license_plate = dp.vehicle_plate
  );

-- Step 3: Verify the results
SELECT 
  tt.name as truck_type_name,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available THEN 1 END) as available_trucks,
  COUNT(CASE WHEN t.current_driver_id IS NOT NULL THEN 1 END) as driver_owned_trucks,
  COUNT(CASE WHEN t.current_driver_id IS NULL THEN 1 END) as company_fleet_trucks
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

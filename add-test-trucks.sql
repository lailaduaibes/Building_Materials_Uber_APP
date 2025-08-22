-- Add test trucks to verify the filtering system works
-- Execute this SQL directly in your Supabase SQL editor

-- First, let's see what truck types we have
SELECT id, name, description FROM truck_types WHERE is_active = true ORDER BY name;

-- Add test trucks for different types
-- Small Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available)
VALUES (
  (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1),
  'ST-001',
  'Toyota',
  'Hiace',
  2020,
  2.5,
  8.0,
  true
);

-- Flatbed Truck (another one since you already have one)
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available)
VALUES (
  (SELECT id FROM truck_types WHERE name = 'Flatbed Truck' LIMIT 1),
  'FB-002',
  'Isuzu',
  'NPR',
  2021,
  10.0,
  15.0,
  true
);

-- Concrete Mixer
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available)
VALUES (
  (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1),
  'CM-001',
  'Volvo',
  'FMX',
  2019,
  12.0,
  6.0,
  true
);

-- Now check the results
SELECT 
  tt.name as truck_type_name,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available THEN 1 END) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available THEN 1 END) > 0 THEN 'AVAILABLE' 
    ELSE 'NO TRUCKS AVAILABLE' 
  END as status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- ADD SAMPLE TRUCKS TO YOUR FLEET
-- This creates a realistic truck fleet for testing and operations

-- Get truck type IDs first
WITH truck_type_ids AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (ORDER BY payload_capacity) as rn
  FROM truck_types
)

-- Insert sample trucks for each type
INSERT INTO trucks (
  license_plate, 
  make, 
  model, 
  year, 
  color, 
  max_payload, 
  max_volume, 
  truck_type_id,
  is_available,
  is_active,
  current_address
)
SELECT 
  CASE 
    WHEN tt.name = 'Small Truck' THEN 'STK-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0')
    WHEN tt.name = 'Box Truck' THEN 'BOX-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0') 
    WHEN tt.name = 'Crane Truck' THEN 'CRN-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0')
    WHEN tt.name = 'Flatbed Truck' THEN 'FLT-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0')
    WHEN tt.name = 'Dump Truck' THEN 'DMP-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0')
  END as license_plate,
  CASE 
    WHEN tt.name = 'Small Truck' THEN 'Toyota'
    WHEN tt.name = 'Box Truck' THEN 'Isuzu' 
    WHEN tt.name = 'Crane Truck' THEN 'Volvo'
    WHEN tt.name = 'Flatbed Truck' THEN 'Mercedes'
    WHEN tt.name = 'Dump Truck' THEN 'Scania'
  END as make,
  CASE 
    WHEN tt.name = 'Small Truck' THEN 'Hiace'
    WHEN tt.name = 'Box Truck' THEN 'NPR 200' 
    WHEN tt.name = 'Crane Truck' THEN 'FH16'
    WHEN tt.name = 'Flatbed Truck' THEN 'Actros'
    WHEN tt.name = 'Dump Truck' THEN 'P-Series'
  END as model,
  2020 + (RANDOM() * 4)::int as year,
  CASE (RANDOM() * 4)::int
    WHEN 0 THEN 'White'
    WHEN 1 THEN 'Blue'
    WHEN 2 THEN 'Red'
    ELSE 'Yellow'
  END as color,
  tt.payload_capacity,
  tt.volume_capacity,
  tt.id as truck_type_id,
  true as is_available,
  true as is_active,
  'Riyadh Central Depot' as current_address
FROM truck_types tt
CROSS JOIN generate_series(1, 2) -- Create 2 trucks per type
WHERE tt.name != 'Flatbed Truck' -- Skip flatbed since you already have one

UNION ALL

-- Add one more Flatbed truck to have multiple
SELECT 
  'FLT-0002',
  'Volvo',
  'FH',
  2021,
  'Blue',
  tt.payload_capacity,
  tt.volume_capacity,
  tt.id,
  true,
  true,
  'Riyadh North Depot'
FROM truck_types tt 
WHERE tt.name = 'Flatbed Truck';

-- Verify the new fleet
SELECT 
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
GROUP BY tt.name
ORDER BY tt.payload_capacity;

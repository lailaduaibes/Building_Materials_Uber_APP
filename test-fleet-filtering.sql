-- Quick fleet management test - adds a few trucks to verify filtering works
-- This adds minimal trucks to test the availability filtering system

-- Add one Small Truck
INSERT INTO trucks (truck_type_id, license_plate, driver_id, model, year, is_available)
VALUES (
  (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1),
  'ST-TEST1',
  NULL,
  'Toyota Hiace',
  2020,
  true
) ON CONFLICT (license_plate) DO NOTHING;

-- Add one Concrete Mixer (to test specialized recommendations)
INSERT INTO trucks (truck_type_id, license_plate, driver_id, model, year, is_available)
VALUES (
  (SELECT id FROM truck_types WHERE name = 'Concrete Mixer' LIMIT 1),
  'CM-TEST1', 
  NULL,
  'Volvo Mixer',
  2019,
  true
) ON CONFLICT (license_plate) DO NOTHING;

-- Verify our test trucks
SELECT 
  tt.name as truck_type_name,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available THEN 1 END) as available_trucks
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

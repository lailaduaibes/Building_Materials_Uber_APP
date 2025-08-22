-- COMPREHENSIVE TRUCK TYPES FOR BUILDING MATERIALS DELIVERY
-- Add missing truck types to expand your delivery capabilities

INSERT INTO public.truck_types (name, description, payload_capacity, volume_capacity, suitable_materials, base_rate_per_km, base_rate_per_hour) VALUES

-- Light Delivery Vehicles
('Pickup Truck', 'Light utility vehicle for small loads', 1.0, 3.0, '["Tools", "Hardware", "Small Parts"]', 1.50, 30.00),
('Panel Van', 'Enclosed van for package delivery', 1.5, 6.0, '["Hardware", "Tools", "Electrical Components"]', 2.00, 35.00),

-- Medium Delivery Trucks  
('Curtainside Truck', 'Flexible loading truck with removable sides', 7.0, 25.0, '["Lumber", "Panels", "Roofing Materials"]', 3.00, 60.00),
('Refrigerated Truck', 'Temperature-controlled transport', 6.0, 18.0, '["Adhesives", "Sealants", "Temperature-Sensitive Materials"]', 4.00, 80.00),

-- Specialized Construction Trucks
('Concrete Mixer', 'Mobile concrete mixing and delivery', 12.0, 9.0, '["Ready-Mix Concrete", "Mortar"]', 4.50, 100.00),
('Pump Truck', 'Concrete pump with placement boom', 10.0, 8.0, '["Concrete", "Grout", "Liquid Materials"]', 6.00, 150.00),
('Tipper Truck', 'Small dump truck for loose materials', 8.0, 6.0, '["Sand", "Gravel", "Aggregate", "Soil"]', 2.80, 55.00),

-- Heavy Duty Trucks
('Heavy Duty Flatbed', 'Large flatbed for heavy construction materials', 25.0, 30.0, '["Steel Beams", "Precast Concrete", "Heavy Equipment"]', 5.50, 130.00),
('Low Loader', 'Low-profile trailer for heavy machinery', 30.0, 25.0, '["Excavators", "Bulldozers", "Heavy Machinery"]', 7.00, 180.00),
('Articulated Truck', 'Semi-trailer for long-distance heavy loads', 35.0, 40.0, '["Bulk Materials", "Large Equipment", "Long Distance"]', 4.00, 120.00),

-- Specialized Equipment Trucks
('Hiab Truck', 'Truck-mounted crane for loading/unloading', 12.0, 16.0, '["Steel", "Pipes", "Heavy Materials"]', 4.50, 110.00),
('Car Carrier', 'Multi-level trailer for vehicle transport', 15.0, 35.0, '["Vehicles", "Heavy Machinery", "Equipment"]', 4.00, 90.00),

-- Utility and Service Trucks
('Service Van', 'Mobile workshop for on-site services', 2.0, 8.0, '["Tools", "Parts", "Maintenance Equipment"]', 2.50, 45.00),
('Waste Collection', 'Truck for construction waste removal', 20.0, 22.0, '["Construction Waste", "Debris", "Recyclables"]', 3.50, 70.00)

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  payload_capacity = EXCLUDED.payload_capacity,
  volume_capacity = EXCLUDED.volume_capacity,
  suitable_materials = EXCLUDED.suitable_materials,
  base_rate_per_km = EXCLUDED.base_rate_per_km,
  base_rate_per_hour = EXCLUDED.base_rate_per_hour;

-- Update existing trucks to be more comprehensive
UPDATE public.truck_types SET 
  suitable_materials = '["Hardware", "Tools", "Small Parts", "Electrical Components"]'
WHERE name = 'Small Truck';

UPDATE public.truck_types SET 
  suitable_materials = '["Steel", "Lumber", "Concrete Blocks", "Pipes", "Structural Materials"]'
WHERE name = 'Flatbed Truck';

UPDATE public.truck_types SET 
  suitable_materials = '["Sand", "Gravel", "Crushed Stone", "Soil", "Aggregate", "Loose Materials"]'
WHERE name = 'Dump Truck';

UPDATE public.truck_types SET 
  suitable_materials = '["Steel Beams", "Precast Concrete", "Heavy Machinery", "Large Pipes"]'
WHERE name = 'Crane Truck';

UPDATE public.truck_types SET 
  suitable_materials = '["Insulation", "Drywall", "Paint", "Hardware", "Packaged Materials"]'
WHERE name = 'Box Truck';

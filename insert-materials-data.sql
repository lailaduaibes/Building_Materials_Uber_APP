-- Step 2: Insert sample materials data
INSERT INTO materials (name, description, category, unit, price_per_unit, stock_quantity, is_available) VALUES
('Portland Cement', 'High-quality Portland cement for construction', 'Cement', 'kg', 0.15, 10000, true),
('Sand', 'Fine construction sand', 'Aggregates', 'm3', 25.00, 500, true),
('Gravel', 'Construction grade gravel', 'Aggregates', 'm3', 30.00, 300, true),
('Concrete Blocks', 'Standard concrete blocks', 'Blocks', 'pieces', 2.50, 2000, true),
('Steel Rebar', '12mm steel reinforcement bars', 'Steel', 'kg', 0.80, 5000, true),
('Roof Tiles', 'Clay roof tiles', 'Roofing', 'pieces', 3.00, 1500, true),
('Bricks', 'Red clay bricks', 'Blocks', 'pieces', 0.45, 8000, true),
('Plywood', '18mm construction plywood', 'Wood', 'pieces', 35.00, 200, true),
('Paint', 'Exterior wall paint', 'Paint', 'liters', 12.00, 100, true),
('Insulation', 'Thermal insulation material', 'Insulation', 'm2', 8.50, 400, true),
('Nails', 'Construction nails assorted sizes', 'Hardware', 'kg', 3.50, 800, true),
('Screws', 'Wood screws assorted sizes', 'Hardware', 'kg', 4.20, 600, true),
('Wire Mesh', 'Reinforcement wire mesh', 'Steel', 'm2', 12.00, 250, true),
('Mortar Mix', 'Ready-mix mortar for masonry', 'Cement', 'kg', 0.18, 5000, true),
('Pipes - PVC', '50mm PVC pipes', 'Plumbing', 'meters', 8.50, 1000, true);

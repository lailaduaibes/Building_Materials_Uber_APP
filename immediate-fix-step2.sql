-- =============================================================================
-- IMMEDIATE FIX - STEP 2: Insert Sample Materials Data
-- =============================================================================
-- Run this AFTER Step 1 completes successfully

INSERT INTO materials (name, description, category, unit, price_per_unit, stock_quantity, is_available) VALUES
-- Cement Products
('Portland Cement', 'High-quality Portland cement for construction', 'Cement', 'kg', 0.15, 10000, true),
('Mortar Mix', 'Ready-mix mortar for masonry work', 'Cement', 'kg', 0.18, 5000, true),
('Concrete Mix', 'Pre-mixed concrete for foundations', 'Cement', 'kg', 0.20, 8000, true),

-- Aggregates
('Sand', 'Fine construction sand', 'Aggregates', 'm3', 25.00, 500, true),
('Gravel', 'Construction grade gravel', 'Aggregates', 'm3', 30.00, 300, true),
('Crushed Stone', 'Crushed stone for road base', 'Aggregates', 'm3', 28.00, 400, true),

-- Blocks & Masonry
('Concrete Blocks', 'Standard concrete blocks 8x8x16', 'Blocks', 'pieces', 2.50, 2000, true),
('Bricks', 'Red clay bricks for construction', 'Blocks', 'pieces', 0.45, 8000, true),
('Cinder Blocks', 'Lightweight cinder blocks', 'Blocks', 'pieces', 2.25, 1500, true),

-- Steel Products
('Steel Rebar', '12mm steel reinforcement bars', 'Steel', 'kg', 0.80, 5000, true),
('Wire Mesh', 'Reinforcement wire mesh', 'Steel', 'm2', 12.00, 250, true),
('Steel Beams', 'Structural steel I-beams', 'Steel', 'pieces', 150.00, 50, true),

-- Roofing Materials
('Roof Tiles', 'Clay roof tiles', 'Roofing', 'pieces', 3.00, 1500, true),
('Asphalt Shingles', 'Waterproof asphalt shingles', 'Roofing', 'm2', 15.00, 800, true),
('Metal Roofing', 'Corrugated metal roofing sheets', 'Roofing', 'm2', 25.00, 400, true),

-- Wood Products
('Plywood', '18mm construction plywood', 'Wood', 'pieces', 35.00, 200, true),
('Lumber 2x4', 'Pressure treated lumber 2x4', 'Wood', 'pieces', 8.50, 1000, true),
('Lumber 2x6', 'Pressure treated lumber 2x6', 'Wood', 'pieces', 12.50, 800, true),

-- Insulation
('Insulation', 'Thermal insulation material', 'Insulation', 'm2', 8.50, 400, true),
('Foam Board', 'Rigid foam insulation board', 'Insulation', 'm2', 12.00, 300, true),

-- Hardware
('Nails', 'Construction nails assorted sizes', 'Hardware', 'kg', 3.50, 800, true),
('Screws', 'Wood screws assorted sizes', 'Hardware', 'kg', 4.20, 600, true),
('Bolts', 'Galvanized bolts and nuts', 'Hardware', 'kg', 5.50, 400, true),

-- Plumbing
('PVC Pipes', '50mm PVC pipes for plumbing', 'Plumbing', 'meters', 8.50, 1000, true),
('Copper Pipes', '22mm copper pipes', 'Plumbing', 'meters', 15.00, 500, true),
('Pipe Fittings', 'Assorted PVC pipe fittings', 'Plumbing', 'pieces', 2.50, 2000, true),

-- Paint & Finishes
('Paint', 'Exterior wall paint', 'Paint', 'liters', 12.00, 100, true),
('Primer', 'Base coat primer', 'Paint', 'liters', 10.00, 150, true),
('Varnish', 'Wood varnish finish', 'Paint', 'liters', 18.00, 80, true);

-- Verify data was inserted
SELECT category, COUNT(*) as material_count 
FROM materials 
GROUP BY category 
ORDER BY category;

-- =============================================================================
-- IMMEDIATE FIX - STEP 3: Set Up Security Policies (Optional)
-- =============================================================================
-- Run this AFTER Step 2 completes (this is optional for testing)

-- Enable Row Level Security
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read materials (for browsing catalog)
CREATE POLICY "Public can read materials" ON materials
FOR SELECT USING (true);

-- Allow authenticated users to manage materials (for admin functions)
CREATE POLICY "Authenticated users can manage materials" ON materials
FOR ALL USING (auth.role() = 'authenticated');

-- Test the setup
SELECT 
    'Materials table created successfully!' as status,
    COUNT(*) as total_materials,
    COUNT(DISTINCT category) as categories
FROM materials;

-- Step 3: Set up security policies (optional)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read materials
CREATE POLICY "Public materials access" ON materials
FOR SELECT USING (true);

-- Allow authenticated users to manage materials
CREATE POLICY "Authenticated users can manage materials" ON materials
FOR ALL USING (auth.role() = 'authenticated');

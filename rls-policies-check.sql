-- Check RLS policies on driver_documents table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'driver_documents';

-- Check if RLS is enabled on driver_documents
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'driver_documents';

-- Test direct access to driver_documents table (this should work from SQL editor)
SELECT count(*) as total_documents
FROM driver_documents;

-- Test access for specific driver (should match our app query)
SELECT count(*) as driver_laila_documents
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb';

-- Check what the anon role can see (this is what the app uses)
SET ROLE anon;
SELECT count(*) as visible_to_anon
FROM driver_documents;
RESET ROLE;

-- If you need to disable RLS temporarily to test:
-- ALTER TABLE driver_documents DISABLE ROW LEVEL SECURITY;

-- Or create a policy to allow drivers to see their own documents:
-- CREATE POLICY "Drivers can view own documents" ON driver_documents
--   FOR SELECT USING (
--     driver_id IN (
--       SELECT id FROM driver_profiles 
--       WHERE user_id = auth.uid()
--     )
--   );

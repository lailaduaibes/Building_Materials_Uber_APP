-- Check RLS policies specifically for driver_documents table
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
-- This simulates what the app sees
SELECT 
    'Testing anon access:' as test,
    count(*) as visible_documents
FROM driver_documents;

-- Show actual documents to verify they exist
SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    status,
    uploaded_at
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
ORDER BY uploaded_at DESC;

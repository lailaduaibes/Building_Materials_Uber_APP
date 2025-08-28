-- Check Supabase Storage bucket configuration and policies
-- This will help identify why files exist but return empty content

-- 1. Check if the storage bucket exists and its configuration
SELECT 
    name,
    id,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE name = 'driver-documents';

-- 2. Check storage bucket policies for public access
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
WHERE schemaname = 'storage' 
AND tablename IN ('objects', 'buckets');

-- 3. Check if there are any RLS policies blocking access to storage
SELECT 
    table_name,
    policy_name,
    command_type,
    permissive,
    definition
FROM information_schema.table_privileges tp
JOIN pg_policies pp ON tp.table_name = pp.tablename
WHERE tp.table_schema = 'storage'
AND tp.table_name = 'objects';

-- 4. Check actual files in storage.objects table
SELECT 
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata->'size' as file_size,
    metadata->'mimetype' as mime_type
FROM storage.objects 
WHERE bucket_id = 'driver-documents'
ORDER BY created_at DESC
LIMIT 10;

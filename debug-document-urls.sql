-- Debug: Check if documents are visible and their exact URLs
-- This will help us understand the file URL format

SELECT 
    dd.id,
    dd.driver_id,
    dd.document_type,
    dd.file_name,
    dd.file_url,
    dd.file_size,
    dd.status,
    dd.uploaded_at,
    dp.first_name,
    dp.last_name,
    dp.approval_status as driver_status
FROM driver_documents dd
JOIN driver_profiles dp ON dd.driver_id = dp.id
WHERE dp.first_name = 'Driver' AND dp.last_name = 'Laila'
ORDER BY dd.uploaded_at DESC;

-- Also check if RLS is preventing access
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'driver_documents'
AND policyname LIKE '%select%';

-- Approve any pending documents
UPDATE driver_documents 
SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = NULL
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
AND status = 'pending';

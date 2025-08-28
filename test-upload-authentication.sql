-- Test to verify if file upload issue is authentication-related
-- Check if there are authentication mismatches

-- Check current authenticated sessions
SELECT 
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at
FROM auth.users 
ORDER BY last_sign_in_at DESC NULLS LAST
LIMIT 5;

-- Check if document upload user matches storage object owner
SELECT 
    dd.id as doc_id,
    dd.driver_id,
    dd.file_name,
    dd.file_size as db_size,
    so.owner as storage_owner,
    so.metadata->'size' as storage_size,
    dd.uploaded_at as db_uploaded,
    so.created_at as storage_created,
    CASE 
        WHEN dd.file_size > 0 AND (so.metadata->'size')::int = 0 THEN 'SIZE_MISMATCH'
        WHEN dd.file_size = 0 AND (so.metadata->'size')::int = 0 THEN 'BOTH_EMPTY'
        WHEN dd.file_size > 0 AND (so.metadata->'size')::int > 0 THEN 'BOTH_OK'
        ELSE 'OTHER'
    END as status
FROM driver_documents dd
LEFT JOIN storage.objects so ON so.name = SUBSTRING(dd.file_url FROM '.*/([^/]+)$')
WHERE dd.uploaded_at >= '2025-08-20'
ORDER BY dd.uploaded_at DESC;

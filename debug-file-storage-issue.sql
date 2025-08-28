-- Check if we can fix the empty file issue by re-uploading
-- First, let's see all the files that might have this issue

SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    file_size,
    file_url,
    status,
    uploaded_at,
    CASE 
        WHEN file_size > 0 THEN 'Has Size'
        ELSE 'Empty'
    END as size_status
FROM driver_documents 
ORDER BY uploaded_at DESC;

-- Check if there's a pattern with upload dates
SELECT 
    DATE(uploaded_at) as upload_date,
    COUNT(*) as files_uploaded,
    AVG(file_size) as avg_size,
    COUNT(CASE WHEN file_size = 0 THEN 1 END) as empty_files
FROM driver_documents 
GROUP BY DATE(uploaded_at)
ORDER BY upload_date DESC;

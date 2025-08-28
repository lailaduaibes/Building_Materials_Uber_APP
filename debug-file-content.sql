-- Debug file content and URLs
SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    file_size,
    file_url,
    uploaded_at,
    LENGTH(file_url) as url_length,
    CASE 
        WHEN file_url LIKE '%http%' THEN 'Full URL'
        ELSE 'Relative path'
    END as url_type
FROM driver_documents 
WHERE driver_id IN (
    SELECT id FROM driver_profiles WHERE is_approved = true
)
ORDER BY uploaded_at DESC
LIMIT 10;

-- Check if there are any files with 0 size
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN file_size = 0 THEN 1 END) as zero_size_files,
    COUNT(CASE WHEN file_size > 0 THEN 1 END) as valid_size_files,
    AVG(file_size) as avg_file_size
FROM driver_documents;

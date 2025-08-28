-- Quick check of document URLs and fix for testing
-- First, let's see what the file URLs look like
SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    file_url,
    status
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
LIMIT 3;

-- Now approve the documents so you can test the viewer
UPDATE driver_documents 
SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = NULL
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
AND status = 'pending';

-- Verify the update worked
SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    status,
    reviewed_at
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb';

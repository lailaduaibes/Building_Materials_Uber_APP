-- Auto-approve all documents for drivers who are already approved
-- This fixes the issue where driver approval doesn't automatically approve their documents

-- First, let's see the current status
SELECT 
    dp.id as driver_id,
    dp.first_name,
    dp.last_name,
    dp.approval_status as driver_status,
    dp.is_approved as driver_approved,
    COUNT(dd.id) as total_documents,
    COUNT(CASE WHEN dd.status = 'pending' THEN 1 END) as pending_docs,
    COUNT(CASE WHEN dd.status = 'approved' THEN 1 END) as approved_docs
FROM driver_profiles dp
LEFT JOIN driver_documents dd ON dp.id = dd.driver_id
WHERE dp.is_approved = true AND dp.approval_status = 'approved'
GROUP BY dp.id, dp.first_name, dp.last_name, dp.approval_status, dp.is_approved;

-- Now update all pending documents to approved for approved drivers
UPDATE driver_documents 
SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = NULL  -- Set to NULL since it's auto-approved by system
WHERE driver_id IN (
    SELECT id 
    FROM driver_profiles 
    WHERE is_approved = true AND approval_status = 'approved'
) 
AND status = 'pending';

-- Show the updated results
SELECT 
    dp.id as driver_id,
    dp.first_name,
    dp.last_name,
    dp.approval_status as driver_status,
    COUNT(dd.id) as total_documents,
    COUNT(CASE WHEN dd.status = 'pending' THEN 1 END) as pending_docs,
    COUNT(CASE WHEN dd.status = 'approved' THEN 1 END) as approved_docs
FROM driver_profiles dp
LEFT JOIN driver_documents dd ON dp.id = dd.driver_id
WHERE dp.id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
GROUP BY dp.id, dp.first_name, dp.last_name, dp.approval_status;

-- Verify the specific driver's documents are now approved
SELECT 
    id,
    driver_id,
    document_type,
    file_name,
    status,
    reviewed_at,
    reviewed_by,
    uploaded_at
FROM driver_documents 
WHERE driver_id = '7634d8ab-fd6a-48e5-8643-cc89ee799afb'
ORDER BY uploaded_at DESC;

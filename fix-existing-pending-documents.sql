-- One-time fix for existing approved drivers with pending documents
-- Run this once to clean up the existing data

UPDATE driver_documents 
SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = NULL  -- Auto-approved by system cleanup
WHERE driver_id IN (
    SELECT id 
    FROM driver_profiles 
    WHERE is_approved = true AND approval_status = 'approved'
) 
AND status = 'pending';

-- Verify the fix worked
SELECT 
    dp.first_name,
    dp.last_name,
    dp.approval_status,
    COUNT(dd.id) as total_documents,
    COUNT(CASE WHEN dd.status = 'pending' THEN 1 END) as pending_docs,
    COUNT(CASE WHEN dd.status = 'approved' THEN 1 END) as approved_docs
FROM driver_profiles dp
LEFT JOIN driver_documents dd ON dp.id = dd.driver_id
WHERE dp.is_approved = true
GROUP BY dp.id, dp.first_name, dp.last_name, dp.approval_status;

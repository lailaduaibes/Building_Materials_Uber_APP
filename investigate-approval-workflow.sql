-- Investigate why approved drivers still have pending documents
-- Let's trace the approval workflow to find the root cause

-- 1. Check the driver approval timeline vs document upload timeline
SELECT 
    dp.id as driver_id,
    dp.first_name,
    dp.last_name,
    dp.approval_status,
    dp.is_approved,
    dp.approved_at,
    dp.application_submitted_at,
    MIN(dd.uploaded_at) as first_document_uploaded,
    MAX(dd.uploaded_at) as last_document_uploaded,
    COUNT(dd.id) as total_documents
FROM driver_profiles dp
LEFT JOIN driver_documents dd ON dp.id = dd.driver_id
WHERE dp.is_approved = true
GROUP BY dp.id, dp.first_name, dp.last_name, dp.approval_status, dp.is_approved, dp.approved_at, dp.application_submitted_at
ORDER BY dp.approved_at DESC;

-- 2. Check if there's a trigger or function that should auto-approve documents
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('driver_profiles', 'driver_documents');

-- 3. Check if documents were uploaded AFTER driver approval
SELECT 
    dp.first_name,
    dp.last_name,
    dp.approved_at as driver_approved_at,
    dd.document_type,
    dd.uploaded_at as document_uploaded_at,
    dd.status,
    CASE 
        WHEN dd.uploaded_at > dp.approved_at THEN 'UPLOADED AFTER APPROVAL'
        WHEN dd.uploaded_at < dp.approved_at THEN 'UPLOADED BEFORE APPROVAL'
        ELSE 'SAME TIME'
    END as timing_analysis
FROM driver_profiles dp
JOIN driver_documents dd ON dp.id = dd.driver_id
WHERE dp.is_approved = true
ORDER BY dp.first_name, dd.uploaded_at;

-- 4. Check if there are any admin actions or approval logs
SELECT 
    tablename,
    schemaname,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename LIKE '%approval%' OR tablename LIKE '%log%' OR tablename LIKE '%audit%';

-- 5. Look for any stored procedures or functions related to approval
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition ILIKE '%approval%' OR routine_definition ILIKE '%document%';

-- Fix the root cause: Add auto-document approval when driver is approved
-- This trigger will automatically approve all pending documents when a driver gets approved

-- Create the function to auto-approve documents
CREATE OR REPLACE FUNCTION auto_approve_driver_documents()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run when driver approval status changes TO approved
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status 
       AND NEW.approval_status = 'approved' 
       AND NEW.is_approved = true THEN
        
        -- Auto-approve all pending documents for this driver
        UPDATE driver_documents 
        SET 
            status = 'approved',
            reviewed_at = NOW(),
            reviewed_by = NEW.approved_by  -- Use the same admin who approved the driver
        WHERE driver_id = NEW.id 
        AND status = 'pending';
        
        -- Log the auto-approval action
        RAISE NOTICE 'Auto-approved % pending documents for driver % (% %)', 
            (SELECT COUNT(*) FROM driver_documents WHERE driver_id = NEW.id AND status = 'approved'),
            NEW.id, 
            NEW.first_name, 
            NEW.last_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_approve_driver_documents ON driver_profiles;
CREATE TRIGGER trigger_auto_approve_driver_documents
    AFTER UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_driver_documents();

-- Test the trigger by updating an approved driver (this should do nothing since already approved)
-- But verify the trigger is working
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_approve_driver_documents';

-- Now manually approve any existing pending documents for already-approved drivers
-- (This is a one-time fix for existing data)
UPDATE driver_documents 
SET 
    status = 'approved',
    reviewed_at = NOW(),
    reviewed_by = (
        SELECT approved_by 
        FROM driver_profiles 
        WHERE id = driver_documents.driver_id
    )
WHERE driver_id IN (
    SELECT id 
    FROM driver_profiles 
    WHERE is_approved = true AND approval_status = 'approved'
) 
AND status = 'pending';

-- Verify all documents are now approved for approved drivers
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

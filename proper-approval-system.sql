-- PROPER DRIVER APPROVAL SYSTEM - ADD DEDICATED APPROVAL FIELDS
-- Execute this in Supabase SQL Editor to add proper approval fields

-- 1. Add dedicated approval fields to driver_profiles table
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'under_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_approval_status ON driver_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_approved ON driver_profiles(is_approved);

-- 3. Update existing drivers to have proper approval status
UPDATE driver_profiles 
SET 
    is_approved = CASE 
        WHEN specializations::text LIKE '%APPROVED_BY_ADMIN%' THEN TRUE 
        ELSE FALSE 
    END,
    approval_status = CASE 
        WHEN specializations::text LIKE '%APPROVED_BY_ADMIN%' THEN 'approved'
        ELSE 'pending'
    END,
    application_submitted_at = COALESCE(created_at, NOW());

-- 4. Clean up the specializations field (remove the workaround)
UPDATE driver_profiles 
SET specializations = (
    SELECT jsonb_agg(spec)
    FROM jsonb_array_elements_text(specializations) AS spec
    WHERE spec != 'APPROVED_BY_ADMIN'
)
WHERE specializations::text LIKE '%APPROVED_BY_ADMIN%';

-- 5. Create RLS policy for trip acceptance (only approved drivers can accept trips)
CREATE POLICY IF NOT EXISTS "Only approved drivers can accept trips" 
ON trip_requests 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM driver_profiles 
        WHERE driver_profiles.user_id = auth.uid() 
        AND driver_profiles.is_approved = TRUE
    )
);

-- 6. Create RLS policy for trip updates (only approved drivers can update trips)
CREATE POLICY IF NOT EXISTS "Only approved drivers can update trips" 
ON trip_requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM driver_profiles 
        WHERE driver_profiles.user_id = auth.uid() 
        AND driver_profiles.is_approved = TRUE
    )
);

-- 7. Create function to approve driver
CREATE OR REPLACE FUNCTION approve_driver_properly(
    p_driver_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Update driver approval status
    UPDATE driver_profiles 
    SET 
        is_approved = TRUE,
        approval_status = 'approved',
        approved_at = NOW(),
        approved_by = p_admin_id,
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_driver_id
    RETURNING jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'is_approved', is_approved,
        'approval_status', approval_status,
        'approved_at', approved_at
    ) INTO result;
    
    -- Return the result
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to reject driver
CREATE OR REPLACE FUNCTION reject_driver_properly(
    p_driver_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    -- Update driver rejection status
    UPDATE driver_profiles 
    SET 
        is_approved = FALSE,
        approval_status = 'rejected',
        rejection_reason = p_rejection_reason,
        approved_by = p_admin_id,
        admin_notes = p_admin_notes,
        updated_at = NOW()
    WHERE id = p_driver_id
    RETURNING jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'is_approved', is_approved,
        'approval_status', approval_status,
        'rejection_reason', rejection_reason
    ) INTO result;
    
    -- Return the result
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION approve_driver_properly TO authenticated;
GRANT EXECUTE ON FUNCTION reject_driver_properly TO authenticated;

-- Success message
SELECT 'Proper driver approval system implemented successfully!' AS status,
       'Added dedicated approval fields: is_approved, approval_status, approved_at, etc.' AS details;

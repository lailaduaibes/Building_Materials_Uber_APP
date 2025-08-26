-- =============================================================================
-- FIX PAYMENT_METHODS INSERT POLICY
-- The INSERT policy is missing the WITH CHECK constraint
-- =============================================================================

-- Drop the current problematic INSERT policy
DROP POLICY IF EXISTS "Users can insert own payment methods" ON payment_methods;

-- Create a proper INSERT policy with WITH CHECK constraint
CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the fix worked
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'payment_methods' 
    AND cmd = 'INSERT';

-- Test the policy by trying to insert a test payment method
-- This should work when you're authenticated
-- INSERT INTO payment_methods (user_id, type, last4, brand, is_default) 
-- VALUES (auth.uid(), 'card', '1234', 'visa', false);

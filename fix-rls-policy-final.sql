-- Fix RLS policy for trip acceptance
-- Drop existing policy and create correct one

DROP POLICY IF EXISTS "Drivers can accept pending trips" ON trip_requests;

CREATE POLICY "Drivers can accept pending trips" ON trip_requests
FOR UPDATE
USING (
  status = 'pending' 
  AND assigned_driver_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('pending', 'matched')
  AND assigned_driver_id = auth.uid()
);

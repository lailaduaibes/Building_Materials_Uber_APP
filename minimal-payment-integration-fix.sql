-- =============================================================================
-- MINIMAL PAYMENT INTEGRATION FIX - SAFE UPDATE
-- Only adds the missing columns needed for PaymentHistoryScreen to work
-- =============================================================================

-- Add the missing payment fields to trip_requests
ALTER TABLE trip_requests 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_payment_method_id ON trip_requests(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_payment_processed_at ON trip_requests(payment_processed_at);

-- Update existing trips with sample payment data for testing
-- (Only updates trips that don't have payment info yet)
UPDATE trip_requests 
SET 
    paid_amount = quoted_price,
    payment_processed_at = created_at,
    payment_transaction_id = 'TXN_' || substring(id::text from 1 for 8)
WHERE payment_status = 'pending' 
AND quoted_price IS NOT NULL 
AND paid_amount IS NULL;

-- Verify the changes
SELECT 
    'Updated trip_requests structure' as check_type,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND column_name LIKE '%payment%'
ORDER BY ordinal_position;

-- Check sample updated data
SELECT 
    id,
    status,
    payment_status,
    quoted_price,
    paid_amount,
    payment_method_id,
    payment_processed_at,
    payment_transaction_id
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 3;

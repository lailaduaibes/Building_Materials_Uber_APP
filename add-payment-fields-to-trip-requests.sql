-- =============================================================================
-- ADD PAYMENT FIELDS TO TRIP_REQUESTS TABLE
-- Run this in Supabase SQL Editor to add payment integration fields
-- =============================================================================

-- Add payment-related columns to trip_requests table
ALTER TABLE trip_requests 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trip_requests_payment_status ON trip_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_trip_requests_payment_method_id ON trip_requests(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_trip_requests_payment_processed_at ON trip_requests(payment_processed_at);

-- Update existing completed trips to have paid status
UPDATE trip_requests 
SET payment_status = 'paid', 
    paid_amount = quoted_price,
    payment_processed_at = updated_at
WHERE status = 'completed' 
AND payment_status IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND column_name LIKE '%payment%'
ORDER BY ordinal_position;

-- Check sample data
SELECT 
    id,
    status,
    quoted_price,
    payment_status,
    payment_method_id,
    paid_amount,
    payment_processed_at
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 5;

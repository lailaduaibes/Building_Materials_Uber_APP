-- =============================================================================
-- CHECK TRIP_REQUESTS TABLE FOR PAYMENT FIELDS
-- Run this in Supabase SQL Editor to verify payment integration fields exist
-- =============================================================================

-- 1. Check if trip_requests table has payment-related columns
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND column_name LIKE '%payment%'
ORDER BY ordinal_position;

-- 2. Check all trip_requests columns to see structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
ORDER BY ordinal_position;

-- 3. If payment fields are missing, add them:
/*
ALTER TABLE trip_requests 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(100);
*/

-- 4. Check sample trip_requests to see current data
SELECT 
    id,
    customer_id,
    status,
    quoted_price,
    payment_status,
    payment_method_id,
    paid_amount,
    payment_processed_at,
    created_at
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Count trips by payment status
SELECT 
    payment_status,
    COUNT(*) as count
FROM trip_requests 
GROUP BY payment_status;

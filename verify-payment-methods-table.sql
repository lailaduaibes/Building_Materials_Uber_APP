-- =============================================================================
-- VERIFY PAYMENT_METHODS TABLE STRUCTURE
-- Run this in Supabase SQL Editor to check if the table exists and has correct structure
-- =============================================================================

-- Check if payment_methods table exists and show its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
ORDER BY ordinal_position;

-- Check RLS policies on payment_methods table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'payment_methods';

-- If table doesn't exist, create it with this schema:
/*
CREATE TABLE IF NOT EXISTS payment_methods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'paypal', 'apple_pay', 'google_pay')),
    last4 VARCHAR(4),
    brand VARCHAR(20),
    expiry_month INTEGER,
    expiry_year INTEGER,
    stripe_payment_method_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    email VARCHAR(255), -- for PayPal
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    nickname VARCHAR(50),
    billing_address JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);
*/

-- Test query to see if you can access the table
SELECT COUNT(*) as total_payment_methods FROM payment_methods;

-- =============================================================================
-- COMPLETE PAYMENT SYSTEM DATABASE SETUP FOR SUPABASE
-- Run these commands in your Supabase SQL Editor
-- =============================================================================

-- First, let's check if tables exist and drop them to recreate with complete schema
-- This ensures we have all the latest fields and constraints

-- =============================================================================
-- 1. DROP EXISTING TABLES (if they exist) TO RECREATE WITH COMPLETE SCHEMA
-- =============================================================================

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;

-- =============================================================================
-- 2. CREATE PAYMENT_METHODS TABLE (Enhanced version)
-- =============================================================================

CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment method type
    type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'paypal', 'apple_pay', 'google_pay')),
    
    -- Card specific fields
    last4 VARCHAR(4),
    brand VARCHAR(50), -- visa, mastercard, amex, discover
    expiry_month INTEGER CHECK (expiry_month >= 1 AND expiry_month <= 12),
    expiry_year INTEGER CHECK (expiry_year >= EXTRACT(YEAR FROM NOW())),
    
    -- PayPal specific fields
    email VARCHAR(255),
    
    -- Stripe integration
    stripe_payment_method_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255), -- Store Stripe customer ID for easier processing
    
    -- General fields
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata and notes
    nickname VARCHAR(100), -- User-friendly name like "Personal Card", "Work Card"
    billing_address JSONB, -- Store billing address as JSON
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. CREATE PAYMENTS TABLE (Enhanced version)
-- =============================================================================

CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Order/Trip reference
    order_id VARCHAR(255), -- For e-commerce orders
    trip_id UUID, -- For trip-based payments (reference to trip_requests.id)
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    
    -- Stripe integration
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment status with comprehensive states
    status VARCHAR(30) NOT NULL DEFAULT 'pending' 
        CHECK (status IN (
            'pending', 'processing', 'succeeded', 'failed', 
            'canceled', 'refunded', 'partially_refunded', 
            'requires_action', 'requires_confirmation'
        )),
    
    -- Error handling
    failure_reason TEXT,
    failure_code VARCHAR(100),
    
    -- Refunds
    refund_amount DECIMAL(10,2) DEFAULT 0 CHECK (refund_amount >= 0),
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refunded_by UUID REFERENCES auth.users(id), -- Who processed the refund
    
    -- Receipt and communication
    receipt_email VARCHAR(255),
    receipt_url TEXT,
    receipt_number VARCHAR(50), -- Unique receipt number for customer reference
    
    -- Payment description and metadata
    description TEXT,
    metadata JSONB DEFAULT '{}', -- Store additional payment data
    
    -- Fee information
    application_fee DECIMAL(10,2) DEFAULT 0, -- Platform fee
    stripe_fee DECIMAL(10,2) DEFAULT 0, -- Stripe processing fee
    net_amount DECIMAL(10,2), -- Amount after fees
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE, -- When payment was actually processed
    
    -- Constraint to ensure refund doesn't exceed payment amount
    CONSTRAINT refund_not_exceed_amount CHECK (refund_amount <= amount)
);

-- =============================================================================
-- 4. CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Payment Methods Indexes
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_payment_methods_active ON payment_methods(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_payment_methods_stripe_pm ON payment_methods(stripe_payment_method_id) WHERE stripe_payment_method_id IS NOT NULL;
CREATE INDEX idx_payment_methods_stripe_customer ON payment_methods(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_payment_methods_type ON payment_methods(type);

-- Payments Indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_payments_trip_id ON payments(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_amount ON payments(amount);
CREATE INDEX idx_payments_stripe_intent ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payments_receipt_number ON payments(receipt_number) WHERE receipt_number IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_user_created ON payments(user_id, created_at DESC);

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. CREATE RLS POLICIES FOR PAYMENT_METHODS
-- =============================================================================

-- Users can view their own payment methods
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own payment methods
CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "Users can update own payment methods" ON payment_methods
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "Users can delete own payment methods" ON payment_methods
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Service role can manage all payment methods (for backend operations)
CREATE POLICY "Service can manage all payment methods" ON payment_methods
    FOR ALL 
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================================================
-- 7. CREATE RLS POLICIES FOR PAYMENTS
-- =============================================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Only service role can insert payments (payments are created via backend)
CREATE POLICY "Service can insert payments" ON payments
    FOR INSERT 
    WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Service role can update payments (for status changes, refunds, etc.)
CREATE POLICY "Service can update payments" ON payments
    FOR UPDATE 
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Service role can manage all payments
CREATE POLICY "Service can manage all payments" ON payments
    FOR ALL 
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- =============================================================================
-- 8. CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this payment method as default
    IF NEW.is_default = TRUE THEN
        -- Set all other payment methods for this user as non-default
        UPDATE payment_methods 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate unique receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL THEN
        NEW.receipt_number = 'RCP-' || to_char(NOW(), 'YYYYMMDD') || '-' || UPPER(substring(NEW.id::text, 1, 8));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate net amount after fees
CREATE OR REPLACE FUNCTION calculate_net_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.net_amount = NEW.amount - COALESCE(NEW.application_fee, 0) - COALESCE(NEW.stripe_fee, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 9. CREATE TRIGGERS
-- =============================================================================

-- Trigger to update updated_at for payment_methods
CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON payment_methods 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for payments
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure single default payment method
CREATE TRIGGER ensure_single_default_payment_method_trigger
    AFTER INSERT OR UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_payment_method();

-- Trigger to generate receipt numbers
CREATE TRIGGER generate_receipt_number_trigger
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_number();

-- Trigger to calculate net amount
CREATE TRIGGER calculate_net_amount_trigger
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_net_amount();

-- =============================================================================
-- 10. ADD PAYMENT STATUS TO EXISTING TABLES (if needed)
-- =============================================================================

-- Add payment status to trip_requests table (if column doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE trip_requests 
        ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
        
        -- Create index for payment status
        CREATE INDEX idx_trip_requests_payment_status ON trip_requests(payment_status);
    END IF;
END $$;

-- Add payment fields to orders table (if they don't exist)
DO $$ 
BEGIN
    -- Add payment_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
    END IF;
    
    -- Add payment_amount if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN payment_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- 11. CREATE HELPFUL VIEWS FOR PAYMENT ANALYTICS
-- =============================================================================

-- View for user payment summary
CREATE OR REPLACE VIEW user_payment_summary AS
SELECT 
    u.id as user_id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'first_name', 'N/A') as first_name,
    COALESCE(u.raw_user_meta_data->>'last_name', 'N/A') as last_name,
    COUNT(p.id) as total_payments,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_paid,
    SUM(p.refund_amount) as total_refunded,
    AVG(CASE WHEN p.status = 'succeeded' THEN p.amount END) as average_payment,
    MAX(p.created_at) as last_payment_date
FROM auth.users u
LEFT JOIN payments p ON u.id = p.user_id
GROUP BY u.id, u.email, u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name';

-- View for daily payment summary
CREATE OR REPLACE VIEW daily_payment_summary AS
SELECT 
    DATE(p.created_at) as payment_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN p.status = 'succeeded' THEN 1 END) as successful_payments,
    COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END) as total_revenue,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.application_fee ELSE 0 END) as total_fees,
    SUM(CASE WHEN p.status = 'succeeded' THEN p.net_amount ELSE 0 END) as net_revenue
FROM payments p
GROUP BY DATE(p.created_at)
ORDER BY payment_date DESC;

-- =============================================================================
-- 12. INSERT SAMPLE DATA FOR TESTING (Optional)
-- =============================================================================

-- Note: Uncomment this section if you want to add sample data for testing
-- This assumes you have at least one user in your auth.users table

/*
-- Insert sample payment method (only if you have users)
INSERT INTO payment_methods (user_id, type, last4, brand, expiry_month, expiry_year, is_default)
SELECT 
    id, 
    'card', 
    '4242', 
    'visa', 
    12, 
    2025, 
    true
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert sample payment record
INSERT INTO payments (user_id, amount, currency, status, description)
SELECT 
    id, 
    49.99, 
    'USD', 
    'succeeded', 
    'Test payment for development'
FROM auth.users 
LIMIT 1
ON CONFLICT DO NOTHING;
*/

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

-- Your payment system is now ready with:
-- ✅ Complete payment_methods table with Stripe integration
-- ✅ Comprehensive payments table with full transaction tracking
-- ✅ Proper indexes for performance
-- ✅ Row Level Security (RLS) policies
-- ✅ Helpful utility functions and triggers
-- ✅ Payment status integration with existing tables
-- ✅ Analytics views for reporting

-- Next steps:
-- 1. Set up your Stripe secret keys in Supabase Edge Functions environment
-- 2. Deploy the payment-processor edge function
-- 3. Test the payment flow in your mobile app
-- 4. Configure webhook endpoints for payment status updates

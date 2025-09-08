-- =============================================================================
-- DRIVER PAYOUT SYSTEM - MISSING TABLES TO ADD
-- Add these to complete the Uber-like payment system
-- =============================================================================

-- =============================================================================
-- 1. DRIVER PAYMENT METHODS TABLE
-- Store driver bank accounts and payout preferences
-- =============================================================================

CREATE TABLE driver_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment method type for drivers
    type VARCHAR(50) NOT NULL CHECK (type IN ('bank_account', 'debit_card', 'paypal', 'stripe_express')),
    
    -- Bank account details (encrypted/tokenized)
    bank_name VARCHAR(100),
    account_type VARCHAR(20) CHECK (account_type IN ('checking', 'savings')),
    routing_number_encrypted TEXT, -- Encrypted routing number
    account_number_last4 VARCHAR(4), -- Only store last 4 digits
    account_holder_name VARCHAR(100),
    
    -- Stripe Express/Connect account (recommended for driver payouts)
    stripe_account_id VARCHAR(255) UNIQUE, -- Stripe Express account ID
    stripe_external_account_id VARCHAR(255), -- Bank account/card ID in Stripe
    
    -- PayPal details
    paypal_email VARCHAR(255),
    
    -- Verification status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(30) DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'verified', 'failed', 'requires_documents')),
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_documents JSONB DEFAULT '{}', -- Store document references
    
    -- Settings
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    nickname VARCHAR(100), -- "Main Bank", "Backup Account"
    
    -- Payout preferences
    payout_schedule VARCHAR(20) DEFAULT 'weekly' 
        CHECK (payout_schedule IN ('instant', 'daily', 'weekly', 'monthly')),
    minimum_payout_amount DECIMAL(10,2) DEFAULT 1.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 2. DRIVER PAYOUTS TABLE
-- Track all money transfers from platform to drivers
-- =============================================================================

CREATE TABLE driver_payouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES driver_payment_methods(id),
    
    -- Payout details
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Fees
    platform_fee DECIMAL(10,2) DEFAULT 0, -- Fee charged by platform
    processing_fee DECIMAL(10,2) DEFAULT 0, -- Fee charged by payment processor
    net_amount DECIMAL(10,2) NOT NULL, -- Amount driver actually receives
    
    -- Payout period
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trips_included INTEGER DEFAULT 0, -- Number of trips in this payout
    
    -- Stripe/Payment processor integration
    stripe_transfer_id VARCHAR(255) UNIQUE, -- Stripe transfer ID
    stripe_payout_id VARCHAR(255), -- Stripe payout ID to bank
    processor_reference VARCHAR(255), -- Reference from payment processor
    
    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'processing', 'paid', 'failed', 
            'canceled', 'returned', 'requires_attention'
        )),
    
    -- Error handling
    failure_reason TEXT,
    failure_code VARCHAR(100),
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Payout type
    payout_type VARCHAR(20) DEFAULT 'automatic' 
        CHECK (payout_type IN ('automatic', 'manual', 'instant')),
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE, -- When payout was initiated
    completed_at TIMESTAMP WITH TIME ZONE, -- When payout reached driver's account
    
    -- Ensure net amount is correct
    CONSTRAINT net_amount_calculation CHECK (net_amount = amount - platform_fee - processing_fee)
);

-- =============================================================================
-- 3. DRIVER EARNINGS TABLE
-- Detailed breakdown of driver earnings per trip (for transparency)
-- =============================================================================

CREATE TABLE driver_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    payout_id UUID REFERENCES driver_payouts(id), -- Which payout batch this belongs to
    
    -- Trip financial details
    trip_fare DECIMAL(10,2) NOT NULL, -- Total customer paid
    platform_commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15, -- e.g., 0.15 = 15%
    platform_commission DECIMAL(10,2) NOT NULL, -- Actual commission amount
    driver_earnings DECIMAL(10,2) NOT NULL, -- Amount driver earned
    
    -- Additional earnings
    tip_amount DECIMAL(10,2) DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0, -- Peak hour bonus, quality bonus, etc.
    
    -- Adjustments
    adjustment_amount DECIMAL(10,2) DEFAULT 0, -- Manual adjustments
    adjustment_reason TEXT,
    
    -- Total earnings for this trip
    total_earnings DECIMAL(10,2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'included_in_payout', 'paid', 'disputed')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure calculations are correct
    CONSTRAINT earnings_calculation CHECK (
        driver_earnings = trip_fare - platform_commission AND
        total_earnings = driver_earnings + tip_amount + bonus_amount + adjustment_amount
    ),
    
    -- Unique constraint to prevent duplicate earnings records
    UNIQUE(driver_id, trip_id)
);

-- =============================================================================
-- 4. PERFORMANCE INDEXES
-- =============================================================================

-- Driver Payment Methods
CREATE INDEX idx_driver_payment_methods_driver_id ON driver_payment_methods(driver_id);
CREATE INDEX idx_driver_payment_methods_default ON driver_payment_methods(driver_id, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_driver_payment_methods_verified ON driver_payment_methods(driver_id, is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_driver_payment_methods_stripe ON driver_payment_methods(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Driver Payouts
CREATE INDEX idx_driver_payouts_driver_id ON driver_payouts(driver_id);
CREATE INDEX idx_driver_payouts_status ON driver_payouts(status);
CREATE INDEX idx_driver_payouts_created_at ON driver_payouts(created_at DESC);
CREATE INDEX idx_driver_payouts_period ON driver_payouts(period_start, period_end);
CREATE INDEX idx_driver_payouts_driver_status ON driver_payouts(driver_id, status);
CREATE INDEX idx_driver_payouts_processing ON driver_payouts(status, next_retry_at) WHERE status = 'failed';

-- Driver Earnings
CREATE INDEX idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX idx_driver_earnings_trip_id ON driver_earnings(trip_id);
CREATE INDEX idx_driver_earnings_payout_id ON driver_earnings(payout_id) WHERE payout_id IS NOT NULL;
CREATE INDEX idx_driver_earnings_status ON driver_earnings(status);
CREATE INDEX idx_driver_earnings_created_at ON driver_earnings(created_at DESC);
CREATE INDEX idx_driver_earnings_pending ON driver_earnings(driver_id, status) WHERE status = 'pending';

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE driver_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. RLS POLICIES
-- =============================================================================

-- Driver Payment Methods - Drivers can only see their own
CREATE POLICY "Drivers can view own payment methods" ON driver_payment_methods
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY "Drivers can insert own payment methods" ON driver_payment_methods
    FOR INSERT WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can update own payment methods" ON driver_payment_methods
    FOR UPDATE USING (driver_id = auth.uid());

-- Driver Payouts - Drivers can only see their own
CREATE POLICY "Drivers can view own payouts" ON driver_payouts
    FOR SELECT USING (driver_id = auth.uid());

-- Driver Earnings - Drivers can view their own earnings
CREATE POLICY "Drivers can view own earnings" ON driver_earnings
    FOR SELECT USING (driver_id = auth.uid());

-- =============================================================================
-- 7. FUNCTIONS FOR AUTOMATIC EARNINGS CALCULATION
-- =============================================================================

-- Function to automatically create earnings record when trip is completed
CREATE OR REPLACE FUNCTION create_driver_earnings()
RETURNS TRIGGER AS $$
DECLARE
    commission_rate DECIMAL(5,4) := 0.15; -- 15% platform commission
    commission_amount DECIMAL(10,2);
    driver_earning DECIMAL(10,2);
BEGIN
    -- Only create earnings when trip status changes to 'delivered'
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        -- Calculate commission and driver earnings
        commission_amount := NEW.final_price * commission_rate;
        driver_earning := NEW.final_price - commission_amount;
        
        -- Insert earnings record
        INSERT INTO driver_earnings (
            driver_id,
            trip_id,
            trip_fare,
            platform_commission_rate,
            platform_commission,
            driver_earnings,
            total_earnings
        ) VALUES (
            NEW.assigned_driver_id,
            NEW.id,
            NEW.final_price,
            commission_rate,
            commission_amount,
            driver_earning,
            driver_earning -- No tips/bonuses initially
        );
        
        -- Update driver's total earnings
        UPDATE driver_profiles 
        SET total_earnings = COALESCE(total_earnings, 0) + driver_earning
        WHERE user_id = NEW.assigned_driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate earnings
CREATE TRIGGER trigger_create_driver_earnings
    AFTER UPDATE ON trip_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_driver_earnings();

-- =============================================================================
-- 8. SAMPLE DATA QUERIES
-- =============================================================================

-- View driver pending earnings
-- SELECT 
--     driver_id,
--     COUNT(*) as pending_trips,
--     SUM(total_earnings) as pending_amount
-- FROM driver_earnings 
-- WHERE status = 'pending'
-- GROUP BY driver_id;

-- View driver payout history
-- SELECT 
--     dp.*,
--     dpm.bank_name,
--     dpm.account_number_last4
-- FROM driver_payouts dp
-- JOIN driver_payment_methods dpm ON dp.payment_method_id = dpm.id
-- WHERE dp.driver_id = 'your-driver-id'
-- ORDER BY dp.created_at DESC;

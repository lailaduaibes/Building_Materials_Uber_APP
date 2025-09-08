-- VERIFY DRIVER PAYMENT SYSTEM TEST RESULTS
-- Run these queries to check if your test worked correctly

-- 1. Check what was added to driver_payment_methods table
SELECT 
    id,
    driver_id,
    type,
    bank_name,
    account_number_last4,
    account_holder_name,
    is_verified,
    is_default,
    is_active,
    created_at
FROM driver_payment_methods 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Verify the driver exists in users and driver_profiles
SELECT 
    u.id as user_id,
    u.email,
    u.user_type,
    dp.first_name,
    dp.last_name,
    dp.phone_number
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.id IN (
    SELECT DISTINCT driver_id 
    FROM driver_payment_methods 
    ORDER BY created_at DESC 
    LIMIT 5
);

-- 3. Check if earnings data exists for the driver
SELECT 
    driver_id,
    COUNT(*) as total_trips,
    SUM(total_earnings) as total_earnings,
    SUM(CASE WHEN status = 'paid' THEN total_earnings ELSE 0 END) as available_earnings,
    SUM(CASE WHEN status = 'pending' THEN total_earnings ELSE 0 END) as pending_earnings
FROM driver_earnings 
WHERE driver_id IN (
    SELECT DISTINCT driver_id 
    FROM driver_payment_methods 
    ORDER BY created_at DESC 
    LIMIT 1
)
GROUP BY driver_id;

-- 4. Check if any payout requests were created
SELECT 
    id,
    driver_id,
    amount,
    payout_type,
    status,
    requested_at,
    processed_at
FROM driver_payouts 
WHERE driver_id IN (
    SELECT DISTINCT driver_id 
    FROM driver_payment_methods 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY requested_at DESC;

-- 5. Test the complete payment flow by checking all related tables
SELECT 
    'Payment Methods' as table_name,
    COUNT(*) as record_count
FROM driver_payment_methods
UNION ALL
SELECT 
    'Driver Earnings' as table_name,
    COUNT(*) as record_count
FROM driver_earnings
UNION ALL
SELECT 
    'Driver Payouts' as table_name,
    COUNT(*) as record_count
FROM driver_payouts;

-- INTERPRETATION GUIDE:
-- ✅ SUCCESS INDICATORS:
-- - driver_payment_methods has new records with correct driver_id
-- - driver_id matches a real user in users table with user_type = 'driver'
-- - driver_profiles exists for the user
-- - All required fields are populated correctly

-- ❌ POTENTIAL ISSUES TO CHECK:
-- - driver_id doesn't match any real users
-- - Missing driver_profiles record
-- - Null or invalid data in required fields
-- - No earnings data (might be expected for new drivers)

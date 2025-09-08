-- Add test earnings data for current driver testing
-- This will populate the earnings screen with realistic data

-- First, let's check current driver IDs in the system
SELECT user_id, first_name, last_name FROM driver_profiles LIMIT 5;

-- Add sample earnings for a test driver (replace with actual driver ID)
INSERT INTO driver_earnings (
  driver_id,
  trip_id,
  trip_fare,
  platform_commission_rate,
  platform_commission,
  driver_earnings,
  tip_amount,
  bonus_amount,
  adjustment_amount,
  total_earnings,
  status,
  created_at,
  updated_at
) VALUES 
-- Today's earnings
(
  'current-driver-id-here', -- Replace with actual driver ID
  'trip-today-1',
  45.00,
  0.15,
  6.75,
  38.25,
  5.00,
  0.00,
  0.00,
  43.25,
  'pending',
  NOW(),
  NOW()
),
(
  'current-driver-id-here',
  'trip-today-2',
  68.50,
  0.15,
  10.28,
  58.22,
  8.50,
  2.00,
  0.00,
  68.72,
  'pending',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),

-- Yesterday's earnings  
(
  'current-driver-id-here',
  'trip-yesterday-1',
  52.00,
  0.15,
  7.80,
  44.20,
  6.00,
  0.00,
  0.00,
  50.20,
  'paid',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  'current-driver-id-here',
  'trip-yesterday-2',
  73.25,
  0.15,
  10.99,
  62.26,
  12.00,
  0.00,
  0.00,
  74.26,
  'paid',
  NOW() - INTERVAL '1 day 3 hours',
  NOW() - INTERVAL '1 day 3 hours'
),

-- This week's additional earnings
(
  'current-driver-id-here',
  'trip-week-1',
  89.75,
  0.15,
  13.46,
  76.29,
  15.50,
  5.00,
  0.00,
  96.79,
  'paid',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  'current-driver-id-here',
  'trip-week-2',
  41.50,
  0.15,
  6.23,
  35.27,
  4.00,
  0.00,
  0.00,
  39.27,
  'paid',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
),

-- Last month's earnings
(
  'current-driver-id-here',
  'trip-month-1',
  95.00,
  0.15,
  14.25,
  80.75,
  18.00,
  10.00,
  0.00,
  108.75,
  'paid',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
),
(
  'current-driver-id-here',
  'trip-month-2',
  67.80,
  0.15,
  10.17,
  57.63,
  9.20,
  0.00,
  0.00,
  66.83,
  'paid',
  NOW() - INTERVAL '3 weeks',
  NOW() - INTERVAL '3 weeks'
);

-- Check the inserted data
SELECT 
  trip_id,
  total_earnings,
  status,
  created_at::date as earning_date
FROM driver_earnings 
WHERE driver_id = 'current-driver-id-here'
ORDER BY created_at DESC;

-- Summary view of what the earnings screen should show
SELECT 
  'Today' as period,
  COUNT(*) as trips,
  SUM(total_earnings) as earnings,
  SUM(CASE WHEN status = 'pending' THEN total_earnings ELSE 0 END) as available_for_payout,
  SUM(tip_amount) as tips
FROM driver_earnings 
WHERE driver_id = 'current-driver-id-here' 
  AND created_at::date = CURRENT_DATE

UNION ALL

SELECT 
  'This Week' as period,
  COUNT(*) as trips,
  SUM(total_earnings) as earnings,
  SUM(CASE WHEN status = 'pending' THEN total_earnings ELSE 0 END) as available_for_payout,
  SUM(tip_amount) as tips
FROM driver_earnings 
WHERE driver_id = 'current-driver-id-here' 
  AND created_at >= date_trunc('week', CURRENT_DATE)

UNION ALL

SELECT 
  'This Month' as period,
  COUNT(*) as trips,
  SUM(total_earnings) as earnings,
  SUM(CASE WHEN status = 'pending' THEN total_earnings ELSE 0 END) as available_for_payout,
  SUM(tip_amount) as tips
FROM driver_earnings 
WHERE driver_id = 'current-driver-id-here' 
  AND created_at >= date_trunc('month', CURRENT_DATE);

-- Create Test Data for Driver App Testing
-- Run this in Supabase SQL Editor to create sample trip requests

-- First, let's create a test customer if one doesn't exist
INSERT INTO public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role,
    user_type,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'testcustomer@example.com',
    'test_hash',
    'Ahmed',
    'Customer',
    '+966 50 987 6543',
    'customer',
    'customer',
    true,
    now(),
    now()
) ON CONFLICT (email) DO NOTHING;

-- Create sample trip requests for testing
INSERT INTO public.trip_requests (
    id,
    customer_id,
    pickup_latitude,
    pickup_longitude,
    pickup_address,
    delivery_latitude,
    delivery_longitude,
    delivery_address,
    material_type,
    load_description,
    estimated_weight_tons,
    estimated_volume_m3,
    quoted_price,
    estimated_distance_km,
    estimated_duration_minutes,
    special_requirements,
    requires_crane,
    requires_hydraulic_lift,
    pickup_time_preference,
    scheduled_pickup_time,
    status,
    created_at
) VALUES 
-- Trip 1: Cement delivery in Riyadh
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.7136,
    46.6753,
    '{"formatted_address": "Building Materials Warehouse, Industrial City, Riyadh", "city": "Riyadh", "area": "Industrial City"}'::jsonb,
    24.6877,
    46.7219,
    '{"formatted_address": "Construction Site, Al Olaya District, Riyadh", "city": "Riyadh", "area": "Al Olaya"}'::jsonb,
    'cement',
    'Portland Cement Bags - 50 bags needed for foundation work',
    2.5,
    1.2,
    285.50,
    15.2,
    120,
    '{"requires_forklift": true, "delivery_floor": "ground", "contact_person": "Site Supervisor"}'::jsonb,
    false,
    false,
    'asap',
    now() + interval '2 hours',
    'pending',
    now()
),
-- Trip 2: Steel bars delivery
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.6877,
    46.7219,
    '{"formatted_address": "Steel Supply Center, Al Khobar", "city": "Al Khobar", "area": "Industrial"}'::jsonb,
    24.7136,
    46.6753,
    '{"formatted_address": "New Construction Project, King Fahd District", "city": "Riyadh", "area": "King Fahd"}'::jsonb,
    'steel',
    'Reinforcement Steel Bars - Various sizes for building frame',
    4.8,
    0.8,
    420.75,
    28.5,
    180,
    '{"requires_crane": true, "unloading_equipment": "available", "safety_requirements": "high"}'::jsonb,
    true,
    false,
    'scheduled',
    now() + interval '4 hours',
    'pending',
    now() - interval '30 minutes'
),
-- Trip 3: Concrete blocks delivery
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.7750,
    46.7086,
    '{"formatted_address": "Concrete Block Factory, North Riyadh", "city": "Riyadh", "area": "North District"}'::jsonb,
    24.6204,
    46.6024,
    '{"formatted_address": "Residential Construction, Al Malaz", "city": "Riyadh", "area": "Al Malaz"}'::jsonb,
    'concrete_blocks',
    'Hollow concrete blocks - 500 pieces for wall construction',
    6.2,
    2.1,
    520.00,
    22.3,
    150,
    '{"requires_hydraulic_lift": true, "stacking_required": true, "access_road": "narrow"}'::jsonb,
    false,
    true,
    'morning',
    now() + interval '1 day',
    'pending',
    now() - interval '1 hour'
),
-- Trip 4: Sand delivery
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.5247,
    46.6300,
    '{"formatted_address": "Sand Quarry, South Riyadh", "city": "Riyadh", "area": "South Industrial"}'::jsonb,
    24.7136,
    46.6753,
    '{"formatted_address": "Landscaping Project, Diplomatic Quarter", "city": "Riyadh", "area": "Diplomatic Quarter"}'::jsonb,
    'sand',
    'Fine construction sand - 8 cubic meters for landscaping',
    12.0,
    8.0,
    180.25,
    35.7,
    90,
    '{"dump_truck_required": true, "site_access": "good", "unloading_area": "designated"}'::jsonb,
    false,
    false,
    'afternoon',
    now() + interval '6 hours',
    'pending',
    now() - interval '15 minutes'
);

-- Create some completed trips for earnings history (assign to our driver)
INSERT INTO public.trip_requests (
    id,
    customer_id,
    pickup_latitude,
    pickup_longitude,
    pickup_address,
    delivery_latitude,
    delivery_longitude,
    delivery_address,
    material_type,
    load_description,
    estimated_weight_tons,
    quoted_price,
    final_price,
    estimated_distance_km,
    estimated_duration_minutes,
    status,
    assigned_driver_id,
    matched_at,
    pickup_started_at,
    pickup_completed_at,
    delivery_started_at,
    delivered_at,
    customer_rating,
    customer_feedback,
    driver_rating,
    created_at
) VALUES 
-- Completed trip 1 (yesterday)
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.7136, 46.6753,
    '{"formatted_address": "Warehouse A, Industrial City"}'::jsonb,
    24.6877, 46.7219,
    '{"formatted_address": "Construction Site B, Al Olaya"}'::jsonb,
    'cement',
    'Cement bags delivery - completed successfully',
    3.2,
    350.00,
    350.00,
    18.5,
    135,
    'delivered',
    '7a9ce2f0-db9d-46a7-aef3-c01635d90592', -- Our driver's user_id
    now() - interval '1 day 3 hours',
    now() - interval '1 day 2 hours 30 minutes',
    now() - interval '1 day 2 hours',
    now() - interval '1 day 1 hour 30 minutes',
    now() - interval '1 day 1 hour',
    5,
    'Excellent service, on time delivery',
    4,
    now() - interval '1 day 4 hours'
),
-- Completed trip 2 (today)
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.6204, 46.6024,
    '{"formatted_address": "Steel Supplier, Al Malaz"}'::jsonb,
    24.7750, 46.7086,
    '{"formatted_address": "Building Site, North Riyadh"}'::jsonb,
    'steel',
    'Steel bars delivery - completed',
    5.1,
    475.50,
    475.50,
    25.2,
    160,
    'delivered',
    '7a9ce2f0-db9d-46a7-aef3-c01635d90592', -- Our driver's user_id
    now() - interval '4 hours',
    now() - interval '3 hours 45 minutes',
    now() - interval '3 hours 15 minutes',
    now() - interval '2 hours 30 minutes',
    now() - interval '2 hours',
    4,
    'Good driver, careful handling',
    5,
    now() - interval '5 hours'
),
-- Completed trip 3 (this week)
(
    gen_random_uuid(),
    (SELECT id FROM public.users WHERE email = 'testcustomer@example.com' LIMIT 1),
    24.5247, 46.6300,
    '{"formatted_address": "Sand Quarry, South"}'::jsonb,
    24.7136, 46.6753,
    '{"formatted_address": "Project Site, Central"}'::jsonb,
    'sand',
    'Sand delivery - bulk order',
    8.5,
    220.75,
    220.75,
    30.1,
    95,
    'delivered',
    '7a9ce2f0-db9d-46a7-aef3-c01635d90592', -- Our driver's user_id
    now() - interval '3 days',
    now() - interval '3 days' + interval '30 minutes',
    now() - interval '3 days' + interval '1 hour',
    now() - interval '3 days' + interval '2 hours',
    now() - interval '3 days' + interval '2 hours 30 minutes',
    5,
    'Professional delivery service',
    5,
    now() - interval '3 days 1 hour'
);

-- Update driver profile with calculated totals
UPDATE public.driver_profiles 
SET 
    total_trips = (
        SELECT COUNT(*) 
        FROM public.trip_requests 
        WHERE assigned_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
        AND status = 'delivered'
    ),
    total_earnings = (
        SELECT COALESCE(SUM(final_price), 0) 
        FROM public.trip_requests 
        WHERE assigned_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
        AND status = 'delivered'
    ),
    rating = (
        SELECT COALESCE(AVG(customer_rating), 4.8) 
        FROM public.trip_requests 
        WHERE assigned_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
        AND status = 'delivered' 
        AND customer_rating IS NOT NULL
    ),
    updated_at = now()
WHERE user_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';

-- Verify the test data
SELECT 
    'Available Trips' as type,
    COUNT(*) as count
FROM public.trip_requests 
WHERE status = 'pending' AND assigned_driver_id IS NULL

UNION ALL

SELECT 
    'Driver Completed Trips' as type,
    COUNT(*) as count
FROM public.trip_requests 
WHERE assigned_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
AND status = 'delivered'

UNION ALL

SELECT 
    'Driver Total Earnings' as type,
    COALESCE(SUM(final_price), 0) as count
FROM public.trip_requests 
WHERE assigned_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
AND status = 'delivered';

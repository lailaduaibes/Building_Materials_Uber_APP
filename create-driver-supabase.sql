-- FIXED: Create Driver Account in Supabase
-- Run this in Supabase SQL Editor AFTER creating user in Dashboard

-- Step 1: Verify user exists and is confirmed
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'yayajiji1412@gmail.com';

-- Step 2: Update user metadata to ensure role is set
UPDATE auth.users 
SET 
    raw_user_meta_data = raw_user_meta_data || '{"role": "driver", "first_name": "Ahmed", "last_name": "Driver"}'::jsonb
WHERE email = 'yayajiji1412@gmail.com';

-- Step 3: Create or update user in public.users table
INSERT INTO public.users (
    id,
    email,
    role,
    user_type,
    first_name,
    last_name,
    phone,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    'driver',
    'driver',
    'Ahmed',
    'Driver',
    '+966 50 123 4567',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'yayajiji1412@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'driver',
    user_type = 'driver',
    first_name = 'Ahmed',
    last_name = 'Driver',
    phone = '+966 50 123 4567',
    updated_at = now();

-- Step 4: Create driver profile
INSERT INTO public.driver_profiles (
    user_id,
    years_experience,
    specializations,
    rating,
    total_trips,
    total_earnings,
    is_available,
    max_distance_km,
    preferred_truck_types,
    created_at,
    updated_at
)
SELECT 
    id,
    3,
    '["Heavy Materials", "Construction Equipment", "Long Distance Delivery"]'::jsonb,
    4.8,
    156,
    2450.75,
    true,
    50,
    '["Flatbed Truck", "Crane Truck", "Heavy Duty Truck"]'::jsonb,
    now(),
    now()
FROM public.users 
WHERE email = 'yayajiji1412@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    years_experience = 3,
    specializations = '["Heavy Materials", "Construction Equipment", "Long Distance Delivery"]'::jsonb,
    rating = 4.8,
    total_trips = 156,
    total_earnings = 2450.75,
    is_available = true,
    max_distance_km = 50,
    preferred_truck_types = '["Flatbed Truck", "Crane Truck", "Heavy Duty Truck"]'::jsonb,
    updated_at = now();

-- Step 5: Final verification - check everything is set up correctly
SELECT 
    u.id,
    u.email,
    u.role,
    u.user_type,
    u.first_name,
    u.last_name,
    u.phone,
    dp.years_experience,
    dp.rating,
    dp.total_trips,
    dp.is_available
FROM public.users u
LEFT JOIN public.driver_profiles dp ON u.id = dp.user_id
WHERE u.email = 'yayajiji1412@gmail.com';

-- Step 6: Check auth user is properly set up
SELECT 
    id,
    email,
    email_confirmed_at,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name
FROM auth.users 
WHERE email = 'yayajiji1412@gmail.com';

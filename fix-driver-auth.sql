-- Fix Driver Authentication Issue
-- Run these commands in Supabase SQL Editor

-- Step 1: Check current user status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data,
    phone_confirmed_at
FROM auth.users 
WHERE email = 'yayajiji1412@gmail.com';

-- Step 2: If user exists but email is not confirmed, confirm it
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email = 'yayajiji1412@gmail.com' AND email_confirmed_at IS NULL;

-- Step 3: Reset/Set the password (this will create a new encrypted password)
-- Note: You'll need to do this through Supabase Dashboard -> Authentication -> Users
-- Click on the user and use "Reset Password" or "Send Password Reset Email"

-- Step 4: Ensure the user metadata is correct
UPDATE auth.users 
SET 
    raw_user_meta_data = '{"role": "driver", "first_name": "Ahmed", "last_name": "Driver"}'::jsonb
WHERE email = 'yayajiji1412@gmail.com';

-- Step 5: Check if user exists in public.users table
SELECT id, email, role, user_type, first_name, last_name, phone
FROM public.users 
WHERE email = 'yayajiji1412@gmail.com';

-- Step 6: If user doesn't exist in public.users, create it
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
AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Step 7: Update existing user in public.users if it exists
UPDATE public.users 
SET 
    role = 'driver',
    user_type = 'driver',
    first_name = 'Ahmed',
    last_name = 'Driver',
    phone = '+966 50 123 4567',
    updated_at = now()
WHERE email = 'yayajiji1412@gmail.com';

-- Step 8: Create/Update driver profile
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
    years_experience = EXCLUDED.years_experience,
    specializations = EXCLUDED.specializations,
    rating = EXCLUDED.rating,
    total_trips = EXCLUDED.total_trips,
    total_earnings = EXCLUDED.total_earnings,
    is_available = EXCLUDED.is_available,
    max_distance_km = EXCLUDED.max_distance_km,
    preferred_truck_types = EXCLUDED.preferred_truck_types,
    updated_at = now();

-- Step 9: Final verification
SELECT 
    u.id,
    u.email,
    u.role,
    u.user_type,
    u.first_name,
    u.last_name,
    dp.years_experience,
    dp.rating,
    dp.total_trips
FROM public.users u
LEFT JOIN public.driver_profiles dp ON u.id = dp.user_id
WHERE u.email = 'yayajiji1412@gmail.com';

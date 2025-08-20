-- STEP-BY-STEP Driver Account Creation
-- Run each section separately in Supabase SQL Editor

-- SECTION 1: Check if user exists
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'yayajiji1412@gmail.com';

-- SECTION 2: Update user metadata (run this after user is created)
UPDATE auth.users 
SET 
    raw_user_meta_data = raw_user_meta_data || '{"role": "driver", "first_name": "Ahmed", "last_name": "Driver"}'::jsonb
WHERE email = 'yayajiji1412@gmail.com';

-- SECTION 3: Create user in public.users table
-- First, check what columns exist in the users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Create user with proper password_hash handling
INSERT INTO public.users (
    id,
    email,
    password_hash,
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
    'supabase_managed', -- Placeholder since Supabase manages the real password
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

-- SECTION 4: Create driver profile
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

-- SECTION 5: Final verification
SELECT 
    'AUTH USER' as source,
    au.id,
    au.email,
    au.email_confirmed_at,
    au.raw_user_meta_data->>'role' as role,
    au.raw_user_meta_data->>'first_name' as first_name,
    au.raw_user_meta_data->>'last_name' as last_name
FROM auth.users au
WHERE au.email = 'yayajiji1412@gmail.com'

UNION ALL

SELECT 
    'PUBLIC USER' as source,
    u.id,
    u.email,
    NULL as email_confirmed_at,
    u.role,
    u.first_name,
    u.last_name
FROM public.users u
WHERE u.email = 'yayajiji1412@gmail.com'

UNION ALL

SELECT 
    'DRIVER PROFILE' as source,
    dp.user_id as id,
    u.email,
    NULL as email_confirmed_at,
    CAST(dp.rating as text) as role,
    CAST(dp.total_trips as text) as first_name,
    CAST(dp.total_earnings as text) as last_name
FROM public.driver_profiles dp
JOIN public.users u ON dp.user_id = u.id
WHERE u.email = 'yayajiji1412@gmail.com';

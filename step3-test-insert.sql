-- Query 3: Try the test INSERT to see exact error
INSERT INTO public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role,
    user_type,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test-driver@example.com',
    'supabase_auth',
    'Test',
    'Driver',
    '+1234567890',
    'driver',
    'driver',
    true
);

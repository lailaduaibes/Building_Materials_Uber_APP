-- Function to sync phone number between users table and Supabase Auth
-- This should be run when phone numbers are updated

-- Update Supabase Auth user metadata with phone from users table
UPDATE auth.users 
SET phone = users.phone,
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('phone', users.phone),
    updated_at = NOW()
FROM users 
WHERE auth.users.id = users.id 
AND users.phone IS NOT NULL 
AND users.phone != ''
AND (auth.users.phone IS NULL OR auth.users.phone != users.phone);

-- Check the sync status
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.phone as users_phone,
    au.phone as auth_phone,
    au.raw_user_meta_data->>'phone' as auth_metadata_phone,
    CASE 
        WHEN u.phone = au.phone THEN 'SYNCED'
        WHEN u.phone != au.phone OR au.phone IS NULL THEN 'OUT_OF_SYNC'
        ELSE 'UNKNOWN'
    END as sync_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.phone IS NOT NULL
ORDER BY sync_status DESC;

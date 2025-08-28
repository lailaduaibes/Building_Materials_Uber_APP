-- Check the actual columns in the users table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Also check what columns are available for customer contact info
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND (column_name ILIKE '%phone%' 
       OR column_name ILIKE '%mobile%' 
       OR column_name ILIKE '%contact%'
       OR column_name ILIKE '%email%')
ORDER BY ordinal_position;

-- Check if there's a separate customer profile table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%customer%' 
       OR table_name ILIKE '%profile%'
       OR table_name ILIKE '%contact%');

-- Check all columns in users table to see what's available for customer info
\d users;

-- Check if chat-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trip_messages', 'trip_photos', 'trip_call_logs')
ORDER BY table_name;

-- Get detailed schema for trip_messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trip_messages'
ORDER BY ordinal_position;

-- Get detailed schema for trip_photos table  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trip_photos'
ORDER BY ordinal_position;

-- Get detailed schema for trip_call_logs table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trip_call_logs'
ORDER BY ordinal_position;

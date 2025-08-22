-- Add last_seen and is_available columns to driver_profiles table
-- These columns are needed for the professional dashboard online/offline functionality

-- Add last_seen column to track when driver was last active
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Add is_available column to track driver online/offline status
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT false;

-- Set default values for existing drivers
UPDATE driver_profiles 
SET last_seen = NOW(), 
    is_available = false 
WHERE last_seen IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_available 
ON driver_profiles(is_available);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_last_seen 
ON driver_profiles(last_seen);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
AND table_schema = 'public'
AND column_name IN ('last_seen', 'is_available')
ORDER BY column_name;

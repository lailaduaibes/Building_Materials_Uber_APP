-- Add missing last_seen column to driver_profiles table
-- This column is needed for the professional dashboard's online/offline tracking

-- Add last_seen column to track when driver was last active
ALTER TABLE driver_profiles 
ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();

-- Update existing drivers with current timestamp
UPDATE driver_profiles 
SET last_seen = NOW() 
WHERE last_seen IS NULL;

-- Add index for performance when querying last seen drivers
CREATE INDEX IF NOT EXISTS idx_driver_profiles_last_seen 
ON driver_profiles(last_seen);

-- Optional: Add index for availability + last_seen queries
CREATE INDEX IF NOT EXISTS idx_driver_profiles_availability_last_seen 
ON driver_profiles(is_available, last_seen);

-- Verify the new column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
AND table_schema = 'public'
AND column_name = 'last_seen';

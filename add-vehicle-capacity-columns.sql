-- Add vehicle capacity fields to driver_profiles table
-- Execute this SQL to add the missing capacity columns

-- First check if columns already exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
  AND column_name IN ('vehicle_max_payload', 'vehicle_max_volume')
ORDER BY column_name;

-- Add vehicle capacity columns if they don't exist
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS vehicle_max_payload DECIMAL(6,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS vehicle_max_volume DECIMAL(6,2) DEFAULT 10.0;

-- Add comments to explain the columns
COMMENT ON COLUMN driver_profiles.vehicle_max_payload IS 'Maximum payload capacity of the driver vehicle in tons';
COMMENT ON COLUMN driver_profiles.vehicle_max_volume IS 'Maximum volume capacity of the driver vehicle in cubic meters';

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
  AND column_name IN ('vehicle_max_payload', 'vehicle_max_volume')
ORDER BY column_name;

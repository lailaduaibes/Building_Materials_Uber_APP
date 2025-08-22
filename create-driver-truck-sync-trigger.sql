-- CREATE AUTOMATIC SYNC TRIGGER FOR DRIVER-TRUCK AVAILABILITY
-- This ensures that when a driver goes online/offline, their truck availability is automatically synced

-- STEP 1: Create the trigger function
CREATE OR REPLACE FUNCTION sync_driver_truck_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- When driver availability changes, update their truck(s)
  IF OLD.is_available IS DISTINCT FROM NEW.is_available THEN
    
    -- Update truck via current_truck_id (if driver has one assigned)
    IF NEW.current_truck_id IS NOT NULL THEN
      UPDATE trucks 
      SET is_available = NEW.is_available,
          updated_at = NOW()
      WHERE id = NEW.current_truck_id;
      
      RAISE NOTICE 'Updated truck % availability to % via current_truck_id', NEW.current_truck_id, NEW.is_available;
    END IF;
    
    -- Also update truck via current_driver_id (if truck is assigned to this driver)
    IF NEW.user_id IS NOT NULL THEN
      UPDATE trucks 
      SET is_available = NEW.is_available,
          updated_at = NOW()
      WHERE current_driver_id = NEW.user_id;
      
      RAISE NOTICE 'Updated truck availability to % for driver %', NEW.is_available, NEW.user_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Create the trigger on driver_profiles table
DROP TRIGGER IF EXISTS trigger_sync_driver_truck_availability ON driver_profiles;
CREATE TRIGGER trigger_sync_driver_truck_availability
  AFTER UPDATE OF is_available ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_driver_truck_availability();

-- STEP 3: Test the trigger by manually updating a driver's availability
-- First, let's see the current state
SELECT 
  'BEFORE TRIGGER TEST' as test_phase,
  dp.first_name,
  dp.last_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.license_plate,
  t.is_available as truck_available,
  tt.name as truck_type
FROM driver_profiles dp
LEFT JOIN trucks t ON (dp.current_truck_id = t.id OR t.current_driver_id = dp.user_id)
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811'; -- Laila's phone number

-- STEP 4: Manually trigger the sync (this will test our trigger)
UPDATE driver_profiles 
SET is_available = NOT is_available, -- Toggle the current state
    updated_at = NOW()
WHERE phone = '0599313811'; -- Laila's phone

-- STEP 5: Check if the trigger worked
SELECT 
  'AFTER TRIGGER TEST' as test_phase,
  dp.first_name,
  dp.last_name,
  dp.is_available as driver_available,
  dp.status as driver_status,
  t.license_plate,
  t.is_available as truck_available,
  tt.name as truck_type,
  CASE 
    WHEN dp.is_available = t.is_available THEN '✅ SYNCED' 
    ELSE '❌ NOT SYNCED' 
  END as sync_status
FROM driver_profiles dp
LEFT JOIN trucks t ON (dp.current_truck_id = t.id OR t.current_driver_id = dp.user_id)
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 6: Set Laila back to online (since she should be online)
UPDATE driver_profiles 
SET is_available = true,
    status = 'online',
    updated_at = NOW()
WHERE phone = '0599313811';

-- STEP 7: Verify final state - should show Car Carrier as available
SELECT 
  'FINAL VERIFICATION' as test_phase,
  tt.name as truck_type,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
    THEN '✅ AVAILABLE IN CUSTOMER APP' 
    ELSE '❌ NOT AVAILABLE' 
  END as customer_app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- STEP 8: Show trigger information for confirmation
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sync_driver_truck_availability';

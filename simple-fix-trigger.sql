-- SIMPLE FIX: Just restore the working trigger function
-- No schema changes - this worked before, so we'll restore it exactly

CREATE OR REPLACE FUNCTION auto_add_approved_driver_truck()
RETURNS TRIGGER 
SECURITY DEFINER -- This bypasses RLS (this is what made it work before)
SET search_path = public
AS $$
DECLARE
    truck_type_id_to_use UUID;
    new_truck_type_id UUID;
    new_truck_id UUID;
BEGIN
    -- Only proceed if driver was just approved and truck not yet added to fleet
    IF NEW.is_approved = true 
       AND OLD.is_approved = false 
       AND NEW.truck_added_to_fleet = false 
       AND NEW.vehicle_plate IS NOT NULL 
       AND NEW.vehicle_plate != 'TBD'
       AND NEW.user_id IS NOT NULL THEN

        RAISE NOTICE 'Creating truck for approved driver: user_id=%, plate=%', NEW.user_id, NEW.vehicle_plate;

        -- Case 1: Driver selected existing truck type
        IF NEW.selected_truck_type_id IS NOT NULL AND NEW.has_custom_truck_type = false THEN
            truck_type_id_to_use := NEW.selected_truck_type_id;
            
        -- Case 2: Driver requested custom truck type
        ELSIF NEW.has_custom_truck_type = true AND NEW.custom_truck_type_name IS NOT NULL THEN
            INSERT INTO truck_types (
                name,
                description,
                payload_capacity,
                volume_capacity,
                suitable_materials,
                base_rate_per_km,
                base_rate_per_hour,
                is_active
            ) VALUES (
                NEW.custom_truck_type_name,
                COALESCE(NEW.custom_truck_description, 'Driver-requested truck type'),
                COALESCE(NEW.vehicle_max_payload, 5.0),
                COALESCE(NEW.vehicle_max_volume, 10.0),
                '["General", "Building Materials"]'::jsonb,
                2.50,
                60.00,
                true
            ) RETURNING id INTO new_truck_type_id;
            
            truck_type_id_to_use := new_truck_type_id;
            NEW.selected_truck_type_id := new_truck_type_id;
        ELSE
            -- Fallback: use default Small Truck type
            truck_type_id_to_use := (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
        END IF;

        -- Create truck exactly as it worked before
        INSERT INTO trucks (
            truck_type_id,
            license_plate,
            make,
            model,
            year,
            max_payload,
            max_volume,
            current_driver_id,
            is_available,
            is_active
        ) VALUES (
            truck_type_id_to_use,
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            COALESCE(NEW.vehicle_max_payload, 5.0),
            COALESCE(NEW.vehicle_max_volume, 10.0),
            NEW.user_id, -- This worked before
            NEW.is_available,
            true
        ) RETURNING id INTO new_truck_id;

        -- Link truck to driver profile
        NEW.current_truck_id := new_truck_id;
        NEW.truck_added_to_fleet := true;
        
        RAISE NOTICE '✅ Successfully created truck % for driver %', new_truck_id, NEW.user_id;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_add_driver_truck ON driver_profiles;
CREATE TRIGGER trigger_auto_add_driver_truck
  BEFORE UPDATE ON driver_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_approved_driver_truck();

-- Test: Show pending drivers ready for approval
SELECT 
  first_name,
  phone,
  user_id,
  approval_status,
  is_approved,
  truck_added_to_fleet,
  vehicle_plate
FROM driver_profiles 
WHERE approval_status = 'pending' OR is_approved = false;

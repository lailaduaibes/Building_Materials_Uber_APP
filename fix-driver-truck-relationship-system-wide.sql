-- COMPREHENSIVE FIX FOR DRIVER-TRUCK RELATIONSHIP
-- This fixes the issue for the entire app, not just one driver

-- 1. First, let's create a function to properly sync driver-truck relationships
CREATE OR REPLACE FUNCTION sync_driver_truck_relationship()
RETURNS TRIGGER AS $$
DECLARE
    new_truck_id UUID;
    truck_type_id_to_use UUID;
BEGIN
    -- Only proceed if driver is approved and truck not added yet
    IF NEW.is_approved = true AND NEW.truck_added_to_fleet = false AND OLD.truck_added_to_fleet = false THEN
        
        -- Get appropriate truck type
        IF NEW.selected_truck_type_id IS NOT NULL THEN
            truck_type_id_to_use := NEW.selected_truck_type_id;
        ELSE
            -- Default to first available truck type
            SELECT id INTO truck_type_id_to_use FROM truck_types LIMIT 1;
        END IF;

        -- Create the truck and get its ID
        INSERT INTO trucks (
            license_plate,
            make,
            model,
            year,
            max_payload_kg,
            max_volume_m3,
            current_driver_id,
            status,
            is_available
        ) VALUES (
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            COALESCE(NEW.vehicle_max_payload, 5.0),
            COALESCE(NEW.vehicle_max_volume, 10.0),
            NEW.user_id,
            'available',
            NEW.is_available
        ) RETURNING id INTO new_truck_id;

        -- ✅ FIX: Update the driver profile with the truck ID
        NEW.current_truck_id := new_truck_id;
        NEW.truck_added_to_fleet := true;
        
        RAISE NOTICE 'Created truck % and linked to driver % (current_truck_id: %)', 
            new_truck_id, NEW.user_id, new_truck_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_auto_add_approved_driver_truck ON driver_profiles;

CREATE TRIGGER trigger_auto_add_approved_driver_truck
    BEFORE UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_driver_truck_relationship();

-- 3. Create a function to fix existing drivers with missing current_truck_id
CREATE OR REPLACE FUNCTION fix_existing_driver_truck_relationships()
RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    truck_id UUID,
    status TEXT
) AS $$
DECLARE
    driver_record RECORD;
    truck_record RECORD;
    result_status TEXT;
BEGIN
    -- Find all approved drivers with trucks but missing current_truck_id
    FOR driver_record IN 
        SELECT 
            dp.id as driver_profile_id,
            dp.user_id,
            dp.first_name,
            dp.last_name,
            dp.current_truck_id,
            dp.vehicle_plate
        FROM driver_profiles dp
        WHERE dp.is_approved = true 
          AND dp.truck_added_to_fleet = true
          AND dp.current_truck_id IS NULL
    LOOP
        -- Find the truck assigned to this driver
        SELECT id, license_plate INTO truck_record
        FROM trucks 
        WHERE current_driver_id = driver_record.user_id
        LIMIT 1;
        
        IF truck_record.id IS NOT NULL THEN
            -- Update driver profile with truck ID
            UPDATE driver_profiles 
            SET current_truck_id = truck_record.id,
                updated_at = NOW()
            WHERE id = driver_record.driver_profile_id;
            
            result_status := 'FIXED';
        ELSE
            result_status := 'NO_TRUCK_FOUND';
        END IF;
        
        -- Return the result
        driver_id := driver_record.driver_profile_id;
        driver_name := driver_record.first_name || ' ' || driver_record.last_name;
        truck_id := truck_record.id;
        status := result_status;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 4. Run the fix for existing data
SELECT * FROM fix_existing_driver_truck_relationships();

-- 5. Verify the fix worked
SELECT 
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.current_truck_id,
    t.id as truck_id,
    t.license_plate,
    CASE 
        WHEN dp.current_truck_id = t.id AND t.current_driver_id = dp.user_id THEN '✅ SYNCED'
        WHEN dp.current_truck_id IS NULL AND t.current_driver_id = dp.user_id THEN '❌ MISSING current_truck_id'
        WHEN dp.current_truck_id IS NOT NULL AND t.current_driver_id IS NULL THEN '❌ MISSING current_driver_id'
        ELSE '❌ MISMATCH'
    END as relationship_status
FROM driver_profiles dp
LEFT JOIN trucks t ON (dp.current_truck_id = t.id OR t.current_driver_id = dp.user_id)
WHERE dp.is_approved = true
ORDER BY dp.created_at DESC;

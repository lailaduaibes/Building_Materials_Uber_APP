-- SOLUTION: Enhanced Driver Registration with Truck Type Selection
-- Part 1: Update driver_profiles table to handle truck type selection

-- Add new columns to driver_profiles for truck type selection
ALTER TABLE driver_profiles 
ADD COLUMN IF NOT EXISTS selected_truck_type_id UUID REFERENCES truck_types(id),
ADD COLUMN IF NOT EXISTS custom_truck_type_name TEXT,
ADD COLUMN IF NOT EXISTS custom_truck_description TEXT,
ADD COLUMN IF NOT EXISTS has_custom_truck_type BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS truck_added_to_fleet BOOLEAN DEFAULT false;

-- Part 2: Create trigger to automatically add trucks when driver is approved
CREATE OR REPLACE FUNCTION auto_add_approved_driver_truck()
RETURNS TRIGGER AS $$
DECLARE
    truck_type_id_to_use UUID;
    new_truck_type_id UUID;
BEGIN
    -- Only proceed if driver was just approved and truck not yet added to fleet
    IF NEW.is_approved = true 
       AND OLD.is_approved = false 
       AND NEW.truck_added_to_fleet = false 
       AND NEW.vehicle_plate IS NOT NULL 
       AND NEW.vehicle_plate != 'TBD' THEN

        -- Case 1: Driver selected existing truck type
        IF NEW.selected_truck_type_id IS NOT NULL AND NEW.has_custom_truck_type = false THEN
            truck_type_id_to_use := NEW.selected_truck_type_id;
            
        -- Case 2: Driver requested custom truck type - create new truck type
        ELSIF NEW.has_custom_truck_type = true AND NEW.custom_truck_type_name IS NOT NULL THEN
            -- Create new truck type based on driver's request
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
                5.0, -- Default payload - admin can update later
                10.0, -- Default volume - admin can update later
                '["General"]'::jsonb, -- JSONB format for suitable_materials
                2.50, -- Default rate
                60.00, -- Default hourly rate
                true
            ) RETURNING id INTO new_truck_type_id;
            
            truck_type_id_to_use := new_truck_type_id;
            
            -- Update driver profile with the new truck type ID
            NEW.selected_truck_type_id := new_truck_type_id;
        ELSE
            -- Fallback: use default Small Truck type
            truck_type_id_to_use := (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
        END IF;

        -- Add truck to fleet
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
            -- Get capacity from truck type or use defaults
            COALESCE((SELECT payload_capacity FROM truck_types WHERE id = truck_type_id_to_use), 5.0),
            COALESCE((SELECT volume_capacity FROM truck_types WHERE id = truck_type_id_to_use), 10.0),
            NEW.id, -- current_driver_id
            NEW.is_available,
            true
        );

        -- Mark truck as added to fleet
        NEW.truck_added_to_fleet := true;
        
        -- The trigger automatically handles truck addition when your existing admin dashboard approves drivers
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_add_driver_truck ON driver_profiles;
CREATE TRIGGER trigger_auto_add_driver_truck
    BEFORE UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_approved_driver_truck();

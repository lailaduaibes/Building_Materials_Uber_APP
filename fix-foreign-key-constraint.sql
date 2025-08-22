-- FIX FOREIGN KEY CONSTRAINT ERROR: trucks_current_driver_id_fkey
-- Execute this SQL to resolve the driver approval error

-- Step 1: Check if the foreign key constraint exists and what it references
-- (This is just for information - you can see the result)
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='trucks'
  AND kcu.column_name = 'current_driver_id';

-- Step 2: Fix the trigger function to NOT set current_driver_id during truck creation
-- This removes the problematic foreign key reference
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
                '["General"]'::jsonb,
                2.50, -- Default rate
                60.00, -- Default hourly rate
                true
            ) RETURNING id INTO new_truck_type_id;
            
            truck_type_id_to_use := new_truck_type_id;
            NEW.selected_truck_type_id := new_truck_type_id;
        ELSE
            -- Fallback: use default Small Truck type
            truck_type_id_to_use := (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1);
        END IF;

        -- Add truck to fleet WITHOUT setting current_driver_id
        -- This avoids the foreign key constraint error
        INSERT INTO trucks (
            truck_type_id,
            license_plate,
            make,
            model,
            year,
            max_payload,
            max_volume,
            is_available,
            is_active
            -- REMOVED: current_driver_id (this was causing the foreign key error)
        ) VALUES (
            truck_type_id_to_use,
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            COALESCE((SELECT payload_capacity FROM truck_types WHERE id = truck_type_id_to_use), 5.0),
            COALESCE((SELECT volume_capacity FROM truck_types WHERE id = truck_type_id_to_use), 10.0),
            true, -- is_available = true (truck is available when added)
            true  -- is_active = true
        );

        -- Mark truck as added to fleet
        NEW.truck_added_to_fleet := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Optional - If you want to assign the driver to the truck later,
-- you can create a separate function to do this AFTER the truck is created:
/*
CREATE OR REPLACE FUNCTION assign_driver_to_truck(driver_profile_id UUID, truck_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE trucks 
    SET current_driver_id = driver_profile_id 
    WHERE id = truck_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
*/

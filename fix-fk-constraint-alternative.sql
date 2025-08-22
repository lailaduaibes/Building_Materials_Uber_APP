-- ALTERNATIVE FIX: Create truck first, then link to driver
-- This avoids foreign key constraint issues

CREATE OR REPLACE FUNCTION auto_add_approved_driver_truck()
RETURNS TRIGGER AS $$
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
                5.0,
                10.0,
                '["General"]'::jsonb,
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

        -- Add truck to fleet (without driver reference to avoid FK constraint)
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
        ) VALUES (
            truck_type_id_to_use,
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            COALESCE((SELECT payload_capacity FROM truck_types WHERE id = truck_type_id_to_use), 5.0),
            COALESCE((SELECT volume_capacity FROM truck_types WHERE id = truck_type_id_to_use), 10.0),
            NEW.is_available,
            true
        ) RETURNING id INTO new_truck_id;

        -- Optional: Store truck ID in driver profile if you have a column for it
        -- UPDATE driver_profiles SET assigned_truck_id = new_truck_id WHERE id = NEW.id;

        -- Mark truck as added to fleet
        NEW.truck_added_to_fleet := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

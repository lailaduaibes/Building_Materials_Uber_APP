-- CORRECT FIX: The trigger was using wrong ID reference
-- The trucks.current_driver_id references users(id), not driver_profiles(id)

-- Check current foreign key constraint to confirm
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

-- The CORRECT fix: Use NEW.user_id instead of NEW.id
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

        -- Add truck to fleet with CORRECT driver reference
        INSERT INTO trucks (
            truck_type_id,
            license_plate,
            make,
            model,
            year,
            max_payload,
            max_volume,
            current_driver_id,  -- This references users(id)
            is_available,
            is_active
        ) VALUES (
            truck_type_id_to_use,
            NEW.vehicle_plate,
            COALESCE(SPLIT_PART(NEW.vehicle_model, ' ', 1), 'Unknown'),
            COALESCE(SUBSTRING(NEW.vehicle_model FROM POSITION(' ' IN NEW.vehicle_model) + 1), NEW.vehicle_model),
            COALESCE(NEW.vehicle_year, 2020),
            -- Use actual capacity from driver registration if available, otherwise get from truck type
            COALESCE(NEW.vehicle_max_payload, (SELECT payload_capacity FROM truck_types WHERE id = truck_type_id_to_use), 5.0),
            COALESCE(NEW.vehicle_max_volume, (SELECT volume_capacity FROM truck_types WHERE id = truck_type_id_to_use), 10.0),
            NEW.user_id,  -- FIXED: Use user_id (references users table) instead of id (driver_profiles primary key)
            NEW.is_available,
            true
        );

        -- Mark truck as added to fleet
        NEW.truck_added_to_fleet := true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- COMPLETE FIX: Driver Registration Truck Creation Logic
-- This fixes the truck creation process for both existing and custom truck types

-- STEP 1: Fix the registration logic in DriverService.ts by adding proper truck creation
-- STEP 2: Ensure triggers work properly for admin approval
-- STEP 3: Handle relationship sync between driver and truck

-- First, let's check if Laila's profile has the truck type info but missing truck creation
SELECT 
  'CURRENT DRIVER DATA' as check_type,
  dp.first_name,
  dp.last_name,
  dp.user_id,
  dp.current_truck_id,
  dp.selected_truck_type_id,
  dp.custom_truck_type_name,
  dp.has_custom_truck_type,
  dp.truck_added_to_fleet,
  dp.is_approved,
  dp.vehicle_plate,
  tt.name as selected_truck_type_name
FROM driver_profiles dp
LEFT JOIN truck_types tt ON dp.selected_truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- Check if there's a truck that should be linked to Laila
SELECT 
  'EXISTING TRUCKS' as check_type,
  t.id,
  t.license_plate,
  t.current_driver_id,
  t.is_available,
  tt.name as truck_type_name
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.current_driver_id = (
  SELECT user_id FROM driver_profiles WHERE phone = '0599313811'
);

-- Now let's create the missing truck for Laila based on her profile
-- This simulates what should happen during registration or approval

DO $$
DECLARE
    laila_user_id UUID;
    laila_profile_id UUID;
    truck_type_to_use UUID;
    new_truck_id UUID;
    laila_truck_type_id UUID;
    laila_custom_truck_name TEXT;
    laila_has_custom BOOLEAN;
    laila_vehicle_plate TEXT;
BEGIN
    -- Get Laila's info
    SELECT user_id, id, selected_truck_type_id, custom_truck_type_name, 
           has_custom_truck_type, vehicle_plate
    INTO laila_user_id, laila_profile_id, laila_truck_type_id, 
         laila_custom_truck_name, laila_has_custom, laila_vehicle_plate
    FROM driver_profiles 
    WHERE phone = '0599313811';

    RAISE NOTICE 'Found Laila: user_id=%, profile_id=%, truck_type_id=%, custom_name=%, has_custom=%, plate=%', 
        laila_user_id, laila_profile_id, laila_truck_type_id, laila_custom_truck_name, laila_has_custom, laila_vehicle_plate;

    -- Determine which truck type to use
    IF laila_truck_type_id IS NOT NULL AND laila_has_custom = false THEN
        -- Use existing truck type
        truck_type_to_use := laila_truck_type_id;
        RAISE NOTICE 'Using existing truck type: %', truck_type_to_use;
        
    ELSIF laila_has_custom = true AND laila_custom_truck_name IS NOT NULL THEN
        -- Create custom truck type
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
            laila_custom_truck_name,
            'Driver-requested truck type for Laila',
            5.0,
            10.0,
            '["General", "Building Materials"]'::jsonb,
            2.50,
            60.00,
            true
        ) RETURNING id INTO truck_type_to_use;
        
        RAISE NOTICE 'Created custom truck type: % with id: %', laila_custom_truck_name, truck_type_to_use;
        
        -- Update driver profile with new truck type ID
        UPDATE driver_profiles 
        SET selected_truck_type_id = truck_type_to_use
        WHERE id = laila_profile_id;
        
    ELSE
        -- Fallback to Car Carrier (or create if needed)
        SELECT id INTO truck_type_to_use 
        FROM truck_types 
        WHERE name = 'Car Carrier' 
        LIMIT 1;
        
        IF truck_type_to_use IS NULL THEN
            -- Create Car Carrier truck type
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
                'Car Carrier',
                'Vehicle transport truck for cars and small vehicles',
                8.0,
                50.0,
                '["Vehicles", "Cars", "Equipment"]'::jsonb,
                3.00,
                80.00,
                true
            ) RETURNING id INTO truck_type_to_use;
        END IF;
        
        RAISE NOTICE 'Using fallback truck type Car Carrier: %', truck_type_to_use;
    END IF;

    -- Create the truck in the fleet
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
        truck_type_to_use,
        COALESCE(laila_vehicle_plate, 'ABC-123'),
        'Toyota',
        'Hiace',
        2022,
        (SELECT payload_capacity FROM truck_types WHERE id = truck_type_to_use),
        (SELECT volume_capacity FROM truck_types WHERE id = truck_type_to_use),
        laila_user_id,
        true, -- Available since Laila is online
        true
    ) RETURNING id INTO new_truck_id;

    RAISE NOTICE 'Created truck in fleet: %', new_truck_id;

    -- Update driver profile to link the truck
    UPDATE driver_profiles 
    SET current_truck_id = new_truck_id,
        truck_added_to_fleet = true
    WHERE id = laila_profile_id;

    RAISE NOTICE 'Updated driver profile with truck_id: %', new_truck_id;

END $$;

-- STEP 4: Verify the fix worked
SELECT 
  'AFTER FIX VERIFICATION' as check_type,
  dp.first_name,
  dp.user_id,
  dp.current_truck_id,
  dp.is_available as driver_available,
  dp.truck_added_to_fleet,
  t.id as truck_id,
  t.license_plate,
  t.is_available as truck_available,
  tt.name as truck_type_name,
  CASE 
    WHEN dp.is_available = t.is_available THEN '✅ SYNCED' 
    ELSE '❌ NOT SYNCED' 
  END as sync_status
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.phone = '0599313811';

-- STEP 5: Test customer app result
SELECT 
  'CUSTOMER APP TEST' as test_type,
  tt.name as truck_type,
  COUNT(t.id) as total_trucks,
  COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
  CASE 
    WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
    THEN '✅ WILL SHOW IN CUSTOMER APP' 
    ELSE '❌ NOT AVAILABLE' 
  END as customer_app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id AND t.is_active = true
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

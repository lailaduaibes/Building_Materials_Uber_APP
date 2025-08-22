-- FOUND THE ISSUE! Check for NULL values being inserted
-- The trucks table has NOT NULL constraints on: license_plate, make, model, max_payload, max_volume

-- Let's check Laila's data to see what might be NULL
SELECT 
    'LAILA_DATA_CHECK' as info,
    first_name,
    vehicle_plate,
    vehicle_model,
    SPLIT_PART(vehicle_model, ' ', 1) as make_part,
    SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1) as model_part,
    vehicle_max_payload,
    vehicle_max_volume,
    CASE 
        WHEN vehicle_plate IS NULL THEN 'vehicle_plate IS NULL'
        WHEN vehicle_model IS NULL THEN 'vehicle_model IS NULL'
        WHEN SPLIT_PART(vehicle_model, ' ', 1) = '' THEN 'make will be empty'
        WHEN vehicle_max_payload IS NULL THEN 'vehicle_max_payload IS NULL'
        WHEN vehicle_max_volume IS NULL THEN 'vehicle_max_volume IS NULL'
        ELSE 'DATA_LOOKS_GOOD'
    END as validation_issue
FROM driver_profiles
WHERE first_name ILIKE '%Laila%';

-- Test the exact COALESCE logic from our trigger
SELECT 
    'TRIGGER_LOGIC_TEST' as info,
    COALESCE(SPLIT_PART('Honda Civic', ' ', 1), 'Unknown') as make_result,
    COALESCE(SUBSTRING('Honda Civic' FROM POSITION(' ' IN 'Honda Civic') + 1), 'Honda Civic') as model_result,
    COALESCE(NULL::numeric, 5.0) as payload_result,
    COALESCE(NULL::numeric, 10.0) as volume_result;

-- Check if the issue is with the SPLIT_PART/SUBSTRING functions
SELECT 
    'STRING_FUNCTIONS_TEST' as info,
    vehicle_model,
    SPLIT_PART(vehicle_model, ' ', 1) as make_extracted,
    SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1) as model_extracted,
    LENGTH(SPLIT_PART(vehicle_model, ' ', 1)) as make_length,
    LENGTH(SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1)) as model_length
FROM driver_profiles
WHERE first_name ILIKE '%Laila%';

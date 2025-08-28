-- Check actual user data from registration (corrected column names)
SELECT id, email, first_name, last_name, phone, user_type, role, created_at
FROM users
WHERE user_type = 'driver' OR role = 'driver'
ORDER BY created_at DESC
LIMIT 10;

-- Check actual driver profile data (corrected column names)
SELECT 
    dp.id,
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.years_experience,
    dp.max_distance_km,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_max_payload,
    dp.vehicle_max_volume,
    dp.is_available,
    dp.status,
    dp.approval_status,
    dp.is_approved,
    dp.specializations,
    dp.preferred_truck_types,
    u.email,
    u.first_name as user_first_name,
    u.last_name as user_last_name
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
ORDER BY dp.created_at DESC
LIMIT 10;

-- Check actual vehicle/truck data (corrected column names - no driver_id)
SELECT 
    id,
    truck_type_id,
    license_plate,
    make,
    model,
    year,
    color,
    max_payload,
    max_volume,
    current_driver_id,
    is_available,
    is_active,
    rate_per_km,
    rate_per_hour,
    created_at
FROM trucks
ORDER BY created_at DESC
LIMIT 10;

-- Check actual trip data with customer information (corrected column names)
SELECT 
    tr.id,
    tr.customer_id,
    tr.assigned_driver_id,
    tr.assigned_truck_id,
    tr.status,
    tr.pickup_address,
    tr.delivery_address,
    tr.material_type,
    tr.estimated_weight_tons,
    tr.estimated_volume_m3,
    tr.load_description,
    customer.first_name as customer_first_name,
    customer.last_name as customer_last_name,
    customer.phone as customer_phone,
    customer.email as customer_email,
    driver.first_name as driver_first_name,
    driver.last_name as driver_last_name
FROM trip_requests tr
LEFT JOIN users customer ON tr.customer_id = customer.id
LEFT JOIN users driver ON tr.assigned_driver_id = driver.id
ORDER BY tr.created_at DESC
LIMIT 10;

-- Check driver documents
SELECT 
    dd.id,
    dd.driver_id,
    dd.document_type,
    dd.document_url,
    dd.status,
    dd.uploaded_at,
    dd.verified_at,
    dp.first_name,
    dp.last_name
FROM driver_documents dd
JOIN driver_profiles dp ON dd.driver_id = dp.id
ORDER BY dd.uploaded_at DESC
LIMIT 10;

-- Check what truck types are available
SELECT 
    id,
    name,
    description,
    max_payload_kg,
    max_volume_m3,
    base_rate_per_km,
    features
FROM truck_types
ORDER BY name;

-- Get complete driver profile with all registration data
SELECT 
    u.id as user_id,
    u.email,
    u.first_name as user_first_name,
    u.last_name as user_last_name,
    u.phone as user_phone,
    u.user_type,
    u.role,
    u.is_active,
    u.created_at as user_created_at,
    dp.id as profile_id,
    dp.first_name as profile_first_name,
    dp.last_name as profile_last_name,
    dp.phone as profile_phone,
    dp.years_experience,
    dp.specializations,
    dp.rating,
    dp.total_trips,
    dp.total_earnings,
    dp.is_available,
    dp.max_distance_km,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_max_payload,
    dp.vehicle_max_volume,
    dp.status,
    dp.approval_status,
    dp.is_approved,
    dp.profile_image_url,
    dp.preferred_truck_types,
    dp.selected_truck_type_id,
    dp.custom_truck_type_name,
    dp.has_custom_truck_type
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.user_type = 'driver' OR u.role = 'driver'
ORDER BY u.created_at DESC;

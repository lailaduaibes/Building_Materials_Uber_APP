-- Updated queries to get real driver registration data for the app

-- Get complete driver data for profile screen (using actual database structure)
SELECT 
    -- User basic info
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.user_type,
    u.role,
    u.is_active,
    u.created_at,
    u.current_latitude,
    u.current_longitude,
    u.is_online,
    
    -- Driver profile detailed info  
    dp.id as driver_profile_id,
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
    dp.preferred_truck_types,
    
    -- Vehicle information from driver profile
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_max_payload,
    dp.vehicle_max_volume,
    
    -- Approval and status
    dp.status,
    dp.approval_status,
    dp.is_approved,
    dp.profile_image_url,
    
    -- Truck type information
    dp.selected_truck_type_id,
    dp.custom_truck_type_name,
    dp.custom_truck_description,
    dp.has_custom_truck_type,
    dp.truck_added_to_fleet,
    
    -- Current truck assignment
    dp.current_truck_id,
    
    -- Activity tracking
    dp.last_seen,
    dp.application_submitted_at,
    dp.approved_at
    
FROM users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE (u.user_type = 'driver' OR u.role = 'driver')
  AND u.email = 'DRIVER_EMAIL_HERE'  -- Replace with actual logged-in driver email
ORDER BY u.created_at DESC
LIMIT 1;

-- Get driver's assigned trucks from the fleet
SELECT 
    t.id,
    t.truck_type_id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.color,
    t.max_payload,
    t.max_volume,
    t.current_driver_id,
    t.is_available,
    t.is_active,
    t.rate_per_km,
    t.rate_per_hour,
    t.current_latitude,
    t.current_longitude,
    t.current_address,
    t.created_at,
    
    -- Truck type details
    tt.name as truck_type_name,
    tt.description as truck_type_description,
    tt.max_payload_kg,
    tt.max_volume_m3,
    tt.base_rate_per_km,
    tt.features
    
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.current_driver_id = 'DRIVER_PROFILE_ID_HERE'  -- Replace with actual driver profile ID
ORDER BY t.created_at DESC;

-- Get driver's uploaded documents
SELECT 
    dd.id,
    dd.driver_id,
    dd.document_type,
    dd.document_url,
    dd.status,
    dd.uploaded_at,
    dd.verified_at,
    
    -- Document type reference
    dtr.name as document_type_name,
    dtr.description as document_type_description,
    dtr.is_required
    
FROM driver_documents dd
LEFT JOIN document_types_reference dtr ON dd.document_type = dtr.type
WHERE dd.driver_id = 'DRIVER_PROFILE_ID_HERE'  -- Replace with actual driver profile ID
ORDER BY dd.uploaded_at DESC;

-- Get driver's recent trips for statistics
SELECT 
    tr.id,
    tr.status,
    tr.material_type,
    tr.estimated_weight_tons,
    tr.estimated_volume_m3,
    tr.final_price,
    tr.customer_rating,
    tr.created_at,
    tr.delivered_at,
    
    -- Customer info
    customer.first_name as customer_first_name,
    customer.last_name as customer_last_name,
    customer.phone as customer_phone,
    
    -- Trip addresses (JSONB fields)
    tr.pickup_address,
    tr.delivery_address
    
FROM trip_requests tr
LEFT JOIN users customer ON tr.customer_id = customer.id
WHERE tr.assigned_driver_id = 'DRIVER_USER_ID_HERE'  -- Replace with actual driver user ID
ORDER BY tr.created_at DESC
LIMIT 20;

-- Get available truck types for driver preferences
SELECT 
    id,
    name,
    description,
    max_payload_kg,
    max_volume_m3,
    base_rate_per_km,
    features
FROM truck_types
WHERE is_active = true
ORDER BY name;

# Manual SQL Queries to Check User Truck Request Data in Supabase

Use these SQL queries in your Supabase SQL Editor to check the data:

## 1. Check All Tables Structure

```sql
-- List all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 2. Check Users Data

```sql
-- Get all users with their types and locations
SELECT 
    id,
    email,
    full_name,
    phone,
    user_type,
    role,
    is_online,
    current_latitude,
    current_longitude,
    last_location_update,
    created_at
FROM public.users
ORDER BY created_at DESC;
```

## 3. Check Trip Requests (Truck Requests)

```sql
-- Get all trip requests with customer details
SELECT 
    tr.id,
    tr.customer_id,
    u.email as customer_email,
    u.full_name as customer_name,
    u.phone as customer_phone,
    tr.pickup_address,
    tr.delivery_address,
    tr.pickup_latitude,
    tr.pickup_longitude,
    tr.delivery_latitude,
    tr.delivery_longitude,
    tr.materials_description,
    tr.estimated_weight_kg,
    tr.estimated_volume_m3,
    tr.quoted_price,
    tr.final_price,
    tr.status,
    tr.assigned_driver_id,
    tr.assigned_truck_id,
    tr.created_at,
    tr.matched_at,
    tr.delivered_at
FROM public.trip_requests tr
LEFT JOIN public.users u ON tr.customer_id = u.id
ORDER BY tr.created_at DESC;
```

## 4. Check Recent Trip Requests (Last 24 hours)

```sql
-- Get recent trip requests
SELECT 
    tr.id,
    u.email as customer_email,
    tr.pickup_address,
    tr.delivery_address,
    tr.materials_description,
    tr.status,
    tr.created_at
FROM public.trip_requests tr
LEFT JOIN public.users u ON tr.customer_id = u.id
WHERE tr.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY tr.created_at DESC;
```

## 5. Check Trip Requests by Status

```sql
-- Get trip requests by status
SELECT 
    status,
    COUNT(*) as count
FROM public.trip_requests
GROUP BY status
ORDER BY count DESC;

-- Get pending requests
SELECT 
    tr.id,
    u.email as customer_email,
    tr.pickup_address,
    tr.delivery_address,
    tr.materials_description,
    tr.created_at
FROM public.trip_requests tr
LEFT JOIN public.users u ON tr.customer_id = u.id
WHERE tr.status = 'pending'
ORDER BY tr.created_at DESC;
```

## 6. Check Trip Tracking Data

```sql
-- Get real-time tracking data
SELECT 
    tt.id,
    tt.trip_id,
    tr.pickup_address,
    tr.delivery_address,
    tt.current_latitude,
    tt.current_longitude,
    tt.heading,
    tt.speed_kmh,
    tt.distance_to_destination_km,
    tt.estimated_arrival,
    tt.status_update,
    tt.created_at
FROM public.trip_tracking tt
LEFT JOIN public.trip_requests tr ON tt.trip_id = tr.id
ORDER BY tt.created_at DESC;
```

## 7. Check Driver Data

```sql
-- Get all drivers
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.phone,
    u.user_type,
    u.is_online,
    u.current_latitude,
    u.current_longitude,
    dp.license_number,
    dp.vehicle_info,
    dp.is_verified,
    dp.is_available,
    dp.rating
FROM public.users u
LEFT JOIN public.driver_profiles dp ON u.id = dp.user_id
WHERE u.user_type = 'driver'
ORDER BY u.created_at DESC;
```

## 8. Check Trucks Data

```sql
-- Get all trucks
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.color,
    t.is_active,
    t.current_driver_id,
    tt.name as truck_type,
    tt.payload_capacity,
    tt.volume_capacity
FROM public.trucks t
LEFT JOIN public.truck_types tt ON t.truck_type_id = tt.id
ORDER BY t.license_plate;
```

## 9. Check Truck Types

```sql
-- Get all truck types
SELECT 
    id,
    name,
    description,
    payload_capacity,
    volume_capacity,
    suitable_materials,
    base_rate_per_km,
    base_rate_per_hour,
    is_active
FROM public.truck_types
ORDER BY name;
```

## 10. Get Complete Trip Details with All Related Data

```sql
-- Complete trip overview with customer, driver, and truck details
SELECT 
    tr.id as trip_id,
    tr.status,
    tr.created_at,
    
    -- Customer details
    cu.email as customer_email,
    cu.full_name as customer_name,
    cu.phone as customer_phone,
    
    -- Trip details
    tr.pickup_address,
    tr.delivery_address,
    tr.materials_description,
    tr.estimated_weight_kg,
    tr.quoted_price,
    tr.final_price,
    
    -- Driver details
    dr.email as driver_email,
    dr.full_name as driver_name,
    dr.phone as driver_phone,
    
    -- Truck details
    t.license_plate,
    t.make,
    t.model,
    tt.name as truck_type
    
FROM public.trip_requests tr
LEFT JOIN public.users cu ON tr.customer_id = cu.id
LEFT JOIN public.users dr ON tr.assigned_driver_id = dr.id
LEFT JOIN public.trucks t ON tr.assigned_truck_id = t.id
LEFT JOIN public.truck_types tt ON t.truck_type_id = tt.id
ORDER BY tr.created_at DESC
LIMIT 10;
```

## 11. Check for Specific User's Requests

```sql
-- Replace 'user_email@example.com' with the actual email
SELECT 
    tr.id,
    tr.pickup_address,
    tr.delivery_address,
    tr.materials_description,
    tr.status,
    tr.quoted_price,
    tr.created_at
FROM public.trip_requests tr
LEFT JOIN public.users u ON tr.customer_id = u.id
WHERE u.email = 'user_email@example.com'
ORDER BY tr.created_at DESC;
```

## 12. Check Database Health

```sql
-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM public.users
UNION ALL
SELECT 'trip_requests', COUNT(*) FROM public.trip_requests
UNION ALL
SELECT 'trip_tracking', COUNT(*) FROM public.trip_tracking
UNION ALL
SELECT 'driver_profiles', COUNT(*) FROM public.driver_profiles
UNION ALL
SELECT 'trucks', COUNT(*) FROM public.trucks
UNION ALL
SELECT 'truck_types', COUNT(*) FROM public.truck_types;
```

## How to Use:

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** → Click on "SQL Editor" in the left sidebar
3. **Run Queries** → Copy and paste any of the above queries
4. **Execute** → Click "Run" to see the results

## Key Points:

- **trip_requests** table contains all truck delivery requests
- **users** table contains both customers and drivers (identified by `user_type`)
- **trip_tracking** table contains real-time location data
- **driver_profiles** table has additional driver information
- **trucks** table contains vehicle information

Start with query #3 to see all trip requests, then use specific queries based on what you need to investigate.

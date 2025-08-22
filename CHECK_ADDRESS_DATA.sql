-- CHECK ADDRESS DATA FORMATS
-- Run these to see the actual address data structure

-- Check trip_requests address formats
SELECT 
  id,
  pickup_address,
  delivery_address,
  status,
  material_type
FROM trip_requests 
WHERE pickup_address IS NOT NULL 
LIMIT 3;

-- Check orders address formats  
SELECT 
  id,
  pickup_address,
  delivery_address,
  status,
  order_type
FROM orders 
WHERE pickup_address IS NOT NULL 
LIMIT 3;

-- Check for any NULL addresses
SELECT 
  'trip_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(pickup_address) as has_pickup,
  COUNT(delivery_address) as has_delivery
FROM trip_requests
UNION ALL
SELECT 
  'orders' as table_name,
  COUNT(*) as total_records,
  COUNT(pickup_address) as has_pickup,
  COUNT(delivery_address) as has_delivery  
FROM orders;

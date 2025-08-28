# Compatible ASAP Trip Matching Setup

## 🎯 Executive Summary

This implementation works with your **existing database structure** - no major changes needed! It uses your current `trip_requests` and `driver_locations` tables.

## 📋 Step-by-Step Setup

### Step 1: Run Database Compatibility Update
```bash
# Execute the compatibility SQL
psql -d your_database -f compatible-asap-implementation.sql
```

### Step 2: Test the Setup
```sql
-- Test the nearby drivers function
SELECT * FROM find_nearby_drivers(25.276987, 55.296249, 10, 5);

-- Check active trip requests view
SELECT * FROM active_trip_requests;
```

### Step 3: Create a Test ASAP Trip Request
```sql
-- Insert a test ASAP trip request
INSERT INTO trip_requests (
    customer_id, 
    pickup_latitude, pickup_longitude, pickup_address,
    delivery_latitude, delivery_longitude, delivery_address,
    material_type, load_description,
    pickup_time_preference, estimated_duration_minutes, quoted_price
) VALUES (
    gen_random_uuid(), -- customer_id
    25.276987, 55.296249, '{"address": "Dubai Marina"}',
    25.197197, 55.274376, '{"address": "Downtown Dubai"}',
    'Steel Rebar', 'Construction materials delivery',
    'asap', 45, 150.00
) RETURNING id;
```

### Step 4: Test ASAP Matching
```typescript
// In your React Native app
import { compatibleTripMatchingService } from './services/CompatibleTripMatchingService';

// Trigger ASAP matching for the trip request ID from step 3
const success = await compatibleTripMatchingService.matchASAPTrip('your-trip-request-id');
console.log('ASAP matching result:', success);
```

## 🔌 Integration with Your Existing Apps

### Customer App Integration
Add to your order creation flow:

```typescript
// In customer app order creation
const createOrder = async (orderData) => {
  try {
    // Create trip request in database (your existing API call)
    const response = await fetch('/api/trip-requests', {
      method: 'POST',
      body: JSON.stringify({
        ...orderData,
        pickup_time_preference: 'asap' // or 'scheduled'
      })
    });
    
    const result = await response.json();
    
    // If ASAP trip, trigger matching
    if (orderData.pickup_time_preference === 'asap') {
      // This can be called from client or server
      compatibleTripMatchingService.matchASAPTrip(result.tripRequestId);
    }
    
    return result;
  } catch (error) {
    console.error('Order creation error:', error);
  }
};
```

### Driver App Integration
Add to your driver dashboard:

```typescript
// In ProfessionalDriverDashboard.tsx
import { ASAPTripRequestHandler } from '../components/ASAPTripRequestHandler';

export const ProfessionalDriverDashboard = () => {
  // ... existing code ...
  
  return (
    <View style={styles.container}>
      {/* Your existing dashboard content */}
      
      {/* Add ASAP trip request handling */}
      <ASAPTripRequestHandler
        isDriverOnline={isOnline}
        onTripAccepted={async (tripId) => {
          console.log('✅ Trip accepted:', tripId);
          // Refresh your accepted trips list
          await loadAcceptedTrips();
        }}
        onTripDeclined={(tripId) => {
          console.log('❌ Trip declined:', tripId);
        }}
      />
    </View>
  );
};
```

## 🔄 How It Works with Your Schema

### Using Existing trip_requests Table:
- **Original trip request**: Customer creates trip → inserted into `trip_requests`
- **Driver-specific requests**: For each nearby driver → new row in `trip_requests` with `trip_id` referencing original
- **Status tracking**: Uses your existing `status` column with new values: `pending`, `accepted`, `declined`, `expired`

### Using Existing driver_locations Table:
- **Proximity matching**: Uses your `latitude`, `longitude`, `updated_at` fields
- **Distance calculation**: SQL function calculates distances in kilometers
- **Active drivers**: Only drivers with recent location updates (last 5 minutes)

### Workflow:
```
1. Customer creates ASAP trip request
   ↓
2. Original request inserted into trip_requests table
   ↓  
3. System finds nearby drivers from driver_locations
   ↓
4. Creates child requests in trip_requests (one per driver)
   ↓
5. Driver app polls/subscribes for requests where driver_id = current_user
   ↓
6. Driver sees popup modal with 15-second timer
   ↓
7. Driver accepts → status = 'accepted', assign trip
8. Driver declines → status = 'declined', try next driver
9. Timeout → status = 'expired', try next driver
```

## 🧪 Testing Commands

```sql
-- 1. Check if setup worked
SELECT 'Setup successful!' WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'find_nearby_drivers'
);

-- 2. Add test driver location
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000', -- Replace with real driver ID
    25.276987, 55.296249, NOW()
);

-- 3. Test proximity search
SELECT * FROM find_nearby_drivers(25.276987, 55.296249, 10, 5);

-- 4. Check active requests
SELECT * FROM active_trip_requests;

-- 5. Monitor matching process
SELECT 
    tr.id,
    tr.status,
    tr.driver_id,
    tr.acceptance_deadline,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining
FROM trip_requests tr
WHERE tr.pickup_time_preference = 'asap'
ORDER BY tr.created_at DESC
LIMIT 10;
```

## ✅ Compatibility Checklist

- ✅ **Works with existing trip_requests table**
- ✅ **Uses existing driver_locations table**  
- ✅ **No breaking changes to current apps**
- ✅ **Scheduled trips still work as before**
- ✅ **ASAP trips get Uber-style matching**
- ✅ **RLS policies for security**
- ✅ **Proper indexes for performance**

## 🚀 Go Live Process

1. **Run `compatible-asap-implementation.sql`** (adds functions, indexes, policies)
2. **Test with sample data** (insert test trip request)
3. **Update customer app** to call matching service for ASAP trips
4. **Update driver app** to include ASAPTripRequestHandler component
5. **Monitor logs** and database for successful matching

The system is designed to be **non-disruptive** - if ASAP matching fails, trips fall back to your existing manual assignment system.

## 🔧 Configuration

Adjust these values in `CompatibleTripMatchingService.ts`:
```typescript
private readonly ACCEPTANCE_TIMEOUT = 15000; // 15 seconds (Uber-like)
private readonly MAX_SEARCH_RADIUS = 10; // 10 km search radius
private readonly MAX_DRIVERS_TO_TRY = 5; // Try up to 5 drivers
```

Ready to transform your ASAP trips into a true real-time dispatch system! 🚀

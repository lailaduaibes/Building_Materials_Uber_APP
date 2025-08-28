# ASAP Trip Matching Integration Guide

This guide shows how to integrate the new Uber-style ASAP trip matching system into the existing YouMats driver app.

## 🗂️ Files Created

### Core Services
1. **`TripMatchingService.ts`** - Real-time trip matching engine
2. **`TripRequestService.ts`** - Driver-side request handling
3. **`ASAPTripTrigger.ts`** - Integration helper for triggering matching

### React Components
1. **`TripRequestModal.tsx`** - Uber-style trip request popup
2. **`ASAPTripRequestHandler.tsx`** - Integration component
3. **`useTripRequests.ts`** - React hook for trip request management

### Database
1. **`create-trip-requests-table.sql`** - Database schema for real-time matching

## 📋 Integration Steps

### Step 1: Run Database Migration
```sql
-- Run the SQL file to create required tables
\i create-trip-requests-table.sql
```

### Step 2: Integrate into Driver Dashboard

Add to your existing `ProfessionalDriverDashboard.tsx`:

```tsx
import { ASAPTripRequestHandler } from '../components';

export const ProfessionalDriverDashboard = () => {
  // ... existing code ...

  return (
    <View style={styles.container}>
      {/* Your existing dashboard content */}
      
      {/* Add ASAP trip request handling */}
      <ASAPTripRequestHandler
        isDriverOnline={isOnline}
        onTripAccepted={(tripId) => {
          console.log('Trip accepted:', tripId);
          // Refresh accepted trips
          loadAcceptedTrips();
        }}
        onTripDeclined={(tripId) => {
          console.log('Trip declined:', tripId);
          // Could update analytics
        }}
      />
    </View>
  );
};
```

### Step 3: Trigger ASAP Matching on Order Creation

#### Client-side (in OrderScreens.tsx):
```tsx
import { ASAPTripTrigger } from '../services/ASAPTripTrigger';

const createOrder = async () => {
  // ... existing order creation code ...
  
  const orderData = {
    // ... existing fields ...
    pickupTimePreference: pickupTimePreference, // 'asap' or 'scheduled'
    scheduledPickupTime: pickupTime || null,
  };

  const response = await fetch(API_ENDPOINTS.orders, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(orderData),
  });

  if (response.ok) {
    const result = await response.json();
    
    // Trigger ASAP matching if needed (client-side)
    if (pickupTimePreference === 'asap' && result.tripId) {
      ASAPTripTrigger.triggerASAPMatching(result.tripId);
    }
    
    Alert.alert('Success', 'Order created successfully!');
  }
};
```

#### Server-side (in your backend API):
```javascript
// In your order creation endpoint
app.post('/api/orders', async (req, res) => {
  try {
    // Create the trip in database
    const trip = await createTripInDatabase(req.body);
    
    // If ASAP trip, trigger real-time matching
    if (trip.pickup_time_preference === 'asap') {
      // Import and use the matching service
      const { tripMatchingService } = require('./services/TripMatchingService');
      
      // Start matching asynchronously (don't block response)
      setImmediate(() => {
        tripMatchingService.matchASAPTrip(trip.id);
      });
    }
    
    res.json({ success: true, tripId: trip.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Step 4: Update Driver Location Tracking

Ensure drivers' locations are being tracked for proximity matching:

```tsx
// In your driver dashboard useEffect
useEffect(() => {
  if (isOnline) {
    // Start location tracking
    driverLocationService.startTracking();
    
    // Update location every 30 seconds
    const locationInterval = setInterval(() => {
      updateDriverLocation();
    }, 30000);
    
    return () => {
      clearInterval(locationInterval);
      driverLocationService.stopTracking();
    };
  }
}, [isOnline]);
```

## 🔄 How It Works

### ASAP Trip Flow:
1. **Customer creates ASAP order** → `pickup_time_preference: 'asap'`
2. **Backend triggers matching** → `tripMatchingService.matchASAPTrip(tripId)`
3. **System finds nearby drivers** → Based on location & vehicle compatibility
4. **Sends request to closest driver** → Via database + real-time subscription
5. **Driver sees popup modal** → 15-second countdown to accept/decline
6. **If declined/timeout** → Goes to next closest driver
7. **If accepted** → Trip assigned, customer notified

### Scheduled Trip Flow:
1. **Customer creates scheduled order** → `pickup_time_preference: 'scheduled'`
2. **Trip goes to normal pool** → Available for drivers to browse and accept
3. **No real-time matching** → Uses existing system

## 🎯 Key Benefits

- **Real Uber-like experience** for ASAP trips
- **Maintains existing flow** for scheduled trips  
- **15-second response time** creates urgency
- **Proximity-based matching** ensures efficiency
- **Fallback to next driver** prevents failed requests
- **Non-blocking integration** doesn't affect existing features

## 🔧 Configuration

### Matching Parameters (in TripMatchingService.ts):
```typescript
private readonly ACCEPTANCE_TIMEOUT = 15000; // 15 seconds
private readonly MAX_SEARCH_RADIUS = 10; // 10 km max
private readonly MAX_DRIVERS_TO_TRY = 5; // Try up to 5 drivers
```

### Polling Frequency (in TripRequestService.ts):
```typescript
// Fallback polling every 5 seconds
this.pollInterval = setInterval(() => {
  this.checkForPendingRequests();
}, 5000);
```

## 🐛 Troubleshooting

### Common Issues:

1. **No drivers receiving requests:**
   - Check `driver_locations` table has recent data
   - Verify RLS policies allow reading
   - Ensure drivers are marked as `online` and `available`

2. **Timeout issues:**
   - Check system clock synchronization
   - Verify `acceptance_deadline` calculation
   - Monitor network connectivity

3. **Real-time not working:**
   - Check Supabase real-time is enabled
   - Verify subscription channels are unique
   - Monitor console for connection errors

### Debug Mode:
Enable detailed logging by adding to your app:
```tsx
// Enable debug mode
console.log('🐛 Debug mode enabled');
window.__TRIP_MATCHING_DEBUG__ = true;
```

## 🚀 Next Steps

1. **Test with mock data** using the database
2. **Add push notifications** for background requests
3. **Implement surge pricing** for high-demand periods
4. **Add driver acceptance analytics** 
5. **Create admin dashboard** to monitor matching performance

This system transforms YouMats from a job board model to a true on-demand delivery platform for ASAP requests while keeping the existing scheduled trip functionality intact.

# 🧪 Testing the Push Notification System

## 📋 **Step-by-Step Testing Guide**

### **1. Database Setup ✅**
You've already run the SQL to create the notification infrastructure. Great!

### **2. Test the Notification Service**

#### **Option A: Use the Test Panel in App**
1. Open your customer app
2. Navigate to the LiveTrackingScreenTrip
3. Tap the 🔔 notification button in the top right
4. Test different notification types

#### **Option B: Manual Database Testing**
Run these SQL commands in Supabase to test:

```sql
-- Test 1: Send a trip status notification
INSERT INTO notifications (user_id, trip_id, title, message, type, data) 
VALUES (
  'your-user-id-here',
  'your-trip-id-here', 
  'Driver Found!',
  'John Smith is on the way to pickup location',
  'status_update',
  '{"driver_name": "John Smith", "eta_minutes": 15}'
);

-- Test 2: Send an ETA update
INSERT INTO notifications (user_id, trip_id, title, message, type, data)
VALUES (
  'your-user-id-here',
  'your-trip-id-here',
  'ETA Updated', 
  'New estimated arrival time: 12 minutes',
  'eta_update',
  '{"new_eta": 12}'
);

-- Test 3: Send arrival notification
INSERT INTO notifications (user_id, trip_id, title, message, type, data)
VALUES (
  'your-user-id-here',
  'your-trip-id-here',
  'Driver Arrived!',
  'Your driver has arrived at the pickup location',
  'arrival',
  '{"location": "pickup"}'
);

-- Test 4: Check notifications were created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### **3. Real User IDs for Testing**

To get actual user and trip IDs for testing:

```sql
-- Get recent trip requests with user info
SELECT 
  tr.id as trip_id,
  tr.customer_id as user_id,
  tr.status,
  tr.assigned_driver_id,
  u.first_name,
  u.last_name,
  u.email
FROM trip_requests tr
LEFT JOIN users u ON tr.customer_id = u.id
ORDER BY tr.created_at DESC
LIMIT 5;
```

### **4. Test Real-time Subscriptions**

1. Open the app and go to a trip tracking screen
2. Keep the app open
3. Run the notification INSERT SQL commands above
4. You should see notifications appear in real-time!

### **5. Expected Behavior**

#### **✅ What Should Happen:**
- 🔔 Local notification appears immediately
- 📱 Badge count updates
- 🔄 Real-time subscription triggers in app
- 📊 UI updates with new status
- 🎵 Sound plays (if enabled)

#### **❌ Troubleshooting:**
- **No notifications?** Check device permissions
- **No real-time updates?** Check internet connection
- **Errors in console?** Check Supabase keys and setup

---

## 🚀 **Production Integration**

### **Add to Your App Initialization:**

```typescript
// In your main App.tsx or equivalent
import { initializeNotificationService, setupUserNotifications } from './utils/NotificationSetup';

// During app startup
useEffect(() => {
  const setup = async () => {
    const result = await initializeNotificationService();
    if (result.success) {
      console.log('✅ Notifications ready');
      
      // Setup for current user
      if (currentUser?.id) {
        setupUserNotifications(currentUser.id);
      }
    }
  };
  
  setup();
}, []);
```

### **Add to Trip Tracking Screen:**

```typescript
// In LiveTrackingScreenTrip.tsx (already added)
import { setupTripNotifications } from '../utils/NotificationSetup';

useEffect(() => {
  if (tripId) {
    setupTripNotifications(tripId);
  }
  
  return () => {
    // Cleanup when leaving screen
    enhancedNotificationService.unsubscribe(`trip_${tripId}`);
  };
}, [tripId]);
```

---

## 🎯 **Automatic Triggers**

### **Set up automatic notifications when trip status changes:**

```sql
-- Create function to send notification when trip status changes
CREATE OR REPLACE FUNCTION notify_trip_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Send notification based on new status
    PERFORM send_notification_with_template(
      NEW.customer_id,
      CASE NEW.status
        WHEN 'matched' THEN 'trip_matched'
        WHEN 'en_route_pickup' THEN 'trip_en_route_pickup'
        WHEN 'delivered' THEN 'trip_delivered'
        ELSE 'trip_status_update'
      END,
      NEW.id,
      NULL,
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trip_status_notification_trigger
  AFTER UPDATE ON trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_status_change();
```

---

## 📊 **Monitoring & Analytics**

### **Check notification performance:**

```sql
-- Count notifications by type
SELECT type, COUNT(*) as count
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY count DESC;

-- Check read rates
SELECT 
  type,
  COUNT(*) as total,
  COUNT(read_at) as read,
  ROUND((COUNT(read_at) * 100.0 / COUNT(*)), 2) as read_percentage
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type;

-- Recent notifications
SELECT 
  title,
  message,
  type,
  created_at,
  read_at IS NOT NULL as read
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

---

## ✅ **Success Criteria**

Your notification system is working properly if:

- [x] ✅ SQL tables created successfully
- [ ] 📱 App permissions requested and granted
- [ ] 🔔 Local notifications appear
- [ ] 🔄 Real-time subscriptions work
- [ ] 📊 UI updates when notifications received
- [ ] 🎵 Sound and vibration work (if enabled)
- [ ] 📈 Database notifications are created
- [ ] 🧪 Test panel functions work

## 🎉 **Next Steps**

Once this is working:
1. **Remove test panel** from production builds
2. **Add push notification server** for background notifications
3. **Implement delivery photo system**
4. **Add smart geofencing**

**Ready to test? Let me know what happens when you try the notification system!** 🚀

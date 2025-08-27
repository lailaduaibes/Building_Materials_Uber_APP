## 🔍 NOTIFICATION DEBUGGING GUIDE

### **Issue**: Notifications not sent when starting a trip in driver app

### **1. Run the SQL Diagnostic First**
Execute `debug-notification-flow.sql` to check:
- ✅ Active trips exist
- ✅ Notification table structure
- ✅ RLS policies allow insertion
- ✅ Manual notification insertion works

### **2. Check Driver App Terminal Output**
When clicking "Start Trip", look for these console logs:

**Expected Logs in Driver App:**
```
🔄 Updating trip status: { tripId: "abc123...", status: "start_trip" }
✅ Trip status updated to: in_transit
📱 Customer notification sent for status: start_trip
```

**Error Logs to Look For:**
```
❌ Error updating trip status: [error details]
❌ Notification DB error: [error details]  
⚠️ Failed to send customer notification: [error details]
```

### **3. Check Customer App**
In customer app LiveTrackingScreenTrip:

**Expected Logs:**
```
✅ Notification service initialized
📨 Trip notification received: [notification object]
```

**Issues to Check:**
- Is notification service properly subscribed?
- Are notifications received but not displayed?
- Check notification test panel functionality

### **4. Common Issues & Solutions**

#### **A. RLS Policy Issue**
**Symptom**: "new row violates row-level security policy"
**Solution**: 
```sql
-- Allow authenticated users to insert notifications
CREATE POLICY "Allow notification insertion" ON notifications
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### **B. Foreign Key Constraint**
**Symptom**: "violates foreign key constraint"
**Solution**: Remove trip_id foreign key reference in notification insertion

#### **C. Driver Service Not Initialized**
**Symptom**: "No current driver" in logs
**Solution**: Ensure driver is properly logged in and currentDriver is set

#### **D. Customer Not Subscribed**
**Symptom**: Notification inserted but not received
**Solution**: Check if customer app subscribed to notifications correctly

### **5. Test Steps**

1. **Accept a trip** in driver app
2. **Click "Start Trip"** button  
3. **Check both app terminals** for logs
4. **Run SQL** to verify notification was inserted
5. **Check customer app** notification test panel
6. **Test manual notification** via test panel

### **6. Quick Fix Commands**

#### **Force Send Test Notification:**
```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES (
    '[CUSTOMER_USER_ID]', 
    'Test Trip Started', 
    'This is a test notification from your driver', 
    'status_update'
);
```

#### **Check Notification Subscription:**
```typescript
// In customer app console
console.log('Notification service instance:', enhancedNotificationService);
```

### **7. Expected Flow**
```
Driver clicks "Start Trip" 
    ↓
DriverService.updateTripStatus() called
    ↓
Trip status updated to "in_transit" 
    ↓
enhancedNotificationService.sendTripStatusNotification() called
    ↓
Notification inserted into database
    ↓
Customer app receives via Supabase realtime
    ↓
Notification displayed to customer
```

### **8. Files to Check**
- **Driver**: `YouMatsApp/services/DriverService.ts` (updateTripStatus method)
- **Notification**: `YouMatsApp/services/EnhancedNotificationService.ts` 
- **Customer**: `CustomerAppNew/LiveTrackingScreenTrip.tsx`
- **Test Panel**: `CustomerAppNew/components/NotificationTestPanel.tsx`

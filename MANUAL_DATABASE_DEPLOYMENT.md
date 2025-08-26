# Manual Database Deployment Guide

Since the Supabase MCP service is not working, you'll need to manually deploy the database schemas through the Supabase dashboard.

## Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Log in to your account
3. Select your project: "Building Materials Uber App"
4. Navigate to **SQL Editor** from the left sidebar

## Step 2: Deploy Communication Features

Copy and paste the entire contents of `create-communication-features.sql` into the SQL Editor and run it.

**File to deploy:** `create-communication-features.sql`

**What this creates:**
- `trip_messages` table for driver-customer messaging
- `trip_photos` table for photo confirmations
- `trip_call_logs` table for call tracking
- `user_communication_preferences` table for settings
- RLS (Row Level Security) policies for data protection
- Helper functions for message notifications
- Real-time subscriptions setup

## Step 3: Deploy Analytics Features (Optional)

Copy and paste the entire contents of `create-analytics-features.sql` into the SQL Editor and run it.

**File to deploy:** `create-analytics-features.sql`

**What this creates:**
- `trip_analytics` table for delivery performance tracking
- `driver_performance_metrics` table for driver statistics
- `eta_predictions` table for ETA accuracy analysis
- `customer_analytics` table for customer behavior insights
- `system_performance_metrics` table for system monitoring
- Automated triggers for analytics data collection
- Views for performance reporting

## Step 4: Verify Deployment

Run this query to verify all tables were created successfully:

```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'trip_messages',
    'trip_photos', 
    'trip_call_logs',
    'user_communication_preferences',
    'trip_analytics',
    'driver_performance_metrics',
    'eta_predictions',
    'customer_analytics',
    'system_performance_metrics'
)
ORDER BY table_name;
```

## Step 5: Test the Communication System

Once deployed, you can test the communication features in the app:

1. Start a trip with the customer app
2. Open the live tracking screen
3. Click the blue chat button next to the green call button
4. Test messaging, photo upload, and call logging

## Troubleshooting

If you encounter any errors during deployment:

1. **Foreign key errors**: Make sure the `trip_requests` table exists
2. **Extension errors**: The extensions should auto-install, but you can manually run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. **Permission errors**: Make sure you're running as the project owner/admin

## Files to Deploy (In Order)

1. ✅ `create-communication-features.sql` (Required for messaging system)
2. ⭐ `create-analytics-features.sql` (Optional, for performance tracking)

Let me know once you've deployed the schemas and I'll help you test the complete communication system!

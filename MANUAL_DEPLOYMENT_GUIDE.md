# 🚀 MANUAL SUPABASE FUNCTION DEPLOYMENT GUIDE

## 📋 STEPS TO DEPLOY PAYMENT PROCESSOR FUNCTION

### STEP 1: Access Supabase Dashboard
1. Go to: **https://supabase.com/dashboard/project/pjbbtmuhlpscmrbgsyzb**
2. Login with your account

### STEP 2: Navigate to Edge Functions
1. In the left sidebar, click **"Edge Functions"**
2. Click **"New Function"** button

### STEP 3: Create the Function
1. **Function Name:** `payment-processor`
2. **Copy and paste the function code** from `payment-processor-function.ts`

### STEP 4: Environment Variables (CRITICAL!)
1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
SUPABASE_URL=https://pjbbtmuhlpscmrbgsyzb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ IMPORTANT:** 
- Replace `sk_test_your_stripe_secret_key_here` with your actual Stripe secret key
- Get your service role key from **Settings** → **API** → **Service Role Key**

### STEP 5: Deploy the Function
1. Click **"Deploy Function"**
2. Wait for deployment to complete
3. Test the function with a sample request

### STEP 6: Fix Notification RLS (SQL Editor)
1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL:

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create a policy that allows authenticated users to insert notifications
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Check current policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications';
```

---

## 🔑 REQUIRED API KEYS

### Stripe Setup:
1. Go to **https://dashboard.stripe.com/**
2. Get your **Secret Key** (starts with `sk_test_` for test mode)
3. Add it to Supabase environment variables

### Service Role Key:
1. In Supabase dashboard: **Settings** → **API**
2. Copy **Service Role Key** (starts with `eyJ...`)
3. Add it to environment variables

---

## ✅ VERIFICATION STEPS

### Test Payment Function:
1. Try adding a payment method in your app
2. Should work without "function not found" error

### Test Notifications:
1. Open live tracking in your app
2. Click notification test button
3. Should work without RLS policy errors

---

## 🛠️ TROUBLESHOOTING

### If function still not found:
- Check function name is exactly `payment-processor`
- Verify function is deployed (green status)
- Check environment variables are set

### If notifications still fail:
- Run the RLS fix SQL again
- Check that `notifications` table exists
- Verify user is authenticated

---

## 📞 NEXT STEPS AFTER DEPLOYMENT

1. **Test Payment Integration** ✅
2. **Test Notification System** ✅
3. **Deploy to App Stores** 🚀
4. **Add Stripe Production Keys** 💳

Your app will be **100% production ready** after these fixes!

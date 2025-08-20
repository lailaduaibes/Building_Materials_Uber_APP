# Supabase OTP Verification Steps

## How to Check if Supabase is Managing OTP Requests

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your Building Materials Delivery project

### Step 2: Check Authentication Settings
1. In the left sidebar, click on **Authentication**
2. Click on **Settings** tab
3. Look for **Email Templates** section
4. Verify the following settings:

#### Email Confirmation Settings:
- **Confirm email** should be enabled
- **Double confirm email changes** (optional)
- **Enable email confirmations** should be ON

#### OTP Settings:
- Look for **Email OTP** or **Magic Link** settings
- Ensure **Email OTP** is enabled instead of Magic Links

### Step 3: Check Email Templates
1. In Authentication → Settings → Email Templates
2. Check the **Confirm signup** template
3. The template should contain:
   ```
   Confirmation code: {{ .Token }}
   ```
   NOT a link like `{{ .SiteURL }}/auth/confirm?token={{ .Token }}`

### Step 4: Verify Users Table
1. Go to **Table Editor** in the left sidebar
2. Click on **auth** schema
3. Check the **users** table
4. Look for recent registrations and their status:
   - `email_confirmed_at` should be `null` for unverified users
   - `confirmation_token` should exist
   - `confirmation_sent_at` should show recent timestamp

### Step 5: Check Logs
1. Go to **Logs** in the left sidebar
2. Select **Auth** logs
3. Look for recent entries related to:
   - `signup` events
   - `email_confirmation_sent` events
   - `email_confirmation` events (when OTP is verified)

### Step 6: Test Email Delivery
1. Go to **Authentication** → **Users**
2. Try registering a test user from your app
3. Check if the user appears with:
   - `email_confirmed_at`: null
   - Status: "Unconfirmed"

### Step 7: Monitor Email Provider
1. In **Settings** → **Auth**
2. Check **SMTP Settings** if you're using custom email
3. Or verify **Supabase Email Service** is working

## Expected Behavior for OTP System

### Registration Flow:
1. User registers with email/password
2. Supabase creates unconfirmed user
3. Supabase sends email with 6-digit OTP code
4. User enters OTP in app
5. App calls `supabase.auth.verifyOtp()`
6. User status changes to confirmed

### What to Look For:
- ✅ Email contains 6-digit code (not a link)
- ✅ User appears as "Unconfirmed" after registration
- ✅ Auth logs show email_confirmation_sent
- ✅ OTP verification succeeds and user becomes confirmed

### Troubleshooting:
- If emails contain links instead of codes → Check email templates
- If no emails are sent → Check SMTP/email service settings
- If OTP verification fails → Check token format and expiration
- If users auto-confirm → Check if email confirmation is disabled

## Testing Commands

Run this to test the OTP flow:
```bash
cd "d:\Building Materials Uber App\CustomerAppNew"
node test-otp-verification.js
```

This will:
1. Register a new user
2. Show the user's unconfirmed status
3. Simulate OTP verification
4. Confirm the flow is working

## Configuration Check

Our app is configured with:
- `emailRedirectTo: undefined` (disables magic links)
- OTP verification using `verifyOtp()` method
- 6-digit code validation in UI
- Automatic user creation in custom users table after verification

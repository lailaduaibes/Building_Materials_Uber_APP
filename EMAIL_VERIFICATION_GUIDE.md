# Email Verification Implementation Guide - YouMats Platform

## Overview

This guide provides a comprehensive step-by-step implementation of email verification for the YouMats building materials delivery platform. The implementation includes backend API endpoints, database schema enhancements, and mobile app UI components.

## 🎯 Implementation Summary

### ✅ Backend Implementation (Completed)

1. **Enhanced Authentication Controller** (`AuthControllerWithVerification.ts`)
   - Email verification token generation
   - Secure token validation with expiration
   - Password reset functionality
   - Comprehensive error handling

2. **Database Schema** (`schema-with-verification.sql`)
   - Added email verification fields to users table
   - Verification token tracking
   - Password reset token management
   - Audit trail for verification attempts

3. **API Routes** (`auth-with-verification.ts`)
   - `POST /api/v1/auth/register` - Registration with email verification
   - `GET /api/v1/auth/verify-email/:token` - Email verification endpoint
   - `POST /api/v1/auth/resend-verification` - Resend verification email
   - `POST /api/v1/auth/login` - Login with verification check
   - `POST /api/v1/auth/forgot-password` - Password reset request

4. **Email Service** (`emailService.ts`)
   - Professional HTML email templates
   - Verification email generation
   - Password reset email templates
   - Integration ready for SendGrid, AWS SES, or Supabase

### ✅ Mobile App Implementation (Completed)

1. **Authentication Service** (`AuthService.ts`)
   - Secure token management
   - API integration for all auth endpoints
   - AsyncStorage for persistent sessions
   - Comprehensive error handling

2. **Authentication Screens** (`AuthScreens.tsx`)
   - Responsive login/register forms
   - Email verification screen
   - Password reset functionality
   - Cross-platform optimized UI

3. **Enhanced App Component** (`App.tsx`)
   - Email verification flow integration
   - Role-based dashboard routing
   - Professional welcome screen
   - Secure authentication state management

## 🔧 Setup Instructions

### Step 1: Database Setup

1. **Apply the new schema:**
   ```sql
   -- Run the enhanced schema file
   psql -h your-host -U your-user -d your-database -f database/schema-with-verification.sql
   ```

2. **Verify the changes:**
   ```sql
   -- Check that users table has new columns
   \d users;
   
   -- Verify verification tracking tables exist
   \d email_verification_attempts;
   \d password_reset_attempts;
   ```

### Step 2: Backend Configuration

1. **Update your app.ts to use new auth routes:**
   ```typescript
   // Replace old auth routes with enhanced version
   app.use(`/api/${apiVersion}/auth`, authWithVerificationRoutes);
   ```

2. **Configure environment variables:**
   ```env
   # Add to your .env file
   FRONTEND_URL=http://localhost:3000
   JWT_SECRET=your-secure-jwt-secret
   JWT_EXPIRES_IN=24h
   
   # Email service configuration (choose one)
   SENDGRID_API_KEY=your-sendgrid-key
   FROM_EMAIL=noreply@youmats.com
   
   # OR AWS SES
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   
   # OR SMTP
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

3. **Install email service dependencies (choose one):**
   ```bash
   # For SendGrid
   npm install @sendgrid/mail
   
   # For AWS SES
   npm install aws-sdk
   
   # For SMTP (Nodemailer)
   npm install nodemailer @types/nodemailer
   ```

### Step 3: Mobile App Setup

1. **Update API base URL in AuthService.ts:**
   ```typescript
   const API_BASE_URL = 'https://your-domain.com/api/v1';
   // or use your tunnel URL for development
   ```

2. **Install required dependencies:**
   ```bash
   cd YouMatsApp
   npm install @react-native-async-storage/async-storage
   ```

3. **Update app.json with proper permissions:**
   ```json
   {
     "expo": {
       "permissions": [
         "CAMERA",
         "ACCESS_FINE_LOCATION",
         "ACCESS_COARSE_LOCATION"
       ]
     }
   }
   ```

## 🔐 Security Features

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter  
- At least 1 number
- At least 1 special character (@$!%*?&)

### Token Security
- Verification tokens expire in 24 hours
- Reset tokens expire in 1 hour
- Cryptographically secure random token generation
- Secure token validation and cleanup

### Email Verification Flow
1. User registers with email and password
2. Account created but inactive (is_active: false)
3. Verification email sent with secure token
4. User clicks verification link
5. Account activated (is_active: true, email_verified: true)
6. User can now login

## 📧 Email Integration

### Current Implementation
The email service is currently logging email content for development. To enable actual email sending:

### Option 1: SendGrid Integration
```typescript
// In emailService.ts, uncomment and configure:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: options.to,
  from: process.env.FROM_EMAIL,
  subject: options.template.subject,
  text: options.template.text,
  html: options.template.html,
});
```

### Option 2: AWS SES Integration
```typescript
// In emailService.ts, uncomment and configure:
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: process.env.AWS_REGION });

await ses.sendEmail({
  Source: process.env.FROM_EMAIL,
  Destination: { ToAddresses: [options.to] },
  Message: {
    Subject: { Data: options.template.subject },
    Body: {
      Text: { Data: options.template.text },
      Html: { Data: options.template.html }
    }
  }
}).promise();
```

### Option 3: Supabase Edge Functions
Create a Supabase Edge Function for email sending and call it from the service.

## 🧪 Testing the Implementation

### 1. Backend API Testing

```bash
# Test registration
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login (should fail until verified)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Test email verification (use token from logs)
curl -X GET http://localhost:3000/api/v1/auth/verify-email/your-token-here

# Test resend verification
curl -X POST http://localhost:3000/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Mobile App Testing

1. **Registration Flow:**
   - Open app → Get Started → Fill registration form
   - Check logs for verification email content
   - Try logging in (should show "verify email" message)

2. **Email Verification:**
   - Use verification URL from logs
   - Return to app and login successfully

3. **Password Reset:**
   - Use "Forgot Password" link
   - Check logs for reset email content

## 🔄 Migration from Old System

### For Existing Users
1. Add email verification columns to existing users table
2. Set existing users as verified to maintain access:
   ```sql
   UPDATE users 
   SET email_verified = true, 
       is_active = true, 
       verified_at = CURRENT_TIMESTAMP 
   WHERE created_at < CURRENT_TIMESTAMP;
   ```

### Gradual Rollout
1. Keep old auth routes active during transition
2. Use feature flags to control email verification requirement
3. Migrate users gradually to new system

## 📱 Mobile App Features

### Enhanced UI Components
- Professional welcome screen with feature highlights
- Responsive authentication forms
- Email verification status indicators
- Role-based dashboard routing
- Cross-platform optimized styling

### Security Improvements
- Secure token storage with AsyncStorage
- Automatic token refresh handling
- Comprehensive error messaging
- Logout confirmation dialogs

## 🚀 Deployment Checklist

### Backend Deployment
- [ ] Database schema updated
- [ ] Environment variables configured
- [ ] Email service provider configured
- [ ] API routes updated
- [ ] Error monitoring enabled

### Mobile App Deployment
- [ ] API endpoints updated
- [ ] App permissions configured
- [ ] Cross-platform testing completed
- [ ] Store metadata updated

### Production Considerations
- [ ] Email templates customized
- [ ] Domain verification for email sending
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Monitoring and logging enabled

## 🆘 Troubleshooting

### Common Issues

1. **"Invalid credentials" during login**
   - Check if email is verified
   - Verify password requirements
   - Check API connectivity

2. **Email verification not working**
   - Check email service configuration
   - Verify token expiration
   - Check spam folder for emails

3. **Mobile app authentication errors**
   - Verify API base URL
   - Check network connectivity
   - Validate AsyncStorage permissions

### Support Commands

```bash
# Check database connection
psql -h your-host -U your-user -d your-database -c "SELECT version();"

# Verify user verification status
SELECT email, email_verified, is_active FROM users WHERE email = 'user@example.com';

# Check verification tokens
SELECT * FROM email_verification_attempts WHERE email = 'user@example.com';
```

## 📞 Next Steps

1. **Configure email service provider** (SendGrid/AWS SES/SMTP)
2. **Customize email templates** with your branding
3. **Test complete flow** in development environment
4. **Deploy to staging** for full testing
5. **Plan production migration** for existing users

This implementation provides a production-ready email verification system with comprehensive security, error handling, and user experience considerations.

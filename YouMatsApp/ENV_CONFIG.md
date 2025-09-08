# YouMats Driver Payment System - Environment Configuration
# Copy this file to .env and fill in your actual values

# =============================================================================
# STRIPE CONFIGURATION (Required for real bank verification)
# =============================================================================

# Get these from your Stripe Dashboard (https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Stripe webhook endpoint secret (for verifying webhook signatures)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# =============================================================================
# SUPABASE CONFIGURATION (Already configured)
# =============================================================================

SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# =============================================================================
# DEPLOYMENT INSTRUCTIONS
# =============================================================================

# 1. Create a Stripe account at https://stripe.com
# 2. Get your API keys from the Stripe Dashboard
# 3. Set up a webhook endpoint for bank verification status updates
# 4. Update app.config.js with these environment variables
# 5. Deploy your app

# =============================================================================
# PRODUCTION CHECKLIST
# =============================================================================

# ✅ Real Stripe integration implemented
# ✅ Bank account verification with micro-deposits
# ✅ Automatic earnings calculation on trip completion
# ✅ Weekly payout system (every Tuesday)
# ✅ Professional UI for drivers
# ✅ Secure bank account setup and validation
# ✅ Real payment method management
# ✅ Comprehensive error handling

# No mockups or test data in production flow!

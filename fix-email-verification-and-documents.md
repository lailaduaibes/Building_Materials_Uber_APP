-- RESTORE PROPER EMAIL VERIFICATION AND DOCUMENT UPLOAD
-- Fix the DriverService registration issues I accidentally created

-- The issues are in DriverService.ts:
-- 1. Auto-signin after registration bypasses email verification
-- 2. Service role usage might affect document upload permissions

-- SOLUTION: Update DriverService.ts registerNewDriver function

/*
REMOVE THIS SECTION (lines ~446-464):

// Check if email confirmation is required
if (!authData.session) {
  console.log('📧 Email confirmation required - no session returned');
  
  // Try to sign in immediately (this works if email confirmation is disabled)
  console.log('🔑 Attempting to sign in after registration...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: registrationData.email,
    password: registrationData.password
  });

  if (signInError) {
    console.log('⚠️ Auto sign-in failed - email confirmation likely required:', signInError.message);
  } else if (signInData.session) {
    console.log('✅ Auto sign-in successful after registration');
  }
} else {
  console.log('✅ User signed in automatically after registration');
}

REPLACE WITH:

// Respect email confirmation requirement
if (!authData.session) {
  console.log('📧 Email confirmation required - user must verify email before proceeding');
  return {
    success: true,
    message: 'Registration successful! Please check your email and click the confirmation link to complete your account setup.',
    data: {
      userId: authData.user.id,
      requiresEmailConfirmation: true
    }
  };
}

*/

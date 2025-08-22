/**
 * Test Email Verification Flow - Check if email verification is required
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

async function testEmailVerificationFlow() {
  console.log('📧 Testing email verification flow...\n');

  try {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'test123456';

    console.log('1️⃣ Attempting user signup...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'driver',
          user_type: 'driver'
        }
      }
    });

    if (signUpError) {
      console.error('❌ Signup failed:', signUpError.message);
      return;
    }

    console.log('✅ Signup result:');
    console.log('   - User created:', !!signUpData.user);
    console.log('   - User ID:', signUpData.user?.id);
    console.log('   - Session created:', !!signUpData.session);
    console.log('   - Email confirmation sent:', !!signUpData.user && !signUpData.session);

    if (!signUpData.session) {
      console.log('📧 Email verification is REQUIRED');
      console.log('   - User needs to verify email before getting session');
      console.log('   - Registration should show email verification step');
    } else {
      console.log('✅ User automatically authenticated');
      console.log('   - Email verification is DISABLED');
      console.log('   - Registration can skip email verification step');
    }

    // Test immediate sign in
    if (!signUpData.session) {
      console.log('\n2️⃣ Testing immediate sign-in after signup...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (signInError) {
        console.log('❌ Immediate sign-in failed:', signInError.message);
        console.log('   - This confirms email verification is required');
      } else if (signInData.session) {
        console.log('✅ Immediate sign-in succeeded');
        console.log('   - This is unexpected if email verification is enabled');
      }
    }

    console.log('\n📋 Email Verification Flow Analysis:');
    
    if (!signUpData.session) {
      console.log('✅ Email verification is ENABLED in your Supabase project');
      console.log('✅ Registration should show email verification step');
      console.log('✅ Fixed flow will now properly detect this requirement');
    } else {
      console.log('⚠️ Email verification is DISABLED in your Supabase project');
      console.log('⚠️ Users are automatically authenticated on signup');
      console.log('⚠️ Registration will skip email verification step');
    }

  } catch (error) {
    console.error('💥 Test failed with exception:', error);
  }
}

testEmailVerificationFlow().then(() => {
  console.log('\n✨ Email verification test completed!');
  process.exit(0);
});

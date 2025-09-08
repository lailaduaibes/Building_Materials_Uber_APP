// Quick test script to verify driver payment dashboard authentication
// Run this in your React Native app to test the payment system

import { authService } from '../AuthServiceSupabase';

export const testPaymentAuth = async () => {
  console.log('🔍 Testing Payment Dashboard Authentication...');
  
  try {
    // Check if user is logged in
    const currentUser = authService.getCurrentUser();
    console.log('👤 Current User:', currentUser);
    
    if (!currentUser) {
      console.error('❌ No user logged in - this explains the "Please login first" error');
      return {
        success: false,
        message: 'No user logged in. Please log in first.'
      };
    }
    
    // Test Supabase client access
    const supabase = authService.getSupabaseClient();
    console.log('🔗 Supabase client:', supabase ? 'Available' : 'Not available');
    
    // Test a simple database query
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', currentUser.id)
      .limit(1);
    
    if (error) {
      console.error('❌ Database query failed:', error);
      return {
        success: false,
        message: `Database access failed: ${error.message}`
      };
    }
    
    console.log('✅ Database query successful:', data);
    
    // Test driver_profiles access (needed for payment system)
    const { data: profileData, error: profileError } = await supabase
      .from('driver_profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', currentUser.id)
      .limit(1);
    
    if (profileError) {
      console.error('❌ Driver profile query failed:', profileError);
      return {
        success: false,
        message: `Driver profile access failed: ${profileError.message}`
      };
    }
    
    if (!profileData || profileData.length === 0) {
      console.error('❌ No driver profile found for user');
      return {
        success: false,
        message: 'No driver profile found. User may not be a driver.'
      };
    }
    
    console.log('✅ Driver profile found:', profileData);
    
    return {
      success: true,
      message: 'Payment dashboard authentication working correctly!',
      user: currentUser,
      profile: profileData[0]
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Usage example:
// Add this to your App.tsx or dashboard component temporarily:
/*
useEffect(() => {
  testPaymentAuth().then(result => {
    console.log('Payment Auth Test Result:', result);
    if (!result.success) {
      Alert.alert('Payment System Issue', result.message);
    }
  });
}, []);
*/

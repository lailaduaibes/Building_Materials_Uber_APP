/**
 * Authentication Test Script
 * Test login with your credentials and verify user session
 */

import { authService } from './AuthServiceSupabase';

export const testAuthentication = async () => {
  console.log('🔐 Starting authentication test...');
  
  try {
    // Test login with your credentials
    console.log('📧 Testing login with: lailaghassan2001@gmail.com');
    
    const loginResult = await authService.login('lailaghassan2001@gmail.com', 'Hatelove@1412');
    
    if (loginResult.success) {
      console.log('✅ Login successful!');
      console.log('👤 User data:', loginResult.data?.user);
      
      // Test getting current user
      const currentUser = await authService.getCurrentUser();
      console.log('👤 Current user:', currentUser);
      
      return {
        success: true,
        user: currentUser,
        message: 'Authentication test passed ✅'
      };
    } else {
      console.error('❌ Login failed:', loginResult.message);
      return {
        success: false,
        error: loginResult.message,
        message: 'Authentication test failed ❌'
      };
    }
  } catch (error) {
    console.error('❌ Authentication test error:', error);
    return {
      success: false,
      error: String(error),
      message: 'Authentication test crashed ❌'
    };
  }
};

// Call this function to test authentication
export default testAuthentication;

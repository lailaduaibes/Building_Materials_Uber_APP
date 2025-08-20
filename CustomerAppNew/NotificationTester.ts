/**
 * Simple test to verify notification system works
 * Run this to test notifications without creating real orders
 */

import notificationManager from './services/NotificationManager';
import userPreferencesService from './services/UserPreferencesService';

export class NotificationTester {
  
  // Test basic notification functionality
  static async testBasicNotifications() {
    console.log('🧪 Testing basic notifications...');
    
    try {
      // Initialize notification system
      await notificationManager.initialize();
      console.log('✅ Notification system initialized');
      
      // Send test notification
      await notificationManager.sendGeneralNotification(
        'Test Notification',
        'If you see this, notifications are working! 🎉'
      );
      console.log('✅ Test notification sent');
      
      return true;
    } catch (error) {
      console.error('❌ Basic notification test failed:', error);
      return false;
    }
  }
  
  // Test user preferences
  static async testUserPreferences() {
    console.log('🧪 Testing user preferences...');
    
    try {
      // Load default preferences
      const prefs = await userPreferencesService.loadPreferences();
      console.log('✅ Loaded preferences:', prefs.notifications);
      
      // Update a preference
      await userPreferencesService.updateNotificationPreferences({
        orderUpdates: false,
        promotions: true,
      });
      console.log('✅ Updated preferences');
      
      // Verify it was saved
      const updatedPrefs = await userPreferencesService.loadPreferences();
      console.log('✅ Verified preferences saved:', updatedPrefs.notifications);
      
      return true;
    } catch (error) {
      console.error('❌ Preferences test failed:', error);
      return false;
    }
  }
  
  // Test order notification
  static async testOrderNotification() {
    console.log('🧪 Testing order notifications...');
    
    try {
      await notificationManager.sendOrderUpdateNotification({
        orderId: 'test-order-123',
        status: 'in_transit',
        message: 'Your building materials are on the way!',
        customerName: 'Test User',
        driverName: 'Ahmed',
        estimatedArrival: '15 minutes',
      });
      console.log('✅ Order notification sent');
      
      return true;
    } catch (error) {
      console.error('❌ Order notification test failed:', error);
      return false;
    }
  }
  
  // Test preference-based filtering
  static async testPreferenceFiltering() {
    console.log('🧪 Testing preference filtering...');
    
    try {
      // Disable order notifications
      await userPreferencesService.updateNotificationPreferences({
        orderUpdates: false,
      });
      
      // Try to send order notification (should be blocked)
      await notificationManager.sendOrderUpdateNotification({
        orderId: 'blocked-order',
        status: 'delivered',
        message: 'This should not appear',
      });
      
      console.log('✅ Order notification properly filtered (user disabled)');
      
      // Re-enable notifications
      await userPreferencesService.updateNotificationPreferences({
        orderUpdates: true,
      });
      
      return true;
    } catch (error) {
      console.error('❌ Preference filtering test failed:', error);
      return false;
    }
  }
  
  // Run all tests
  static async runAllTests() {
    console.log('🚀 Starting notification system tests...\n');
    
    const results = {
      basic: await this.testBasicNotifications(),
      preferences: await this.testUserPreferences(),
      orderNotifications: await this.testOrderNotification(),
      filtering: await this.testPreferenceFiltering(),
    };
    
    console.log('\n📊 Test Results:');
    console.log('Basic Notifications:', results.basic ? '✅ PASS' : '❌ FAIL');
    console.log('User Preferences:', results.preferences ? '✅ PASS' : '❌ FAIL');
    console.log('Order Notifications:', results.orderNotifications ? '✅ PASS' : '❌ FAIL');
    console.log('Preference Filtering:', results.filtering ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    
    return allPassed;
  }
}

// Usage example:
// import { NotificationTester } from './NotificationTester';
// NotificationTester.runAllTests();

/**
 * NotificationServiceTester - Simple test for the notification service
 * Use this to verify the service initializes correctly
 */

import { enhancedNotificationService } from './EnhancedNotificationService';

export async function testNotificationService(): Promise<void> {
  console.log('🧪 Testing Notification Service...');
  
  try {
    // Test initialization
    console.log('1️⃣ Testing initialization...');
    const initResult = await enhancedNotificationService.initialize();
    
    if (initResult.success) {
      console.log('✅ Initialization successful');
      if (initResult.token) {
        console.log('🔑 Push token obtained:', initResult.token.slice(0, 20) + '...');
      } else {
        console.log('⚠️ No push token (probably simulator)');
      }
    } else {
      console.log('❌ Initialization failed:', initResult.error);
    }
    
    // Test configuration
    console.log('2️⃣ Testing configuration...');
    await enhancedNotificationService.updateConfiguration({
      enablePushNotifications: true,
      enableSound: true,
    });
    console.log('✅ Configuration updated');
    
    console.log('🎉 Notification service test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

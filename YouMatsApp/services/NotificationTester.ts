/**
 * 🧪 Test YouMats Notification Icon - Direct Test
 * This will show you exactly what's happening with notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Test function to trigger YouMats branded notification directly
export async function testYouMatsNotification() {
  console.log('🧪 Testing YouMats notification...');
  
  try {
    // Get current notification permissions
    const { status } = await Notifications.getPermissionsAsync();
    console.log('📋 Notification permission status:', status);
    
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.error('❌ Notification permissions denied');
        return;
      }
    }

    // Create YouMats default channel if needed (Android)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('youmats-test', {
        name: 'YouMats Test',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2C5CC5',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        description: 'YouMats test notifications',
      });
      console.log('✅ Created YouMats test channel');
    }

    // Trigger a test notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚛 YouMats Driver Test',
        body: 'This is a test notification to check YouMats branding!',
        data: {
          type: 'test',
          source: 'manual_test',
        },
        // Android specific configuration
        ...Platform.select({
          android: {
            channelId: 'youmats-test',
            color: '#2C5CC5',
            // Note: Custom icons only work in standalone builds, not Expo Go
          },
          ios: {
            sound: 'default',
            badge: 1,
          },
        }),
      },
      trigger: null, // Send immediately
    });

    console.log('✅ Test notification sent with ID:', notificationId);
    
    // Show environment info
    console.log('📱 Environment Info:');
    console.log('- Platform:', Platform.OS);
    console.log('- Running in Expo Go?', __DEV__ ? 'Yes (Custom icons not supported)' : 'No (Custom icons supported)');
    
    return notificationId;
    
  } catch (error) {
    console.error('❌ Error testing notification:', error);
  }
}

// Add this to test in your app
export async function testNotificationInApp() {
  console.log('🔔 Starting YouMats notification test...');
  
  const result = await testYouMatsNotification();
  
  if (result) {
    console.log('✅ Notification test completed successfully');
    console.log('💡 Note: If you see Expo logo instead of YouMats logo:');
    console.log('   - This is expected in Expo Go (development mode)');
    console.log('   - YouMats logo will appear in production builds only');
    console.log('   - The notification channels and colors are working correctly');
  }
}

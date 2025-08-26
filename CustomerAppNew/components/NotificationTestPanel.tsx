/**
 * NotificationTestPanel - Testing Component for Push Notifications
 * Use this to test different notification types during development
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { enhancedNotificationService } from '../services/EnhancedNotificationService';

interface NotificationTestPanelProps {
  tripId: string;
  userId: string;
  driverName?: string;
  onClose: () => void;
}

export const NotificationTestPanel: React.FC<NotificationTestPanelProps> = ({
  tripId,
  userId,
  driverName = 'John Smith',
  onClose,
}) => {
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const testNotifications = [
    {
      id: 'driver_matched',
      title: 'Test Driver Match',
      message: `${driverName} is on the way to pickup location`,
      type: 'status_update' as const,
      action: () => enhancedNotificationService.sendTripStatusNotification(
        userId, tripId, 'matched', driverName, 15
      ),
    },
    {
      id: 'driver_en_route',
      title: 'Test En Route',
      message: `${driverName} is heading to pickup location`,
      type: 'status_update' as const,
      action: () => enhancedNotificationService.sendTripStatusNotification(
        userId, tripId, 'en_route_pickup', driverName, 8
      ),
    },
    {
      id: 'driver_arrived_pickup',
      title: 'Test Pickup Arrival',
      message: `${driverName} has arrived at pickup location`,
      type: 'arrival' as const,
      action: () => enhancedNotificationService.sendDriverArrivalNotification(
        userId, tripId, 'pickup', driverName
      ),
    },
    {
      id: 'materials_loaded',
      title: 'Test Materials Loaded',
      message: `Materials loaded! ${driverName} is heading to delivery`,
      type: 'status_update' as const,
      action: () => enhancedNotificationService.sendTripStatusNotification(
        userId, tripId, 'en_route_delivery', driverName, 25
      ),
    },
    {
      id: 'driver_arrived_delivery',
      title: 'Test Delivery Arrival',
      message: `${driverName} has arrived at delivery location`,
      type: 'arrival' as const,
      action: () => enhancedNotificationService.sendDriverArrivalNotification(
        userId, tripId, 'delivery', driverName
      ),
    },
    {
      id: 'delivery_complete',
      title: 'Test Delivery Complete',
      message: 'Your materials have been delivered successfully!',
      type: 'status_update' as const,
      action: () => enhancedNotificationService.sendTripStatusNotification(
        userId, tripId, 'delivered'
      ),
    },
    {
      id: 'eta_delay',
      title: 'Test ETA Delay',
      message: 'Your delivery is running 20 minutes late due to traffic',
      type: 'eta_update' as const,
      action: () => enhancedNotificationService.sendETAUpdateNotification(
        userId, tripId, 20, 'traffic'
      ),
    },
    {
      id: 'eta_update',
      title: 'Test ETA Update',
      message: 'New estimated arrival time: 12 minutes',
      type: 'eta_update' as const,
      action: () => enhancedNotificationService.sendETAUpdateNotification(
        userId, tripId, 12
      ),
    },
  ];

  const sendTestNotification = async (notification: typeof testNotifications[0]) => {
    try {
      console.log('🧪 Sending test notification:', notification.title);
      
      const result = await notification.action();
      
      if (result.success) {
        Alert.alert(
          '✅ Success',
          `${notification.title} sent successfully!`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '❌ Error',
          `Failed to send notification: ${result.error}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Test notification error:', error);
      Alert.alert(
        '❌ Error',
        `Failed to send notification: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const sendCustomNotification = async () => {
    if (!customTitle.trim() || !customMessage.trim()) {
      Alert.alert('Error', 'Please enter both title and message');
      return;
    }

    try {
      // This would need to be implemented in the service
      Alert.alert(
        'Custom Notification',
        'Custom notifications would be sent via the database insert method',
        [{ text: 'OK' }]
      );
      
      setCustomTitle('');
      setCustomMessage('');
    } catch (error) {
      console.error('❌ Custom notification error:', error);
      Alert.alert('Error', `Failed to send: ${error.message}`);
    }
  };

  const testInitialization = async () => {
    try {
      console.log('🧪 Testing notification service initialization...');
      
      const result = await enhancedNotificationService.initialize();
      
      Alert.alert(
        result.success ? '✅ Success' : '❌ Error',
        result.success 
          ? `Service initialized! Token: ${result.token?.slice(0, 20)}...`
          : `Initialization failed: ${result.error}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Initialization test error:', error);
      Alert.alert('Error', `Initialization failed: ${error.message}`);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'status_update':
        return 'update';
      case 'arrival':
        return 'location-on';
      case 'eta_update':
        return 'schedule';
      default:
        return 'notifications';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'status_update':
        return '#007AFF';
      case 'arrival':
        return '#34C759';
      case 'eta_update':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Notification Test Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Initialization Test */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Initialization</Text>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#8E8E93' }]}
              onPress={testInitialization}
            >
              <MaterialIcons name="settings" size={20} color="#fff" />
              <Text style={styles.buttonText}>Test Initialization</Text>
            </TouchableOpacity>
          </View>

          {/* Pre-built Test Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Status Tests</Text>
            {testNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.testButton,
                  { backgroundColor: getColorForType(notification.type) }
                ]}
                onPress={() => sendTestNotification(notification)}
              >
                <MaterialIcons 
                  name={getIconForType(notification.type)} 
                  size={20} 
                  color="#fff" 
                />
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>{notification.title}</Text>
                  <Text style={styles.buttonSubtext}>{notification.message}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Notification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Notification</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Notification Title"
              value={customTitle}
              onChangeText={setCustomTitle}
            />
            
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Notification Message"
              value={customMessage}
              onChangeText={setCustomMessage}
              multiline
              numberOfLines={3}
            />
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#5856D6' }]}
              onPress={sendCustomNotification}
            >
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={styles.buttonText}>Send Custom</Text>
            </TouchableOpacity>
          </View>

          {/* Trip Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Test Data</Text>
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>Trip ID: {tripId}</Text>
              <Text style={styles.infoText}>User ID: {userId}</Text>
              <Text style={styles.infoText}>Driver: {driverName}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonContent: {
    flex: 1,
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

export default NotificationTestPanel;

/**
 * DriverChatScreen - Compatible with Customer App Chat System
 * Full-featured chat interface with text messages, photos, location sharing, and call functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  Platform,
  Linking,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { driverCommunicationService, TripMessage, TripPhoto } from '../services/DriverCommunicationService';
import { OrderAssignment } from '../services/DriverService';

interface Props {
  trip: OrderAssignment;
  isVisible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const theme = {
  primary: '#000000',
  secondary: '#FFFFFF',
  accent: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F8F8F8',
  text: '#000000',
  lightText: '#8E8E93',
  border: '#E5E5EA',
  driverBubble: '#007AFF',
  customerBubble: '#E5E5EA',
};

export const DriverChatScreen: React.FC<Props> = ({ trip, isVisible, onClose }) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isVisible && trip.id) {
      console.log('💬 Opening chat for trip:', {
        tripId: trip.id,
        customerId: trip.customerId,
        customerName: trip.customerName,
        status: trip.status
      });
      initializeChat();
      setupMessageSubscription();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [isVisible, trip.id]);

  const initializeChat = async () => {
    setLoading(true);
    try {
      console.log('🔄 Initializing chat for trip:', trip.id);
      
      // Initialize driver communication service (optional now)
      await driverCommunicationService.initialize();

      // Load existing messages
      const messagesResult = await driverCommunicationService.getTripMessages(trip.id);
      if (messagesResult.success && messagesResult.messages) {
        setMessages(messagesResult.messages);
        console.log('📨 Loaded messages:', messagesResult.messages.length);
      }

      // Load photos
      const photosResult = await driverCommunicationService.getTripPhotos(trip.id);
      if (photosResult.success && photosResult.photos) {
        setPhotos(photosResult.photos);
        console.log('📸 Loaded photos:', photosResult.photos.length);
      }

      // Mark customer messages as read
      await driverCommunicationService.markMessagesAsRead(trip.id);
      console.log('✅ Chat initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
      Alert.alert('Error', 'Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupMessageSubscription = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = driverCommunicationService.subscribeToTripMessages(
      trip.id,
      (newMessage) => {
        console.log('📨 Received message via subscription:', newMessage);
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.find(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('⚠️ Message already exists, skipping duplicate:', newMessage.id);
            return prev;
          }
          
          console.log('✅ Adding new message from subscription');
          return [...prev, newMessage];
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
  };

  const sendTextMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      console.log('=== Sending Message ===');
      console.log('Trip ID:', trip.id);
      console.log('Customer ID:', trip.customerId);
      console.log('Message:', newMessage.trim());
      
      const result = await driverCommunicationService.sendTextMessage(
        trip.id,
        trip.customerId,
        newMessage.trim()
      );

      console.log('📤 Send result:', result);

      if (result.success && result.message) {
        // Add sent message to UI immediately like customer app
        setMessages(prev => [...prev, result.message!]);
        setNewMessage('');
        console.log('✅ Message sent and added to UI');
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('❌ Failed to send message:', result.error);
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Exception sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const sendQuickMessage = async (message: string) => {
    try {
      const result = await driverCommunicationService.sendTextMessage(
        trip.id,
        trip.customerId,
        message
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const sendETAUpdate = () => {
    Alert.prompt(
      'Update ETA',
      'Enter new estimated arrival time (in minutes)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (value) => {
            if (value && !isNaN(Number(value))) {
              const result = await driverCommunicationService.sendETAUpdate(
                trip.id,
                trip.customerId,
                Number(value)
              );
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to send ETA update');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const sendPhoto = async (photoType: TripPhoto['photo_type']) => {
    try {
      const result = await driverCommunicationService.sendPhoto(
        trip.id,
        trip.customerId,
        photoType,
        `${photoType.replace('_', ' ')} photo`
      );

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send photo');
    }
  };

  const makeCall = async () => {
    try {
      // Log call attempt
      await driverCommunicationService.logCallAttempt(trip.id, trip.customerId);
      
      // Make actual call (if phone number available)
      if (trip.customerPhone) {
        const phoneUrl = `tel:${trip.customerPhone}`;
        const canOpen = await Linking.canOpenURL(phoneUrl);
        if (canOpen) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Cannot make phone calls on this device');
        }
      } else {
        Alert.alert('Error', 'Customer phone number not available');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make call');
    }
  };

  const renderMessage = ({ item }: { item: TripMessage }) => {
    const isDriver = item.sender_type === 'driver';
    const isSystemMessage = item.message_type === 'system';

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isDriver ? styles.driverMessage : styles.customerMessage]}>
        <View style={[styles.messageBubble, isDriver ? styles.driverBubble : styles.customerBubble]}>
          <Text style={[styles.messageText, isDriver ? styles.driverText : styles.customerText]}>
            {item.content}
          </Text>
          {item.message_type === 'eta_update' && (
            <View style={styles.etaUpdateBadge}>
              <MaterialIcons name="schedule" size={12} color={theme.warning} />
              <Text style={styles.etaUpdateText}>ETA Update</Text>
            </View>
          )}
          {item.location_data && (
            <TouchableOpacity style={styles.locationContainer}>
              <MaterialIcons name="location-on" size={16} color={theme.accent} />
              <Text style={styles.locationText}>Location shared</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const quickMessages = [
    "I'm on my way to pickup",
    "Arrived at pickup location",
    "Materials loaded, heading to you",
    "Arriving in 5 minutes",
    "I'm here for delivery",
    "Running slightly late due to traffic",
  ];

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Chat with Customer</Text>
              <Text style={styles.headerSubtitle}>{trip.customerName || 'Customer'}</Text>
            </View>
            <TouchableOpacity onPress={makeCall} style={styles.callButton}>
              <Ionicons name="call" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity onPress={sendETAUpdate} style={styles.quickActionButton}>
              <MaterialIcons name="schedule" size={20} color={theme.warning} />
              <Text style={styles.quickActionText}>ETA</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sendPhoto('general')} style={styles.quickActionButton}>
              <MaterialIcons name="camera-alt" size={20} color={theme.accent} />
              <Text style={styles.quickActionText}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sendPhoto('pickup_after')} style={styles.quickActionButton}>
              <MaterialIcons name="inventory" size={20} color={theme.success} />
              <Text style={styles.quickActionText}>Pickup</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => sendPhoto('delivery_after')} style={styles.quickActionButton}>
              <MaterialIcons name="local-shipping" size={20} color={theme.success} />
              <Text style={styles.quickActionText}>Delivery</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Messages */}
          <View style={styles.quickMessagesContainer}>
            <FlatList
              horizontal
              data={quickMessages}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.quickMessageButton}
                  onPress={() => sendQuickMessage(item)}
                >
                  <Text style={styles.quickMessageText}>{item}</Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
              onPress={sendTextMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={(!newMessage.trim() || sendingMessage) ? theme.lightText : theme.secondary} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Image Modal */}
        {selectedImage && (
          <Modal visible={!!selectedImage} transparent>
            <View style={styles.imageModalContainer}>
              <TouchableOpacity
                style={styles.imageModalBackdrop}
                onPress={() => setSelectedImage(null)}
              >
                <Image source={{ uri: selectedImage }} style={styles.fullSizeImage} />
              </TouchableOpacity>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 2,
  },
  callButton: {
    padding: 5,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 15,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.background,
    minWidth: 60,
  },
  quickActionText: {
    fontSize: 11,
    color: theme.text,
    marginTop: 4,
    fontWeight: '500',
  },
  quickMessagesContainer: {
    backgroundColor: theme.secondary,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  quickMessageButton: {
    backgroundColor: theme.accent + '10',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginLeft: 10,
  },
  quickMessageText: {
    fontSize: 13,
    color: theme.accent,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
    backgroundColor: theme.background,
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 15,
  },
  driverMessage: {
    alignItems: 'flex-end',
  },
  customerMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 18,
  },
  driverBubble: {
    backgroundColor: theme.driverBubble,
    borderBottomRightRadius: 4,
  },
  customerBubble: {
    backgroundColor: theme.customerBubble,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  driverText: {
    color: theme.secondary,
  },
  customerText: {
    color: theme.text,
  },
  messageTime: {
    fontSize: 12,
    color: theme.lightText,
    marginTop: 4,
    marginHorizontal: 12,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  systemMessageText: {
    fontSize: 14,
    color: theme.lightText,
    backgroundColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  etaUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  etaUpdateText: {
    fontSize: 12,
    color: theme.warning,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: theme.accent,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: theme.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.lightText,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullSizeImage: {
    width: width * 0.9,
    height: height * 0.7,
    resizeMode: 'contain',
  },
});

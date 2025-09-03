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
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { driverCommunicationService, TripMessage, TripPhoto } from '../services/DriverCommunicationService';
import { OrderAssignment } from '../services/DriverService';

interface Props {
  trip: OrderAssignment;
  isVisible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

const theme = {
  primary: '#1E3A8A',      // Professional blue
  secondary: '#FFFFFF',     // Clean white
  accent: '#3B82F6',       // Bright blue for accents
  success: '#3B82F6',      // Blue instead of green
  warning: '#F59E0B',      // Warm amber
  error: '#EF4444',        // Modern red
  background: '#F8FAFC',   // Very light blue-gray
  text: '#1F2937',         // Dark gray for text
  lightText: '#6B7280',    // Medium gray for secondary text
  border: '#E5E7EB',       // Light border
  inputBackground: '#FFFFFF',
  driverBubble: '#3B82F6', // Blue for driver messages
  customerBubble: '#F1F5F9', // Light gray for customer messages
  shadow: '#000000',
};

export const DriverChatScreen: React.FC<Props> = ({ trip, isVisible, onClose }) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showETAModal, setShowETAModal] = useState(false);
  const [etaInput, setEtaInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<{
    uri: string;
    type: TripPhoto['photo_type'];
    description?: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
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

      if (result.success && result.message) {
        // Add sent message to UI immediately
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === result.message!.id);
          if (!exists) {
            return [...prev, result.message!];
          }
          return prev;
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const sendETAUpdate = () => {
    console.log('🎯 sendETAUpdate function called');
    console.log('🎯 Android ETA Update - Starting prompt');
    console.log('🎯 Trip details:', { id: trip.id, customerId: trip.customerId });
    
    if (Platform.OS === 'android') {
      // Use custom modal for Android
      console.log('🎯 Android ETA Update - Opening custom modal');
      setEtaInput('');
      setShowETAModal(true);
    } else {
      // Use Alert.prompt for iOS
      Alert.prompt(
        'Update ETA',
        'Enter new estimated arrival time (in minutes)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: async (value) => {
              console.log('🎯 iOS ETA Update - Send pressed with value:', value);
              await handleETASubmit(value || '');
            },
          },
        ],
        'plain-text',
        '',
        'numeric'
      );
    }
  };

  const handleETASubmit = async (value: string) => {
    console.log('🎯 handleETASubmit called with value:', value);
    if (value && !isNaN(Number(value))) {
      console.log('🎯 ETA Update - Valid value, sending to service');
      const result = await driverCommunicationService.sendETAUpdate(
        trip.id,
        trip.customerId,
        Number(value)
      );
      console.log('🎯 ETA Update - Service result:', result);
      if (result.success && result.message) {
        console.log('✅ ETA Update - Success!');
        // Add ETA update to UI immediately
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === result.message!.id);
          if (!exists) {
            return [...prev, result.message!];
          }
          return prev;
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.log('❌ ETA Update - Failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to send ETA update');
      }
    } else {
      console.log('❌ ETA Update - Invalid value');
      Alert.alert('Error', 'Please enter a valid number of minutes');
    }
  };

  const sendPhoto = async (photoType: TripPhoto['photo_type']) => {
    try {
      // Show action sheet for camera vs library choice
      Alert.alert(
        'Add Photo',
        'Choose how to add a photo',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Take Photo', 
            onPress: () => selectPhotoWithSource(photoType, 'camera')
          },
          { 
            text: 'Choose from Library', 
            onPress: () => selectPhotoWithSource(photoType, 'library')
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const selectPhotoWithSource = async (photoType: TripPhoto['photo_type'], source: 'camera' | 'library') => {
    try {
      // Request permission based on source
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access camera is required');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Permission to access camera roll is required');
          return;
        }
      }

      // Launch the appropriate picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.5, // Reduced for faster uploads
            exif: false, // Remove EXIF data to reduce size
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.5, // Reduced for faster uploads
            exif: false, // Remove EXIF data to reduce size
          });

      if (!result.canceled && result.assets[0]) {
        // Show preview instead of sending immediately
        setPhotoPreview({
          uri: result.assets[0].uri,
          type: photoType,
          description: `${photoType.replace('_', ' ')} photo`
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const sendSelectedPhoto = async () => {
    if (!photoPreview) return;

    try {
      setSendingMessage(true);
      setUploadProgress('Optimizing image...');
      
      const result = await driverCommunicationService.sendPhotoFromUri(
        trip.id,
        trip.customerId,
        photoPreview.uri,
        photoPreview.type,
        photoPreview.description
      );

      setUploadProgress('Uploading...');

      if (result.success && result.message) {
        // Add photo message to UI immediately
        setMessages(prev => {
          const exists = prev.find(msg => msg.id === result.message!.id);
          if (!exists) {
            return [...prev, result.message!];
          }
          return prev;
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Close preview
        setPhotoPreview(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to send photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send photo');
    } finally {
      setSendingMessage(false);
      setUploadProgress('');
    }
  };

  const cancelPhotoPreview = () => {
    setPhotoPreview(null);
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

    console.log('🎨 Rendering message:', {
      id: item.id.substring(0, 8),
      type: item.message_type,
      hasImage: !!item.image_url,
      content: item.content.substring(0, 50)
    });

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
          {/* Show photo if it's a photo message */}
          {item.message_type === 'image' && item.image_url && (
            <TouchableOpacity onPress={() => setSelectedImage(item.image_url || null)}>
              <Image 
                source={{ uri: item.image_url }} 
                style={styles.messagePhoto}
                resizeMode="cover"
                onLoad={() => console.log('✅ Image loaded successfully:', item.image_url)}
                onError={(error) => {
                  console.error('❌ Image failed to load:', item.image_url, error.nativeEvent.error);
                }}
                onLoadStart={() => console.log('🔄 Image loading started:', item.image_url)}
                onLoadEnd={() => console.log('🏁 Image loading ended:', item.image_url)}
              />
            </TouchableOpacity>
          )}
          
          {/* Text content - only show if not an image-only message */}
          {(item.message_type !== 'image' || item.content) && (
            <Text style={[styles.messageText, isDriver ? styles.driverText : styles.customerText]}>
              {item.content}
            </Text>
          )}
          
          {/* ETA Update Badge */}
          {item.message_type === 'eta_update' && (
            <View style={styles.etaUpdateBadge}>
              <MaterialIcons name="schedule" size={12} color={theme.warning} />
              <Text style={styles.etaUpdateText}>ETA Update</Text>
            </View>
          )}
          
          {/* Location sharing */}
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <View style={styles.customerProfileSection}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={20} color={theme.secondary} />
                </View>
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{trip.customerName || 'Customer'}</Text>
                  <Text style={styles.tripStatus}>
                    {trip.status === 'pending' ? 'New Trip Request' : 
                     trip.status === 'accepted' ? 'Trip Accepted' :
                     'Active Trip'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={makeCall} style={styles.callButton}>
              <Ionicons name="call" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              onPress={() => {
                console.log('🎯 ETA Button Pressed on Android!');
                console.log('🎯 Platform:', Platform.OS);
                console.log('🎯 Trip ID:', trip.id);
                sendETAUpdate();
              }} 
              style={[
                styles.quickActionButton,
                Platform.select({
                  android: {
                    minHeight: 48,
                    minWidth: 48,
                    elevation: 4,
                    borderRadius: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                  },
                })
              ]}
              activeOpacity={0.7}
              accessible={true}
              accessibilityLabel="Send ETA Update"
              accessibilityRole="button"
              hitSlop={Platform.OS === 'android' ? { top: 10, bottom: 10, left: 10, right: 10 } : undefined}
            >
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
            showsVerticalScrollIndicator={false}
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
              style={[
                styles.sendButton, 
                (!newMessage.trim() || sendingMessage) ? styles.sendButtonDisabled : styles.sendButtonEnabled
              ]}
              onPress={sendTextMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              <MaterialIcons 
                name="send" 
                size={24} 
                color={(!newMessage.trim() || sendingMessage) ? '#CCCCCC' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* ETA Update Modal (Android Compatible) */}
        {showETAModal && (
          <Modal
            visible={showETAModal}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.etaModalContainer}>
              <View style={styles.etaModalContent}>
                <Text style={styles.etaModalTitle}>Update ETA</Text>
                <Text style={styles.etaModalSubtitle}>
                  Enter new estimated arrival time (in minutes)
                </Text>
                
                <TextInput
                  style={styles.etaModalInput}
                  placeholder="15"
                  value={etaInput}
                  onChangeText={setEtaInput}
                  keyboardType="numeric"
                  maxLength={3}
                  autoFocus={true}
                />
                
                <View style={styles.etaModalButtons}>
                  <TouchableOpacity
                    style={[styles.etaModalButton, styles.etaModalCancelButton]}
                    onPress={() => {
                      console.log('🎯 Android ETA Modal - Cancel pressed');
                      setShowETAModal(false);
                      setEtaInput('');
                    }}
                  >
                    <Text style={styles.etaModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.etaModalButton, styles.etaModalSendButton]}
                    onPress={async () => {
                      console.log('🎯 Android ETA Modal - Send pressed');
                      setShowETAModal(false);
                      await handleETASubmit(etaInput);
                      setEtaInput('');
                    }}
                  >
                    <Text style={styles.etaModalSendText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

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

        {/* Photo Preview Modal */}
        {photoPreview && (
          <Modal visible={!!photoPreview} transparent>
            <View style={styles.photoPreviewContainer}>
              <View style={styles.photoPreviewContent}>
                <Text style={styles.photoPreviewTitle}>Photo Preview</Text>
                <Text style={styles.photoPreviewType}>
                  {photoPreview.type.replace('_', ' ').toUpperCase()}
                </Text>
                
                <Image 
                  source={{ uri: photoPreview.uri }} 
                  style={styles.photoPreviewImage}
                  resizeMode="contain"
                />
                
                <View style={styles.photoPreviewActions}>
                  <TouchableOpacity 
                    style={[styles.photoPreviewButton, styles.photoPreviewCancelButton]}
                    onPress={cancelPhotoPreview}
                  >
                    <Text style={styles.photoPreviewCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.photoPreviewButton, 
                      styles.photoPreviewSendButton,
                      sendingMessage && styles.photoPreviewSendButtonDisabled
                    ]}
                    onPress={sendSelectedPhoto}
                    disabled={sendingMessage}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size={18} color={theme.secondary} />
                    ) : (
                      <MaterialIcons name="send" size={18} color={theme.secondary} />
                    )}
                    <Text style={styles.photoPreviewSendText}>
                      {sendingMessage ? (uploadProgress || 'Sending...') : 'Send Photo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    paddingVertical: 16,
    backgroundColor: theme.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.background,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.lightText,
  },
  customerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  tripStatus: {
    fontSize: 12,
    color: theme.lightText,
    marginTop: 2,
  },
  callButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: theme.accent,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.background,
    minWidth: 70,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    ...Platform.select({
      android: {
        minHeight: 44,
        elevation: 3,
      },
    }),
  },
  quickActionText: {
    fontSize: 11,
    color: theme.text,
    marginTop: 4,
    fontWeight: '500',
  },
  quickMessagesContainer: {
    backgroundColor: theme.secondary,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  quickMessageButton: {
    backgroundColor: '#3B82F6' + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#3B82F6' + '30',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickMessageText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 10,
    paddingBottom: 20,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  driverBubble: {
    backgroundColor: theme.driverBubble,
    borderBottomRightRadius: 6,
  },
  customerBubble: {
    backgroundColor: theme.customerBubble,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '400',
  },
  messagePhoto: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    color: '#3B82F6',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: theme.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    backgroundColor: theme.inputBackground,
    color: theme.text,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonEnabled: {
    backgroundColor: '#3B82F6',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
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
  // ETA Modal Styles
  etaModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  etaModalContent: {
    backgroundColor: theme.secondary,
    borderRadius: 16,
    padding: 24,
    minWidth: 300,
    maxWidth: '90%',
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  etaModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  etaModalSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
    marginBottom: 20,
  },
  etaModalInput: {
    borderWidth: 2,
    borderColor: theme.accent,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: theme.inputBackground,
    marginBottom: 24,
    fontWeight: '500',
    color: theme.text,
  },
  etaModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  etaModalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  etaModalCancelButton: {
    backgroundColor: theme.border,
  },
  etaModalSendButton: {
    backgroundColor: theme.accent,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  etaModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lightText,
  },
  etaModalSendText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.secondary,
  },
  photoPreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoPreviewContent: {
    backgroundColor: theme.secondary,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  photoPreviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  photoPreviewType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  photoPreviewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: theme.background,
  },
  photoPreviewActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  photoPreviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  photoPreviewCancelButton: {
    backgroundColor: theme.border,
  },
  photoPreviewSendButton: {
    backgroundColor: theme.accent,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  photoPreviewSendButtonDisabled: {
    backgroundColor: theme.lightText,
    opacity: 0.7,
  },
  photoPreviewCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lightText,
  },
  photoPreviewSendText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.secondary,
  },
});

/**
 * TripCommunicationPanel - Chat interface for driver-customer communication
 * Shows messages, allows photo uploads, and handles calls
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { communicationService, TripMessage, TripPhoto } from '../services/CommunicationService';
import { Colors } from '../theme/colors';
import { debugAuth, logUserInfo } from '../utils/debugAuth';

interface Props {
  tripId: string;
  driverId?: string;
  isVisible: boolean;
  onClose: () => void;
}

const TripCommunicationPanel: React.FC<Props> = ({ tripId, driverId, isVisible, onClose }) => {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isVisible && tripId) {
      loadTripData();
      setupMessageSubscription();
    }
  }, [isVisible, tripId]);

  const loadTripData = async () => {
    setLoading(true);
    try {
      // Debug authentication first
      console.log('=== TripCommunicationPanel Debug ===');
      await debugAuth();
      await logUserInfo();
      
      // Load messages
      const messageResult = await communicationService.getTripMessages(tripId);
      if (messageResult.success && messageResult.messages) {
        setMessages(messageResult.messages);
        // Mark messages as read
        await communicationService.markMessagesAsRead(tripId);
      }

      // Load photos
      const photoResult = await communicationService.getTripPhotos(tripId);
      if (photoResult.success && photoResult.photos) {
        setPhotos(photoResult.photos);
      }
    } catch (error) {
      console.error('Failed to load trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupMessageSubscription = () => {
    return communicationService.subscribeToTripMessages(tripId, (message) => {
      setMessages(prev => [...prev, message]);
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      console.log('=== Sending Message ===');
      console.log('Trip ID:', tripId);
      console.log('Message:', newMessage.trim());
      await logUserInfo(); // Check auth before sending
      
      const result = await communicationService.sendMessage(tripId, newMessage.trim());
      console.log('Send result:', result);
      
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message!]);
        setNewMessage('');
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('Send message failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { text: 'Camera', onPress: () => takePhoto(true) },
        { text: 'Gallery', onPress: () => takePhoto(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async (useCamera: boolean) => {
    try {
      const photoResult = await communicationService.selectPhoto(useCamera);
      if (photoResult.success && photoResult.uri) {
        // Show photo type selection
        Alert.alert(
          'Photo Type',
          'What type of photo is this?',
          [
            { text: 'General', onPress: () => uploadPhoto(photoResult.uri!, 'general') },
            { text: 'Location Proof', onPress: () => uploadPhoto(photoResult.uri!, 'location_proof') },
            { text: 'Damage Report', onPress: () => uploadPhoto(photoResult.uri!, 'damage_report') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadPhoto = async (uri: string, photoType: TripPhoto['photo_type']) => {
    setLoading(true);
    try {
      const result = await communicationService.uploadTripPhoto(tripId, uri, photoType);
      if (result.success && result.photo) {
        setPhotos(prev => [result.photo!, ...prev]);
        Alert.alert('Success', 'Photo uploaded successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = async () => {
    if (!driverId) {
      Alert.alert('Error', 'Driver information not available');
      return;
    }

    Alert.alert(
      'Call Driver',
      'What type of call do you want to make?',
      [
        { text: 'Voice Call', onPress: () => initiateCall('voice') },
        { text: 'Emergency', onPress: () => initiateCall('emergency') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const initiateCall = async (callType: 'voice' | 'emergency' | 'support') => {
    try {
      console.log('📞 Initiating call with driver ID:', driverId);
      console.log('📞 Trip ID:', tripId);
      console.log('📞 Call type:', callType);
      const result = await communicationService.initiateCall(tripId, driverId!, callType);
      
      if (result.success && result.phone) {
        console.log('✅ Call logged, opening dialer for:', result.phone);
        
        // Open the phone dialer
        const phoneUrl = `tel:${result.phone}`;
        const canOpen = await Linking.canOpenURL(phoneUrl);
        
        if (canOpen) {
          await Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Unable to open phone dialer');
        }
      } else {
        console.error('❌ Call failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const renderMessage = ({ item }: { item: TripMessage }) => {
    const isOwnMessage = item.sender_type === 'customer';
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {item.message_type === 'image' && item.image_url && (
            <TouchableOpacity onPress={() => setSelectedImage(item.image_url!)}>
              <Image source={{ uri: item.image_url }} style={styles.messageImage} />
            </TouchableOpacity>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderPhoto = ({ item }: { item: TripPhoto }) => (
    <TouchableOpacity 
      style={styles.photoContainer}
      onPress={() => setSelectedImage(item.image_url)}
    >
      <Image source={{ uri: item.image_url }} style={styles.photoThumbnail} />
      <Text style={styles.photoType}>{item.photo_type.replace('_', ' ')}</Text>
      <Text style={styles.photoTime}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Communication</Text>
          <TouchableOpacity onPress={handleCall} style={styles.callButton}>
            <MaterialIcons name="phone" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Photos Section */}
        {photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Trip Photos</Text>
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosList}
            />
          </View>
        )}

        {/* Messages */}
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        </View>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handlePhotoUpload} style={styles.photoButton}>
            <MaterialIcons name="camera-alt" size={24} color={Colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={Colors.text.secondary}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity 
            onPress={sendMessage} 
            style={[styles.sendButton, { opacity: newMessage.trim() ? 1 : 0.5 }]}
            disabled={!newMessage.trim() || sendingMessage}
          >
            <MaterialIcons name="send" size={24} color={Colors.text.white} />
          </TouchableOpacity>
        </View>

        {/* Full-Screen Image Modal */}
        <Modal 
          visible={!!selectedImage} 
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View style={styles.imageModalContainer}>
            <TouchableOpacity 
              style={styles.imageModalBackground}
              onPress={() => setSelectedImage(null)}
            >
              <View style={styles.imageModalContent}>
                <TouchableOpacity 
                  style={styles.closeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <MaterialIcons name="close" size={30} color={Colors.text.white} />
                </TouchableOpacity>
                {selectedImage && (
                  <Image 
                    source={{ uri: selectedImage }} 
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  callButton: {
    padding: 8,
  },
  photosSection: {
    backgroundColor: Colors.text.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  photosList: {
    paddingLeft: 16,
  },
  photoContainer: {
    marginRight: 12,
    alignItems: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 4,
  },
  photoType: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  photoTime: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: Colors.primary,
  },
  otherBubble: {
    backgroundColor: Colors.background.card,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: Colors.text.white,
  },
  otherMessageText: {
    color: Colors.text.primary,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: Colors.text.white,
    opacity: 0.7,
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.text.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.text.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  photoButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    color: Colors.text.primary,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  closeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
});

export default TripCommunicationPanel;

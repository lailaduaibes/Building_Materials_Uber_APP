/**
 * CustomerCommunicationComponent
 * Allows drivers to send messages and ETA updates to customers
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';

interface CustomerCommunicationProps {
  tripId: string;
  visible: boolean;
  onClose: () => void;
}

const theme = {
  primary: '#000000',
  secondary: '#FFFFFF',
  accent: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#FFFFFF',
  text: '#000000',
  lightText: '#8E8E93',
  border: '#C6C6C8',
};

export const CustomerCommunicationComponent: React.FC<CustomerCommunicationProps> = ({
  tripId,
  visible,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'message' | 'eta'>('message');
  const [customMessage, setCustomMessage] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [sending, setSending] = useState(false);

  const predefinedMessages = [
    "I'm on my way to pickup the materials",
    "Materials loaded, heading to your location",
    "Running slightly behind due to traffic",
    "Arriving at your location in 5 minutes",
    "I'm here for delivery, please be available",
  ];

  const sendPredefinedMessage = async (message: string) => {
    setSending(true);
    try {
      const success = await driverService.sendMessageToCustomer(tripId, message);
      if (success) {
        Alert.alert('Success', 'Message sent to customer');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendCustomMessage = async () => {
    if (!customMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const success = await driverService.sendMessageToCustomer(tripId, customMessage.trim());
      if (success) {
        Alert.alert('Success', 'Message sent to customer');
        setCustomMessage('');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendETAUpdate = async () => {
    const eta = parseInt(etaMinutes);
    if (!eta || eta < 1) {
      Alert.alert('Error', 'Please enter a valid ETA in minutes');
      return;
    }

    setSending(true);
    try {
      const success = await driverService.sendETAUpdate(
        tripId,
        eta,
        delayReason.trim() || undefined
      );
      if (success) {
        Alert.alert('Success', 'ETA update sent to customer');
        setEtaMinutes('');
        setDelayReason('');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to send ETA update');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send ETA update');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customer Communication</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'message' && styles.activeTab]}
              onPress={() => setActiveTab('message')}
            >
              <MaterialIcons name="message" size={20} color={activeTab === 'message' ? theme.accent : theme.lightText} />
              <Text style={[styles.tabText, activeTab === 'message' && styles.activeTabText]}>
                Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'eta' && styles.activeTab]}
              onPress={() => setActiveTab('eta')}
            >
              <MaterialIcons name="schedule" size={20} color={activeTab === 'eta' ? theme.accent : theme.lightText} />
              <Text style={[styles.tabText, activeTab === 'eta' && styles.activeTabText]}>
                ETA Update
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'message' ? (
            <View style={styles.messageContent}>
              <Text style={styles.sectionTitle}>Quick Messages</Text>
              {predefinedMessages.map((message, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.predefinedMessage}
                  onPress={() => sendPredefinedMessage(message)}
                  disabled={sending}
                >
                  <Text style={styles.predefinedMessageText}>{message}</Text>
                  <MaterialIcons name="send" size={20} color={theme.accent} />
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionTitle}>Custom Message</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Type your message..."
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.disabledButton]}
                onPress={sendCustomMessage}
                disabled={sending || !customMessage.trim()}
              >
                <Text style={styles.sendButtonText}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.etaContent}>
              <Text style={styles.sectionTitle}>Update Estimated Arrival</Text>
              
              <Text style={styles.inputLabel}>ETA (minutes)</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="15"
                value={etaMinutes}
                onChangeText={setEtaMinutes}
                keyboardType="numeric"
                maxLength={3}
              />

              <Text style={styles.inputLabel}>Reason for delay (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Traffic, loading issues, etc."
                value={delayReason}
                onChangeText={setDelayReason}
                maxLength={100}
              />

              <TouchableOpacity
                style={[styles.sendButton, sending && styles.disabledButton]}
                onPress={sendETAUpdate}
                disabled={sending || !etaMinutes}
              >
                <Text style={styles.sendButtonText}>
                  {sending ? 'Sending...' : 'Send ETA Update'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 34,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.accent,
  },
  tabText: {
    fontSize: 16,
    color: theme.lightText,
  },
  activeTabText: {
    color: theme.accent,
    fontWeight: '500',
  },
  messageContent: {
    flex: 1,
    padding: 20,
  },
  etaContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 15,
  },
  predefinedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: theme.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  predefinedMessageText: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 8,
  },
  sendButton: {
    backgroundColor: theme.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.lightText,
  },
  sendButtonText: {
    color: theme.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

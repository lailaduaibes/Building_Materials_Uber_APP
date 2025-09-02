/**
 * Driver Support Screen - Help & Support Ticket System
 * Allows drivers to create and view support tickets like the customer app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../AuthServiceSupabase';

// Use the same Supabase configuration as DriverService
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

const { width } = Dimensions.get('window');

// Professional theme matching driver app
const theme = {
  primary: '#3B82F6',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  cardBackground: '#FFFFFF',
  shadow: '#000000',
};

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  support_messages?: SupportMessage[];
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
}

interface DriverSupportScreenProps {
  onBack: () => void;
}

export default function DriverSupportScreen({ onBack }: DriverSupportScreenProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'create' | 'tickets'>('create');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('showAddComment state changed to:', showAddComment);
  }, [showAddComment]);

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Payment/Earnings' },
    { value: 'delivery', label: 'Delivery Issue' },
    { value: 'vehicle', label: 'Vehicle/Equipment' },
    { value: 'safety', label: 'Safety Concern' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: theme.success },
    { value: 'medium', label: 'Medium', color: theme.warning },
    { value: 'high', label: 'High', color: theme.error },
  ];

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated with Supabase (same as customer app)
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Authentication Required', 'Please login to view your support tickets');
        return;
      }

      // Load support tickets with messages for this user
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages (
            id,
            ticket_id,
            user_id,
            message,
            is_staff_reply,
            created_at
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tickets:', error);
        Alert.alert('Error', 'Failed to load support tickets');
        return;
      }

      console.log('📧 Support tickets loaded with messages:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is authenticated with Supabase (same as customer app)
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Authentication Required', 'You must be logged in to submit a support ticket');
        return;
      }

      // Create support ticket for this user
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: currentUser.id,
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
          status: 'open',
        });

      if (error) {
        console.error('Error creating ticket:', error);
        Alert.alert('Error', 'Failed to submit support ticket');
        return;
      }

      // Reset form
      setSubject('');
      setDescription('');
      setCategory('general');
      setPriority('medium');

      Alert.alert(
        'Success', 
        'Your support ticket has been submitted successfully. Our team will get back to you soon.',
        [
          { text: 'OK', onPress: () => setActiveTab('tickets') }
        ]
      );

    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Failed to submit support ticket');
    } finally {
      setLoading(false);
    }
  };

  const renderCreateTicket = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Subject */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Subject *</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief description of your issue"
          placeholderTextColor={theme.lightText}
        />
      </View>

      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.optionsContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.optionButton,
                category === cat.value && styles.selectedOption
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Text style={[
                styles.optionText,
                category === cat.value && styles.selectedOptionText
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Priority */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((prio) => (
            <TouchableOpacity
              key={prio.value}
              style={[
                styles.priorityButton,
                priority === prio.value && { backgroundColor: prio.color + '20', borderColor: prio.color }
              ]}
              onPress={() => setPriority(prio.value)}
            >
              <View style={[styles.priorityDot, { backgroundColor: prio.color }]} />
              <Text style={[
                styles.priorityText,
                priority === prio.value && { color: prio.color }
              ]}>
                {prio.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Please provide detailed information about your issue or question"
          placeholderTextColor={theme.lightText}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={submitTicket}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Submitting...' : 'Submit Ticket'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTicketItem = ({ item }: { item: SupportTicket }) => (
    <TouchableOpacity 
      style={styles.ticketCard}
      onPress={() => setSelectedTicket(item)}
      activeOpacity={0.7}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketSubject}>{item.subject}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.ticketCategory}>{getCategoryLabel(item.category)}</Text>
      <Text style={styles.ticketDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
          <Ionicons name="chevron-forward" size={16} color={theme.lightText} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTickets = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tickets...</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={64} color={theme.lightText} />
          <Text style={styles.emptyTitle}>No Support Tickets</Text>
          <Text style={styles.emptyDescription}>
            You haven't submitted any support tickets yet.
          </Text>
          <TouchableOpacity
            style={styles.createFirstButton}
            onPress={() => setActiveTab('create')}
          >
            <Text style={styles.createFirstButtonText}>Create Your First Ticket</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return theme.error;
      case 'in_progress': return theme.warning;
      case 'resolved': return theme.success;
      case 'closed': return theme.lightText;
      default: return theme.lightText;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return theme.success;
      case 'medium': return theme.warning;
      case 'high': return theme.error;
      default: return theme.lightText;
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat?.label || category;
  };

  const refreshSelectedTicket = async () => {
    if (!selectedTicket) return;
    
    try {
      // Reload the specific ticket with its messages
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages (
            id,
            message,
            is_staff_reply,
            created_at,
            user_id
          )
        `)
        .eq('id', selectedTicket.id)
        .single();

      if (error) {
        console.error('Error refreshing ticket:', error);
        return;
      }

      if (data) {
        console.log('Refreshed ticket data:', data);
        console.log('Number of messages:', data.support_messages?.length || 0);
        
        // Update the selected ticket with fresh data
        setSelectedTicket(data);
        
        // Also update the ticket in the tickets list
        setTickets(prevTickets => 
          prevTickets.map(ticket => 
            ticket.id === data.id ? data : ticket
          )
        );
      }
    } catch (error) {
      console.error('Error refreshing selected ticket:', error);
    }
  };

  const addComment = async () => {
    console.log('Add comment called, newComment:', newComment);
    console.log('selectedTicket:', selectedTicket?.id);
    
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    
    if (!selectedTicket) {
      Alert.alert('Error', 'No ticket selected');
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is authenticated
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Authentication Required', 'You must be logged in to add a comment');
        return;
      }

      console.log('Adding comment for user:', currentUser.id);

      // Add comment to support_messages table
      const { data: insertedComment, error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: currentUser.id,
          message: newComment.trim(),
          is_staff_reply: false, // This is a user comment, not staff reply
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment: ' + error.message);
        return;
      }

      console.log('Comment inserted successfully:', insertedComment);

      // Reset form
      setNewComment('');
      setShowAddComment(false);

      // Refresh the selected ticket to show the new comment
      await refreshSelectedTicket();
      
      Alert.alert('Success', 'Comment added successfully');

    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const renderTicketDetails = () => {
    if (!selectedTicket) return null;

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedTicket(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.ticketDetailsContent} showsVerticalScrollIndicator={false}>
          {/* Ticket Status */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTicket.status) }]}>
                <Text style={styles.statusText}>{selectedTicket.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Info */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Ticket Information</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subject:</Text>
              <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{getCategoryLabel(selectedTicket.category)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Priority:</Text>
              <View style={styles.priorityRow}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(selectedTicket.priority) }]} />
                <Text style={[styles.detailValue, { color: getPriorityColor(selectedTicket.priority) }]}>
                  {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedTicket.created_at).toLocaleDateString()} at {new Date(selectedTicket.created_at).toLocaleTimeString()}
              </Text>
            </View>
            
            {selectedTicket.updated_at && selectedTicket.updated_at !== selectedTicket.created_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Updated:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedTicket.updated_at).toLocaleDateString()} at {new Date(selectedTicket.updated_at).toLocaleTimeString()}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Description</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{selectedTicket.description}</Text>
            </View>
          </View>

          {/* Messages/Replies */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>
              Messages & Replies 
              {selectedTicket.support_messages ? ` (${selectedTicket.support_messages.length})` : ' (0)'}
            </Text>
            
            {selectedTicket.support_messages && selectedTicket.support_messages.length > 0 ? (
              selectedTicket.support_messages
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((message, index) => (
                <View key={message.id} style={[
                  styles.messageItem,
                  message.is_staff_reply ? styles.adminMessage : styles.userMessage
                ]}>
                  <View style={styles.messageHeader}>
                    <View style={styles.messageAuthor}>
                      <Ionicons 
                        name={message.is_staff_reply ? "shield-checkmark" : "person"} 
                        size={16} 
                        color={message.is_staff_reply ? theme.primary : theme.lightText} 
                      />
                      <Text style={[
                        styles.messageAuthorText,
                        message.is_staff_reply && styles.adminAuthorText
                      ]}>
                        {message.is_staff_reply ? 'Support Team' : 'You'}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>
                      {new Date(message.created_at).toLocaleDateString()} {new Date(message.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.messageText}>{message.message}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noMessagesContainer}>
                <Ionicons name="chatbubble-outline" size={48} color={theme.lightText} />
                <Text style={styles.noMessagesText}>No replies yet</Text>
                <Text style={styles.noMessagesSubtext}>
                  Our support team will respond to your ticket soon
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>Actions</Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                console.log('Add comment button pressed');
                console.log('Current showAddComment state:', showAddComment);
                setShowAddComment(true);
                console.log('Called setShowAddComment(true)');
                
                // Force immediate check
                setTimeout(() => {
                  console.log('After timeout, showAddComment should be:', showAddComment);
                }, 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
              <Text style={styles.actionButtonText}>Add Comment</Text>
            </TouchableOpacity>
            
            {selectedTicket.status === 'open' && (
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]}>
                <Ionicons name="close-circle-outline" size={20} color={theme.error} />
                <Text style={[styles.actionButtonText, { color: theme.error }]}>Cancel Ticket</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderAddCommentModal = () => {
    console.log('Rendering modal, showAddComment:', showAddComment);
    return (
    <Modal
      visible={showAddComment}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddComment(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Comment</Text>
            <TouchableOpacity onPress={() => setShowAddComment(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Your Comment</Text>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={(text) => {
                console.log('Comment text changed:', text);
                setNewComment(text);
              }}
              placeholder="Type your comment here..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={theme.secondary}
            />
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowAddComment(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton, 
                styles.modalSubmitButton,
                (loading || !newComment.trim()) && styles.modalDisabledButton
              ]}
              onPress={addComment}
              disabled={loading || !newComment.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSubmitButtonText}>
                {loading ? 'Adding...' : 'Add Comment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    );
  };

  return (
    <>
      {selectedTicket ? renderTicketDetails() : (
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help & Support</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'create' && styles.activeTab]}
              onPress={() => setActiveTab('create')}
            >
              <Ionicons 
                name="add-circle-outline" 
                size={20} 
                color={activeTab === 'create' ? theme.primary : theme.lightText} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'create' && styles.activeTabText
              ]}>
                Create Ticket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
              onPress={() => setActiveTab('tickets')}
            >
              <Ionicons 
                name="list-outline" 
                size={20} 
                color={activeTab === 'tickets' ? theme.primary : theme.lightText} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'tickets' && styles.activeTabText
              ]}>
                My Tickets
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'create' ? renderCreateTicket() : renderTickets()}
        </SafeAreaView>
      )}
      
      {/* Add Comment Modal - Always rendered */}
      {renderAddCommentModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.lightText,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.white,
  },
  textArea: {
    height: 120,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
  },
  selectedOption: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  optionText: {
    fontSize: 14,
    color: theme.text,
  },
  selectedOptionText: {
    color: theme.white,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 14,
    color: theme.text,
  },
  submitButton: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.lightText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.lightText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createFirstButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.white,
  },
  ticketCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.white,
  },
  ticketCategory: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 8,
  },
  ticketDescription: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: theme.lightText,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Ticket Details Styles
  ticketDetailsContent: {
    flex: 1,
    padding: 20,
  },
  detailsSection: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lightText,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 22,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionBox: {
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  descriptionText: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
  },
  cancelButton: {
    borderColor: theme.error + '40',
    backgroundColor: theme.error + '10',
  },
  // Messages Styles
  messageItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  userMessage: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    marginLeft: 20,
  },
  adminMessage: {
    backgroundColor: theme.primary + '10',
    borderColor: theme.primary + '30',
    marginRight: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageAuthorText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lightText,
  },
  adminAuthorText: {
    color: theme.primary,
  },
  messageTime: {
    fontSize: 12,
    color: theme.lightText,
  },
  messageText: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  },
  noMessagesContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lightText,
    marginTop: 12,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: theme.lightText,
    textAlign: 'center',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.background,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.lightText,
  },
  modalSubmitButton: {
    backgroundColor: theme.primary,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.white,
  },
  modalDisabledButton: {
    backgroundColor: theme.border,
    opacity: 0.6,
  },
});

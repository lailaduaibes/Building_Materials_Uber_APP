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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../AuthServiceSupabase';
import SupportScreenUtils from '../utils/SupportScreenUtils';

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

// Professional theme matching driver app with enhanced visual hierarchy
const theme = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#DBEAFE',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  darkText: '#111827',
  mutedText: '#9CA3AF',
  border: '#E5E7EB',
  lightBorder: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#06B6D4',
  shadow: 'rgba(0, 0, 0, 0.1)',
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

// Helper functions for support ticket display
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'open':
      return theme.info;
    case 'in_progress':
      return theme.warning;
    case 'resolved':
      return theme.success;
    case 'closed':
      return theme.mutedText;
    default:
      return theme.lightText;
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return theme.error;
    case 'medium':
      return theme.warning;
    case 'low':
      return theme.success;
    default:
      return theme.lightText;
  }
};

const getCategoryLabel = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'general': 'General Inquiry',
    'technical': 'Technical Issue', 
    'billing': 'Payment/Earnings',
    'delivery': 'Delivery Issue',
    'vehicle': 'Vehicle/Equipment',
    'safety': 'Safety Concern',
  };
  return categoryMap[category] || category;
};

const getPriorityDescription = (priority: string): string => {
  const priorityDescriptions: { [key: string]: string } = {
    'low': 'General questions',
    'medium': 'Standard issues',
    'high': 'Urgent problems',
  };
  return priorityDescriptions[priority] || 'Select priority';
};

const getCategoryIcon = (category: string): string => {
  const categoryIcons: { [key: string]: string } = {
    'general': 'help-circle-outline',
    'technical': 'settings-outline',
    'billing': 'card-outline',
    'delivery': 'car-outline',
    'vehicle': 'build-outline',
    'safety': 'shield-checkmark-outline',
  };
  return categoryIcons[category] || 'help-circle-outline';
};

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

  // Helper function for translated category labels
  const getTranslatedCategoryLabel = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'general': t('support.categories.general', 'General Inquiry'),
      'technical': t('support.categories.technical', 'Technical Issue'),
      'billing': t('support.categories.billing', 'Payment/Earnings'),
      'delivery': t('support.categories.delivery', 'Delivery Issue'),
      'vehicle': t('support.categories.vehicle', 'Vehicle/Equipment'),
      'safety': t('support.categories.safety', 'Safety Concern'),
    };
    return categoryMap[category] || category;
  };

  const categories = [
    { value: 'general', label: t('support.categories.general', 'General Inquiry') },
    { value: 'technical', label: t('support.categories.technical', 'Technical Issue') },
    { value: 'billing', label: t('support.categories.billing', 'Payment/Earnings') },
    { value: 'delivery', label: t('support.categories.delivery', 'Delivery Issue') },
    { value: 'vehicle', label: t('support.categories.vehicle', 'Vehicle/Equipment') },
    { value: 'safety', label: t('support.categories.safety', 'Safety Concern') },
  ];

  const priorities = [
    { value: 'low', label: t('support.priorities.low', 'Low'), color: theme.success },
    { value: 'medium', label: t('support.priorities.medium', 'Medium'), color: theme.warning },
    { value: 'high', label: t('support.priorities.high', 'High'), color: theme.error },
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
        Alert.alert(
          t('support.alerts.authRequired', 'Authentication Required'), 
          t('support.alerts.authMessage', 'Please login to view your support tickets')
        );
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
        Alert.alert(
          t('support.alerts.error', 'Error'), 
          t('support.alerts.loadTicketsError', 'Failed to load support tickets')
        );
        return;
      }

      console.log('📧 Support tickets loaded with messages:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert(
        t('support.alerts.error', 'Error'), 
        t('support.alerts.loadTicketsError', 'Failed to load support tickets')
      );
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert(
        t('support.alerts.error', 'Error'), 
        t('support.alerts.fillRequiredFields', 'Please fill in all required fields')
      );
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is authenticated with Supabase (same as customer app)
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert(
          t('support.alerts.authRequired', 'Authentication Required'), 
          t('support.alerts.submitAuthMessage', 'You must be logged in to submit a support ticket')
        );
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
        Alert.alert(
          t('support.alerts.error', 'Error'), 
          t('support.alerts.submitError', 'Failed to submit support ticket')
        );
        return;
      }

      // Reset form
      setSubject('');
      setDescription('');
      setCategory('general');
      setPriority('medium');

      Alert.alert(
        t('support.alerts.success', 'Success'), 
        t('support.alerts.submitSuccess', 'Your support ticket has been submitted successfully. Our team will get back to you soon.'),
        [
          { text: t('support.alerts.ok', 'OK'), onPress: () => setActiveTab('tickets') }
        ]
      );

    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert(
        t('support.alerts.error', 'Error'), 
        t('support.alerts.submitError', 'Failed to submit support ticket')
      );
    } finally {
      setLoading(false);
    }
  };

  const renderCreateTicket = () => (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: Platform.OS === 'android' ? 120 : 80 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Subject */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('support.form.subject', 'Subject')} *</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder={t('support.form.subjectPlaceholder', 'Brief description of your issue')}
          placeholderTextColor={theme.lightText}
        />
      </View>

      {/* Category - Simple Design */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('support.form.category', 'Category')}</Text>
        <Text style={styles.sublabel}>
          {t('support.form.categoryHelp', 'What type of issue are you experiencing?')}
        </Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat, index) => {
            const isSelected = category === cat.value;
            
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  isSelected && styles.selectedCategoryButton
                ]}
                onPress={() => setCategory(cat.value)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={getCategoryIcon(cat.value) as any} 
                  size={20} 
                  color={isSelected ? theme.primary : theme.mutedText} 
                />
                <Text style={[
                  styles.categoryText,
                  isSelected && { color: theme.primary, fontWeight: '600' }
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Priority - Simple Design */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('support.form.priority', 'Priority')}</Text>
        <Text style={styles.sublabel}>
          {t('support.form.priorityHelp', 'Select the urgency level of your issue')}
        </Text>
        <View style={styles.priorityContainer}>
          {priorities.map((prio, index) => {
            const isSelected = priority === prio.value;
            
            return (
              <TouchableOpacity
                key={prio.value}
                style={[
                  styles.priorityButton,
                  isSelected && { borderColor: prio.color, backgroundColor: prio.color + '10' }
                ]}
                onPress={() => setPriority(prio.value)}
                activeOpacity={0.7}
              >
                <View style={[styles.priorityDot, { backgroundColor: prio.color }]} />
                <Text style={[
                  styles.priorityText,
                  isSelected && { color: prio.color, fontWeight: '600' }
                ]}>
                  {prio.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('support.form.description', 'Description')} *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('support.form.descriptionPlaceholder', 'Please provide detailed information about your issue or question')}
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
          {loading ? t('support.form.submitting', 'Submitting...') : t('support.form.submitTicket', 'Submit Ticket')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
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
      
      <Text style={styles.ticketCategory}>{getTranslatedCategoryLabel(item.category)}</Text>
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
          <Text style={styles.loadingText}>{t('support.loading', 'Loading tickets...')}</Text>
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="help-circle-outline" size={64} color={theme.lightText} />
          <Text style={styles.emptyTitle}>{t('support.empty.title', 'No Support Tickets')}</Text>
          <Text style={styles.emptyDescription}>
            {t('support.empty.description', 'You haven\'t submitted any support tickets yet.')}
          </Text>
          <TouchableOpacity
            style={styles.createFirstButton}
            onPress={() => setActiveTab('create')}
          >
            <Text style={styles.createFirstButtonText}>
              {t('support.empty.createFirst', 'Create Your First Ticket')}
            </Text>
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
          <Text style={styles.headerTitle}>{t('support.ticketDetails', 'Ticket Details')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.ticketDetailsContent} showsVerticalScrollIndicator={false}>
          {/* Ticket Status */}
          <View style={styles.detailsSection}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{t('support.status', 'Status')}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTicket.status) }]}>
                <Text style={styles.statusText}>{selectedTicket.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Info */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsTitle}>{t('support.ticketInformation', 'Ticket Information')}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('support.form.subject', 'Subject')}:</Text>
              <Text style={styles.detailValue}>{selectedTicket.subject}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('support.form.category', 'Category')}:</Text>
              <Text style={styles.detailValue}>{getTranslatedCategoryLabel(selectedTicket.category)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('support.form.priority', 'Priority')}:</Text>
              <View style={styles.priorityRow}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(selectedTicket.priority) }]} />
                <Text style={[styles.detailValue, { color: getPriorityColor(selectedTicket.priority) }]}>
                  {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('support.created', 'Created')}:</Text>
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
            <Text style={styles.headerTitle}>{t('support.title', 'Help & Support')}</Text>
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
                {t('support.createTicket', 'Create Ticket')}
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
                {t('support.myTickets', 'My Tickets')}
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
    paddingVertical: 18,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.lightBorder,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.primaryLight,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.darkText,
    letterSpacing: -0.5,
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.lightBorder,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: theme.primary,
    backgroundColor: theme.primaryLight + '30',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.mutedText,
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    padding: 24,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  formGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.darkText,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.white,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    fontWeight: '500',
  },
  textArea: {
    height: 140,
    textAlignVertical: 'top',
    paddingTop: 18,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.white,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedOption: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
    elevation: 3,
    shadowOpacity: 0.15,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  selectedOptionText: {
    color: theme.white,
    fontWeight: '700',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.white,
    gap: 12,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  
  // Enhanced Priority Button Styles
  sublabel: {
    fontSize: SupportScreenUtils.getResponsiveFontSizes().sm,
    color: theme.lightText,
    marginTop: 4,
    marginBottom: 12,
    fontWeight: '500',
    lineHeight: 20,
  },
  enhancedPriorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SupportScreenUtils.getResponsiveSpacing().md,
    marginTop: 8,
  },
  enhancedPriorityButton: {
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SupportScreenUtils.getResponsiveSpacing().md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...SupportScreenUtils.getPlatformShadow(2),
  },
  priorityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  enhancedPriorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedPriorityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    ...SupportScreenUtils.getPlatformShadow(3),
  },
  priorityTextContainer: {
    alignItems: 'center',
  },
  enhancedPriorityText: {
    fontSize: SupportScreenUtils.getResponsiveFontSizes().md,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  prioritySubtext: {
    fontSize: SupportScreenUtils.getResponsiveFontSizes().xs,
    color: theme.mutedText,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SupportScreenUtils.getPlatformShadow(3),
  },
  
  // Enhanced Category Button Styles
  enhancedCategoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 8,
  },
  enhancedCategoryButton: {
    backgroundColor: theme.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 65,
    ...SupportScreenUtils.getPlatformShadow(2),
  },
  selectedCategoryButton: {
    backgroundColor: theme.primary + '10',
    borderColor: theme.primary,
    borderWidth: 2,
    ...SupportScreenUtils.getPlatformShadow(4),
  },
  categoryIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  enhancedCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
    flex: 1,
  },
  selectedCategoryText: {
    color: theme.primary,
    fontWeight: '700',
  },
  categorySelectionIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  
  // Simple Priority Button Styles
  simplePriorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  simplePriorityButton: {
    flex: 1,
    backgroundColor: theme.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    minHeight: 60,
  },
  simplePriorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  simplePriorityText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.text,
    textAlign: 'center',
  },
  
  // Simple Category Button Styles  
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  categoryButton: {
    width: '48%',
    backgroundColor: theme.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    minHeight: 70,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.text,
    textAlign: 'center',
    marginTop: 6,
  },
  
  submitButton: {
    backgroundColor: theme.primary,
    paddingVertical: SupportScreenUtils.getResponsiveSpacing().lg,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: SupportScreenUtils.getResponsiveSpacing().lg,
    marginBottom: Platform.OS === 'android' ? 20 : 10, // Extra bottom margin for Android
    minHeight: SupportScreenUtils.getMinTouchTarget(),
    ...SupportScreenUtils.getPlatformShadow(4),
  },
  disabledButton: {
    opacity: 0.5,
    ...SupportScreenUtils.getPlatformShadow(1),
  },
  submitButtonText: {
    fontSize: SupportScreenUtils.getResponsiveFontSizes().lg,
    fontWeight: '700',
    color: theme.white,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.mutedText,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.darkText,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.lightText,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    fontWeight: '500',
  },
  createFirstButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: theme.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.white,
  },
  ticketCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.lightBorder,
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketSubject: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.darkText,
    flex: 1,
    marginRight: 16,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketCategory: {
    fontSize: 14,
    color: theme.primary,
    marginBottom: 10,
    fontWeight: '600',
    backgroundColor: theme.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  ticketDescription: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.lightBorder,
  },
  ticketDate: {
    fontSize: 13,
    color: theme.mutedText,
    fontWeight: '500',
  },
  priorityIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  // Ticket Details Styles
  ticketDetailsContent: {
    flex: 1,
    padding: 24,
  },
  detailsSection: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.lightBorder,
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.darkText,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.mutedText,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 24,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  descriptionBox: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.lightBorder,
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 16,
    color: theme.text,
    lineHeight: 26,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.white,
    marginBottom: 12,
    gap: 16,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  actionButtonText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '700',
  },
  cancelButton: {
    borderColor: theme.error + '40',
    backgroundColor: theme.error + '08',
  },
  // Messages Styles
  messageItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  userMessage: {
    backgroundColor: theme.background,
    borderColor: theme.border,
    marginLeft: 24,
    borderTopLeftRadius: 6,
  },
  adminMessage: {
    backgroundColor: theme.primaryLight + '40',
    borderColor: theme.primary + '30',
    marginRight: 24,
    borderTopRightRadius: 6,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  messageAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageAuthorText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.mutedText,
  },
  adminAuthorText: {
    color: theme.primary,
  },
  messageTime: {
    fontSize: 12,
    color: theme.mutedText,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 22,
    fontWeight: '500',
  },
  noMessagesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noMessagesText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.mutedText,
    marginTop: 16,
  },
  noMessagesSubtext: {
    fontSize: 15,
    color: theme.lightText,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    elevation: 8,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.lightBorder,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.darkText,
    letterSpacing: -0.3,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.darkText,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.background,
    minHeight: 120,
    textAlignVertical: 'top',
    fontWeight: '500',
    elevation: 1,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.mutedText,
  },
  modalSubmitButton: {
    backgroundColor: theme.primary,
    elevation: 4,
    shadowColor: theme.primary,
    shadowOpacity: 0.25,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.white,
  },
  modalDisabledButton: {
    backgroundColor: theme.border,
    opacity: 0.6,
    elevation: 1,
    shadowOpacity: 0.05,
  },
});

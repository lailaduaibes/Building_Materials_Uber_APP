/**
 * Working Customer Support Screen
 * Professional UI for customer support with Supabase ticket system integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../AuthServiceSupabase';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Updated black and white theme matching the app
const theme = {
  primary: '#000000',
  secondary: '#333333',
  accent: '#666666',
  background: '#FFFFFF',
  white: '#FFFFFF',
  text: '#000000',
  lightText: '#666666',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
};

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'general' | 'technical' | 'billing' | 'delivery' | 'complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface WorkingSupportScreenProps {
  onBack: () => void;
}

const WorkingSupportScreen: React.FC<WorkingSupportScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'tickets' | 'contact' | 'faq'>('create');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'general' | 'technical' | 'billing' | 'delivery' | 'complaint'>('general');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'open':
        return { backgroundColor: theme.success };
      case 'in_progress':
        return { backgroundColor: theme.warning };
      case 'resolved':
        return { backgroundColor: theme.lightText };
      case 'closed':
        return { backgroundColor: theme.error };
      default:
        return { backgroundColor: theme.lightText };
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadSupportTickets();
    }
  }, [activeTab]);

  const loadSupportTickets = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated with Supabase
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Authentication Required', 'Please login to view your support tickets');
        return;
      }

      console.log('Loading support tickets for user:', currentUser.id);

      // Query support tickets from Supabase
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          user_id,
          subject,
          description,
          category,
          priority,
          status,
          created_at,
          updated_at,
          support_messages(count)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading support tickets:', error);
        throw error;
      }

      // Transform the data to include message count
      const transformedTickets: SupportTicket[] = (tickets || []).map(ticket => ({
        ...ticket,
        message_count: ticket.support_messages?.[0]?.count || 0
      }));

      setTickets(transformedTickets);
      console.log('Support tickets loaded successfully:', transformedTickets.length, 'tickets');
      
    } catch (error) {
      console.error('Error loading support tickets:', error);
      Alert.alert('Error', 'Failed to load support tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    
    try {
      // Check if user is authenticated with Supabase
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Authentication Required', 'You must be logged in to submit a support ticket');
        return;
      }

      console.log('Submitting support ticket for user:', currentUser.id);

      // Insert new ticket into Supabase
      const { data: newTicket, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: currentUser.id,
          subject: subject.trim(),
          description: description.trim(),
          category,
          priority,
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating support ticket:', error);
        throw error;
      }

      console.log('Support ticket created successfully:', newTicket);

      // Clear form
      setSubject('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      
      // Switch to tickets tab and refresh to show the new ticket
      setActiveTab('tickets');
      await loadSupportTickets();
      
      Alert.alert('Success', 'Your support ticket has been submitted successfully. We will get back to you soon.');
      
    } catch (error) {
      console.error('Error creating support ticket:', error);
      Alert.alert('Error', 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:support@youmats.app');
  };

  const handleCallSupport = () => {
    Linking.openURL('tel:+1-800-YOUMATS');
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'create', label: 'Create Ticket', icon: 'add-circle-outline' },
        { key: 'tickets', label: 'My Tickets', icon: 'list-outline' },
        { key: 'contact', label: 'Contact', icon: 'call-outline' },
        { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            activeTab === tab.key && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Ionicons
            name={tab.icon as any}
            size={20}
            color={activeTab === tab.key ? theme.primary : theme.lightText}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.activeTabButtonText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCreateTicket = () => (
    <ScrollView style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Support Ticket</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief description of your issue"
            maxLength={100}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {['general', 'technical', 'billing', 'delivery', 'complaint'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.activeCategoryButton,
                  ]}
                  onPress={() => setCategory(cat as any)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat && styles.activeCategoryButtonText,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryContainer}>
              {['low', 'medium', 'high', 'urgent'].map((pri) => (
                <TouchableOpacity
                  key={pri}
                  style={[
                    styles.priorityButton,
                    priority === pri && styles.activePriorityButton,
                  ]}
                  onPress={() => setPriority(pri as any)}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === pri && styles.activePriorityButtonText,
                    ]}
                  >
                    {pri.charAt(0).toUpperCase() + pri.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Please provide detailed information about your issue"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={submitTicket}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTickets = () => (
    <View style={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Support Tickets</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={styles.loadingText}>Loading your tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color={theme.lightText} />
            <Text style={styles.emptyText}>No support tickets yet</Text>
            <Text style={styles.emptySubText}>Create your first ticket to get help</Text>
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketSubject}>{item.subject}</Text>
                  <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                    <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.ticketPriority}>
                    Priority: {item.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return renderCreateTicket();
      case 'tickets':
        return renderTickets();
      case 'contact':
        return (
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Support</Text>
              
              <TouchableOpacity style={styles.contactButton} onPress={handleEmailSupport}>
                <Ionicons name="mail" size={24} color={theme.secondary} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>Email Support</Text>
                  <Text style={styles.contactSubtitle}>support@youmats.app</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactButton} onPress={handleCallSupport}>
                <Ionicons name="call" size={24} color={theme.secondary} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>Call Support</Text>
                  <Text style={styles.contactSubtitle}>+1-800-BUILD-MATE</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      case 'faq':
        return (
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              
              {[
                {
                  question: 'How do I track my order?',
                  answer: 'You can track your order in the "Track Order" section of the app using your order ID.',
                },
                {
                  question: 'What are your delivery hours?',
                  answer: 'We deliver Monday to Friday from 8 AM to 6 PM, and Saturday from 9 AM to 4 PM.',
                },
                {
                  question: 'How do I cancel an order?',
                  answer: 'Orders can be cancelled within 1 hour of placement. Contact support for assistance.',
                },
              ].map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with professional styling */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Support</Text>
        <View style={styles.placeholder} />
      </View>

      {renderTabBar()}
      {renderContent()}
    </SafeAreaView>
  );
};

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
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  placeholder: {
    width: 36,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },
  tabButtonText: {
    fontSize: 12,
    color: theme.lightText,
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabButtonText: {
    color: theme.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: theme.white,
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.white,
    color: theme.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: theme.white,
    minHeight: 120,
    color: theme.text,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  activeCategoryButton: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: theme.lightText,
  },
  activeCategoryButtonText: {
    color: theme.white,
    fontWeight: '600',
  },
  priorityButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  activePriorityButton: {
    backgroundColor: theme.secondary,
    borderColor: theme.secondary,
  },
  priorityButtonText: {
    fontSize: 14,
    color: theme.lightText,
  },
  activePriorityButtonText: {
    color: theme.white,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: theme.lightText,
  },
  submitButtonText: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.lightText,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.lightText,
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 5,
  },
  ticketCard: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: theme.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: theme.white,
    fontSize: 10,
    fontWeight: '600',
  },
  ticketDescription: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 10,
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
  ticketPriority: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: theme.background,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  contactSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 2,
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.lightText,
    lineHeight: 20,
  },
});

export default WorkingSupportScreen;

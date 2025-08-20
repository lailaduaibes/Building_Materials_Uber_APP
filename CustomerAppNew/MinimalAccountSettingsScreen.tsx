/**
 * MinimalAccountSettingsScreen - Testing core functionality without problematic imports
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from './AuthServiceSupabase';
import PaymentService, { PaymentMethod } from './services/PaymentService';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface MinimalAccountSettingsScreenProps {
  onBack: () => void;
}

export const MinimalAccountSettingsScreen = ({
  onBack,
}: MinimalAccountSettingsScreenProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    loadUserProfile();
    loadPaymentMethods();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      const currentUser = await authService.getCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const userData = {
        id: currentUser.id,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email,
        phone: currentUser.phone || '',
        role: currentUser.role || 'customer',
        isActive: true,
        emailVerified: currentUser.emailConfirmed || false,
        createdAt: currentUser.createdAt || new Date().toISOString()
      };

      setUser(userData);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const methods = await PaymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>
                  {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <View style={styles.verificationBadge}>
                  <MaterialIcons 
                    name={user?.emailVerified ? 'verified' : 'warning'} 
                    size={16} 
                    color={user?.emailVerified ? '#22c55e' : '#f59e0b'} 
                  />
                  <Text style={[
                    styles.verificationText,
                    { color: user?.emailVerified ? '#22c55e' : '#f59e0b' }
                  ]}>
                    {user?.emailVerified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          
          <View style={styles.paymentSection}>
            {paymentMethods.length === 0 ? (
              <View style={styles.noPaymentMethods}>
                <MaterialIcons name="payment" size={48} color="#ccc" />
                <Text style={styles.noPaymentMethodsText}>No payment methods added</Text>
                <Text style={styles.noPaymentMethodsSubtext}>
                  Add a payment method to make orders faster
                </Text>
              </View>
            ) : (
              paymentMethods.map((method) => (
                <View key={method.id} style={styles.paymentMethodCard}>
                  <View style={styles.paymentMethodInfo}>
                    <MaterialIcons 
                      name={method.type === 'card' ? 'credit-card' : 'account-balance-wallet'} 
                      size={24} 
                      color="#000" 
                    />
                    <View style={styles.paymentMethodDetails}>
                      <Text style={styles.paymentMethodType}>
                        {method.type === 'card' ? 'Credit Card' : 'PayPal'}
                      </Text>
                      {method.last4 && (
                        <Text style={styles.paymentMethodNumber}>
                          •••• •••• •••• {method.last4}
                        </Text>
                      )}
                      {method.email && (
                        <Text style={styles.paymentMethodEmail}>{method.email}</Text>
                      )}
                    </View>
                  </View>
                  
                  {method.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
              ))
            )}

            <TouchableOpacity 
              style={styles.addPaymentButton}
              onPress={() => Alert.alert('Add Payment', 'Payment functionality available - child screens removed to avoid errors')}
            >
              <MaterialIcons name="add" size={24} color="#000" />
              <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Password Reset', 'Password reset functionality available - child screens removed to avoid errors')}
          >
            <MaterialIcons name="lock" size={24} color="#000" />
            <Text style={styles.actionButtonText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: () => authService.signOut() }
            ])}
          >
            <MaterialIcons name="logout" size={24} color="#dc2626" />
            <Text style={[styles.actionButtonText, { color: '#dc2626' }]}>Logout</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  paymentSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
  },
  noPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPaymentMethodsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  noPaymentMethodsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  paymentMethodNumber: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodEmail: {
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addPaymentButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default MinimalAccountSettingsScreen;

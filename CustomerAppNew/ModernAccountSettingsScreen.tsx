/**
 * ModernAccountSettingsScreen - Updated with real payment integration
 * Handles user profile, notifications, password reset, and payment management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './AuthServiceSupabase';
import PasswordResetScreen from './PasswordResetScreen';
import PaymentService, { PaymentMethod } from './services/PaymentService';
import AddPaymentMethodScreen from './AddPaymentMethodScreen';

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

interface AccountSettingsScreenProps {
  onBack: () => void;
}

export const ModernAccountSettingsScreen = ({
  onBack,
}: AccountSettingsScreenProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  // Settings state
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  // Payment methods state - now using real data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoadingPayments(true);
      const methods = await PaymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

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
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      });
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      
      const updatedUser = {
        ...user!,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
      };
      
      setUser(updatedUser);
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = () => {
    setShowPasswordReset(true);
  };

  const handleAddPaymentMethod = () => {
    setShowAddPayment(true);
  };

  const handlePaymentAdded = () => {
    loadPaymentMethods(); // Refresh payment methods list
  };

  const handleRemovePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await PaymentService.removePaymentMethod(methodId);
              if (response.success) {
                Alert.alert('Success', 'Payment method removed');
                loadPaymentMethods(); // Refresh list
              } else {
                Alert.alert('Error', response.message || 'Failed to remove payment method');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove payment method');
            }
          }
        },
      ]
    );
  };

  const handleSetDefaultPayment = async (methodId: string) => {
    try {
      const response = await PaymentService.setDefaultPaymentMethod(methodId);
      if (response.success) {
        Alert.alert('Success', 'Default payment method updated');
        loadPaymentMethods(); // Refresh list
      } else {
        Alert.alert('Error', response.message || 'Failed to set default payment method');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set default payment method');
    }
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion feature will be available soon');
          }
        },
      ]
    );
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    return (
      <View key={method.id} style={styles.paymentMethod}>
        <View style={styles.paymentMethodInfo}>
          <View style={styles.paymentMethodIcon}>
            <MaterialIcons 
              name={
                method.type === 'card' ? 'credit-card' :
                method.type === 'paypal' ? 'account-balance-wallet' :
                method.type === 'apple_pay' ? 'phone-iphone' :
                'payment'
              } 
              size={24} 
              color="#000" 
            />
          </View>
          <View style={styles.paymentMethodDetails}>
            <Text style={styles.paymentMethodTitle}>
              {method.type === 'card' ? `${method.brand} ****${method.last4}` :
               method.type === 'paypal' ? `PayPal - ${method.email}` :
               method.type === 'apple_pay' ? 'Apple Pay' :
               'Google Pay'
              }
            </Text>
            {method.type === 'card' && (
              <Text style={styles.paymentMethodSubtitle}>
                Expires {method.expiryMonth}/{method.expiryYear}
              </Text>
            )}
            {method.isDefault && (
              <Text style={styles.defaultBadge}>Default</Text>
            )}
          </View>
        </View>
        <View style={styles.paymentMethodActions}>
          {!method.isDefault && (
            <TouchableOpacity 
              style={styles.setDefaultButton}
              onPress={() => handleSetDefaultPayment(method.id)}
            >
              <Text style={styles.setDefaultButtonText}>Set Default</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => handleRemovePaymentMethod(method.id)}
          >
            <MaterialIcons name="delete" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Show password reset screen
  if (showPasswordReset) {
    return (
      <PasswordResetScreen
        mode="change"
        userEmail={user?.email}
        onBack={() => setShowPasswordReset(false)}
      />
    );
  }

  // Show add payment method screen
  if (showAddPayment) {
    return (
      <AddPaymentMethodScreen
        onBack={() => setShowAddPayment(false)}
        onPaymentAdded={handlePaymentAdded}
      />
    );
  }

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

            {editMode ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.firstName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                    placeholder="Enter first name"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.lastName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                    placeholder="Enter last name"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setEditMode(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                    onPress={updateProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.editProfileButton} 
                onPress={() => setEditMode(true)}
              >
                <MaterialIcons name="edit" size={20} color="#000" />
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Order Updates</Text>
                <Text style={styles.settingDescription}>Get notified about order status</Text>
              </View>
              <Switch 
                value={notifications.orderUpdates}
                onValueChange={(value) => 
                  setNotifications(prev => ({ ...prev, orderUpdates: value }))
                }
                trackColor={{ false: '#e5e5e5', true: '#000' }}
                thumbColor={notifications.orderUpdates ? '#fff' : '#fff'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Promotions</Text>
                <Text style={styles.settingDescription}>Receive promotional offers</Text>
              </View>
              <Switch 
                value={notifications.promotions}
                onValueChange={(value) => 
                  setNotifications(prev => ({ ...prev, promotions: value }))
                }
                trackColor={{ false: '#e5e5e5', true: '#000' }}
                thumbColor={notifications.promotions ? '#fff' : '#fff'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Newsletter</Text>
                <Text style={styles.settingDescription}>Weekly building materials newsletter</Text>
              </View>
              <Switch 
                value={notifications.newsletter}
                onValueChange={(value) => 
                  setNotifications(prev => ({ ...prev, newsletter: value }))
                }
                trackColor={{ false: '#e5e5e5', true: '#000' }}
                thumbColor={notifications.newsletter ? '#fff' : '#fff'}
              />
            </View>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={handleAddPaymentMethod}
            >
              <MaterialIcons name="add" size={20} color="#000" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentCard}>
            {loadingPayments ? (
              <View style={styles.loadingPayments}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.loadingPaymentsText}>Loading payment methods...</Text>
              </View>
            ) : paymentMethods.length > 0 ? (
              paymentMethods.map(renderPaymentMethod)
            ) : (
              <View style={styles.noPaymentMethods}>
                <MaterialIcons name="credit-card" size={48} color="#ccc" />
                <Text style={styles.noPaymentMethodsTitle}>No Payment Methods</Text>
                <Text style={styles.noPaymentMethodsSubtitle}>
                  Add a payment method to make purchases
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePasswordReset}>
              <View style={styles.actionButtonContent}>
                <MaterialIcons name="lock" size={24} color="#000" />
                <Text style={styles.actionButtonText}>Change Password</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.dangerButton]} 
              onPress={deleteAccount}
            >
              <View style={styles.actionButtonContent}>
                <MaterialIcons name="delete-forever" size={24} color="#ff4444" />
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  Delete Account
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  profileCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  editProfileButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  paymentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingPayments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingPaymentsText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  noPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noPaymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  noPaymentMethodsSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentMethodInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#000',
    borderRadius: 6,
  },
  setDefaultButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  removeButton: {
    padding: 6,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff4444',
    marginBottom: 12,
  },
  dangerButton: {
    borderBottomColor: '#ffe6e6',
  },
  dangerButtonText: {
    color: '#ff4444',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default ModernAccountSettingsScreen;

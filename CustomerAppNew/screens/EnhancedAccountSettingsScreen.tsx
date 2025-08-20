/**
 * Enhanced Account Settings Screen
 * Modern black/white UI for managing user account settings, password, and payment methods
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
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { authService } from '../AuthServiceSupabase';
import PasswordResetScreen from '../PasswordResetScreen';
import paymentService, { PaymentMethod } from '../services/PaymentService';
import userPreferencesService, { NotificationPreferences } from '../services/UserPreferencesService';
import notificationManager from '../services/NotificationManager';
import AddPaymentMethodScreen from '../AddPaymentMethodScreen';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
  onLogout?: () => void;
}

const EnhancedAccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({
  onBack,
  onLogout,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  
  // Settings state - now using proper preferences service
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    orderUpdates: true,
    promotions: false,
    newsletter: false,
    pushNotifications: true,
  });

  // Payment methods state - now using real data
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Using Supabase directly - no API URL needed

  useEffect(() => {
    loadUserProfile();
    loadPaymentMethods();
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const user = await authService.getCurrentUser();
      const prefs = await userPreferencesService.getNotificationPreferences(user?.id);
      setNotifications(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const saveNotificationPreferences = async (newNotifications: NotificationPreferences) => {
    try {
      setSavingNotifications(true);
      const user = await authService.getCurrentUser();
      await userPreferencesService.updateNotificationPreferences(newNotifications, user?.id);
      setNotifications(newNotifications);
      
      // Show success message
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Error', 'Failed to save notification preferences');
    } finally {
      setSavingNotifications(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setLoadingPayments(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      await paymentService.removePaymentMethod(methodId);
      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
      Alert.alert('Success', 'Payment method removed');
    } catch (error) {
      console.error('Error deleting payment method:', error);
      Alert.alert('Error', 'Failed to remove payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      await paymentService.setDefaultPaymentMethod(methodId);
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          isDefault: method.id === methodId
        }))
      );
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleAddPaymentMethodSuccess = () => {
    setShowAddPayment(false);
    loadPaymentMethods(); // Reload payment methods
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Use Supabase auth service to get current user (CORRECT ARCHITECTURE)
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
      
      // For now, just update local state since Supabase profile updates 
      // would require additional setup
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

  const changePassword = () => {
    setShowPasswordReset(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            } else {
              // Fallback logout if no onLogout prop provided
              authService.logout().then(() => {
                onBack();
              }).catch((error) => {
                console.error('Error during logout:', error);
                Alert.alert('Error', 'Failed to logout. Please try again.');
              });
            }
          },
        },
      ]
    );
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

  // Component render
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B365D" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Settings</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editMode ? updateProfile() : setEditMode(true)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#1B365D" />
          ) : (
            <Text style={styles.editButtonText}>
              {editMode ? 'Save' : 'Edit'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.firstName}
              onChangeText={(text) => setFormData({...formData, firstName: text})}
              editable={editMode}
              placeholder="Enter first name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.lastName}
              onChangeText={(text) => setFormData({...formData, lastName: text})}
              editable={editMode}
              placeholder="Enter last name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email || ''}
              editable={false}
              placeholder="Email address"
              placeholderTextColor="#999"
            />
            <Text style={styles.inputNote}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, !editMode && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              editable={editMode}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Account Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account Type</Text>
            <Text style={styles.statusValue}>{user?.role || 'Customer'}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Email Verified</Text>
            <Text style={[styles.statusValue, user?.emailVerified ? styles.verified : styles.unverified]}>
              {user?.emailVerified ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Member Since</Text>
            <Text style={styles.statusValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddPayment(true)}
            >
              <MaterialIcons name="add" size={20} color="#FF6B35" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {loadingPayments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading payment methods...</Text>
            </View>
          ) : paymentMethods.length === 0 ? (
            <View style={styles.emptyPaymentMethods}>
              <MaterialIcons name="credit-card" size={48} color="#999" />
              <Text style={styles.emptyPaymentMethodsText}>No payment methods added</Text>
              <Text style={styles.emptyPaymentMethodsSubtext}>Add a payment method to make purchases easier</Text>
            </View>
          ) : (
            paymentMethods.map((method) => (
              <View key={method.id} style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <MaterialIcons 
                    name={method.type === 'card' ? 'credit-card' : 
                          method.type === 'paypal' ? 'account-balance-wallet' : 'payment'} 
                    size={24} 
                    color="#333" 
                  />
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodTitle}>
                      {method.type === 'card' 
                        ? `${method.brand} •••• ${method.last4}`
                        : method.type === 'paypal' 
                        ? `PayPal (${method.email})`
                        : `${method.type.replace('_', ' ').toUpperCase()}`
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
                      onPress={() => handleSetDefaultPaymentMethod(method.id)}
                    >
                      <Text style={styles.setDefaultButtonText}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.deletePaymentButton}
                    onPress={() => handleDeletePaymentMethod(method.id)}
                  >
                    <MaterialIcons name="delete" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          
          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Order Updates</Text>
              <Text style={styles.notificationSubtitle}>Get notified about order status changes</Text>
            </View>
            <Switch
              value={notifications.orderUpdates}
              onValueChange={(value) => {
                const newNotifications = {...notifications, orderUpdates: value};
                saveNotificationPreferences(newNotifications);
              }}
              trackColor={{false: '#767577', true: '#FF6B35'}}
              thumbColor={notifications.orderUpdates ? '#fff' : '#f4f3f4'}
              disabled={savingNotifications}
            />
          </View>

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Promotions</Text>
              <Text style={styles.notificationSubtitle}>Receive promotional offers and discounts</Text>
            </View>
            <Switch
              value={notifications.promotions}
              onValueChange={(value) => {
                const newNotifications = {...notifications, promotions: value};
                saveNotificationPreferences(newNotifications);
              }}
              trackColor={{false: '#767577', true: '#FF6B35'}}
              thumbColor={notifications.promotions ? '#fff' : '#f4f3f4'}
              disabled={savingNotifications}
            />
          </View>

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Newsletter</Text>
              <Text style={styles.notificationSubtitle}>Monthly newsletter with industry updates</Text>
            </View>
            <Switch
              value={notifications.newsletter}
              onValueChange={(value) => {
                const newNotifications = {...notifications, newsletter: value};
                saveNotificationPreferences(newNotifications);
              }}
              trackColor={{false: '#767577', true: '#FF6B35'}}
              thumbColor={notifications.newsletter ? '#fff' : '#f4f3f4'}
              disabled={savingNotifications}
            />
          </View>

          <View style={styles.notificationRow}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>Push Notifications</Text>
              <Text style={styles.notificationSubtitle}>Enable all push notifications on this device</Text>
            </View>
            <Switch
              value={notifications.pushNotifications}
              onValueChange={(value) => {
                const newNotifications = {...notifications, pushNotifications: value};
                saveNotificationPreferences(newNotifications);
              }}
              trackColor={{false: '#767577', true: '#FF6B35'}}
              thumbColor={notifications.pushNotifications ? '#fff' : '#f4f3f4'}
              disabled={savingNotifications}
            />
          </View>
        </View>

        {/* Security Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={changePassword}>
            <Text style={styles.actionButtonText}>Change Password</Text>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <MaterialIcons name="logout" size={20} color="#FF6B35" />
              <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
            </View>
            <Text style={[styles.actionArrow, styles.logoutButtonText]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={deleteAccount}>
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Delete Account</Text>
            <Text style={[styles.actionArrow, styles.dangerButtonText]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Modal Screens */}
      <Modal
        visible={showPasswordReset}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PasswordResetScreen 
          onBack={() => setShowPasswordReset(false)}
          mode="change"
          userEmail={user?.email}
        />
      </Modal>
      
      <Modal
        visible={showAddPayment}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <AddPaymentMethodScreen 
          onBack={() => setShowAddPayment(false)}
          onPaymentAdded={handleAddPaymentMethodSuccess}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: responsive.spacing(16, 20),
    fontSize: responsive.fontSize(16, 18),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: responsive.spacing(60, 70),
    paddingBottom: responsive.spacing(20, 25),
    paddingHorizontal: responsive.padding(20, 40),
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  backButton: {
    width: responsive.spacing(36, 44),
    height: responsive.spacing(36, 44),
    borderRadius: responsive.spacing(18, 22),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: deviceTypes.isAndroid ? 44 : 36,
    minWidth: deviceTypes.isAndroid ? 44 : 36,
  },
  backButtonText: {
    color: '#000000',
    fontSize: responsive.fontSize(18, 20),
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize(20, 24),
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.padding(16, 20),
    paddingVertical: responsive.padding(8, 12),
    borderRadius: responsive.spacing(20, 24),
    minWidth: responsive.spacing(60, 80),
    alignItems: 'center',
    minHeight: deviceTypes.isAndroid ? 44 : 36,
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#000000',
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: responsive.padding(20, 40),
    backgroundColor: '#000000',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  section: {
    backgroundColor: '#111111',
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(20, 30),
    marginTop: responsive.spacing(20, 25),
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: responsive.spacing(16, 20),
  },
  dangerTitle: {
    color: '#DC3545',
  },
  inputGroup: {
    marginBottom: responsive.spacing(16, 20),
  },
  inputLabel: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: responsive.spacing(8, 10),
  },
  input: {
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: responsive.spacing(8, 10),
    padding: responsive.padding(12, 16),
    fontSize: responsive.fontSize(16, 18),
    backgroundColor: '#222222',
    color: '#FFFFFF',
    minHeight: deviceTypes.isAndroid ? 48 : 40,
  },
  inputDisabled: {
    backgroundColor: '#1A1A1A',
    color: '#888888',
    borderColor: '#333333',
  },
  inputNote: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  statusLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  verified: {
    color: '#28A745',
    fontWeight: '600',
  },
  unverified: {
    color: '#DC3545',
    fontWeight: '600',
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#222222',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444444',
  },
  dangerButton: {
    backgroundColor: '#2A1515',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButtonText: {
    color: '#FF4444',
  },
  actionArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
  // Payment Method Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  emptyPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPaymentMethodsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyPaymentMethodsSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  paymentMethodCard: {
    backgroundColor: '#222222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444444',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodDetails: {
    marginLeft: 12,
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  setDefaultButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 6,
    marginRight: 8,
  },
  setDefaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  deletePaymentButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  // Logout Button Styles
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FF6B35',
    marginLeft: 8,
  },
});

export default EnhancedAccountSettingsScreen;

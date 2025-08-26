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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { authService } from '../AuthServiceSupabase';
import PasswordResetScreen from '../PasswordResetScreen';
import paymentService, { PaymentMethod } from '../services/PaymentService';
import userPreferencesService, { NotificationPreferences } from '../services/UserPreferencesService';
import notificationManager from '../services/NotificationManager';
import AddPaymentMethodScreen from '../AddPaymentMethodScreen';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import { Theme } from '../theme';

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
  profilePhoto?: string; // Add profile photo URL
}

interface AccountSettingsScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
}

const EnhancedAccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({
  onBack,
  onLogout,
  onNavigate,
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
  
  // Profile photo state
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
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
    loadProfilePhoto(); // Load saved profile photo
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
        createdAt: currentUser.createdAt || new Date().toISOString(),
        profilePhoto: (currentUser as any).profilePhoto || null, // Add profile photo support
      };

      setUser(userData);
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      });

      // Load profile photo if available
      setProfilePhoto(userData.profilePhoto || null);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Load profile photo from AsyncStorage
  const loadProfilePhoto = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user?.id) {
        const savedPhoto = await AsyncStorage.getItem(`profile_photo_${user.id}`);
        if (savedPhoto) {
          setProfilePhoto(savedPhoto);
        }
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  const updateProfile = async () => {
    try {
      setSaving(true);
      
      // Update profile in Supabase database
      const response = await authService.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to update profile');
      }

      // Update local state after successful database update
      const updatedUser = {
        ...user!,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
      };
      
      setUser(updatedUser);
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully in database');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Profile photo functions
  const handleSelectPhoto = () => {
    Alert.alert(
      'Select Profile Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePicture },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library permission is needed to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    try {
      setUploadingPhoto(true);
      
      // Read the image file
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Save the photo URI to AsyncStorage for persistence
      const user = await authService.getCurrentUser();
      if (user?.id) {
        await AsyncStorage.setItem(`profile_photo_${user.id}`, imageUri);
      }

      // Update local state
      setProfilePhoto(imageUri);
      
      Alert.alert('Success', 'Profile photo updated successfully');
      
      // TODO: In production, upload to Supabase Storage for cloud backup
      // const { data, error } = await supabase.storage
      //   .from('profile-photos')
      //   .upload(`${user?.id}/profile.jpg`, {
      //     uri: imageUri,
      //     type: 'image/jpeg',
      //     name: 'profile.jpg'
      //   });
      
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeProfilePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from AsyncStorage
              const user = await authService.getCurrentUser();
              if (user?.id) {
                await AsyncStorage.removeItem(`profile_photo_${user.id}`);
              }
              
              // Update local state
              setProfilePhoto(null);
              Alert.alert('Success', 'Profile photo removed');
            } catch (error) {
              console.error('Error removing profile photo:', error);
              Alert.alert('Error', 'Failed to remove profile photo');
            }
          },
        },
      ]
    );
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
        <ActivityIndicator size="large" color={Theme.colors.primary} />
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
            <ActivityIndicator size="small" color={Theme.colors.primary} />
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
          
          {/* Profile Photo Section */}
          <View style={styles.profilePhotoSection}>
            <TouchableOpacity style={styles.profilePhotoContainer} onPress={handleSelectPhoto}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <MaterialIcons name="person" size={60} color="#999" />
                </View>
              )}
              {uploadingPhoto && (
                <View style={styles.photoUploadOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <View style={styles.profilePhotoEditIcon}>
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <View style={styles.profilePhotoActions}>
              <TouchableOpacity style={styles.photoActionButton} onPress={handleSelectPhoto}>
                <Text style={styles.photoActionText}>Change Photo</Text>
              </TouchableOpacity>
              {profilePhoto && (
                <TouchableOpacity style={styles.photoActionButton} onPress={removeProfilePhoto}>
                  <Text style={[styles.photoActionText, styles.removePhotoText]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
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
              <MaterialIcons name="add" size={20} color={Theme.colors.secondary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {loadingPayments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Theme.colors.secondary} />
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
          
          {/* Payment History Button */}
          <TouchableOpacity 
            style={styles.paymentHistoryButton}
            onPress={() => {
              if (onNavigate) {
                onNavigate('paymentHistory');
              } else {
                Alert.alert('Payment History', 'Payment history screen would open here. This shows all past payment transactions and receipts.');
              }
            }}
          >
            <MaterialIcons name="history" size={24} color={Theme.colors.secondary} />
            <Text style={styles.paymentHistoryText}>View Payment History</Text>
            <MaterialIcons name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
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
              trackColor={{false: '#767577', true: Theme.colors.secondary}}
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
              trackColor={{false: '#767577', true: Theme.colors.secondary}}
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
              trackColor={{false: '#767577', true: Theme.colors.secondary}}
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
              trackColor={{false: '#767577', true: Theme.colors.secondary}}
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
              <MaterialIcons name="logout" size={20} color={Theme.colors.secondary} />
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: responsive.spacing(16, 20),
    fontSize: responsive.fontSize(16, 18),
    color: Theme.colors.primary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: responsive.spacing(60, 70),
    paddingBottom: responsive.spacing(20, 25),
    paddingHorizontal: responsive.padding(20, 40),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  backButton: {
    width: responsive.spacing(36, 44),
    height: responsive.spacing(36, 44),
    borderRadius: responsive.spacing(18, 22),
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: deviceTypes.isAndroid ? 44 : 36,
    minWidth: deviceTypes.isAndroid ? 44 : 36,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize(18, 20),
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Theme.colors.primary,
    fontSize: responsive.fontSize(20, 24),
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: responsive.padding(16, 20),
    paddingVertical: responsive.padding(8, 12),
    borderRadius: responsive.spacing(20, 24),
    minWidth: responsive.spacing(60, 80),
    alignItems: 'center',
    minHeight: deviceTypes.isAndroid ? 44 : 36,
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: responsive.padding(20, 40),
    backgroundColor: '#FFFFFF',
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(20, 30),
    marginTop: responsive.spacing(20, 25),
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: responsive.fontSize(18, 22),
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginBottom: responsive.spacing(16, 20),
  },
  dangerTitle: {
    color: '#FF4444',
  },
  inputGroup: {
    marginBottom: responsive.spacing(16, 20),
  },
  inputLabel: {
    fontSize: responsive.fontSize(14, 16),
    fontWeight: '600',
    color: Theme.colors.text.secondary,
    marginBottom: responsive.spacing(8, 10),
  },
  input: {
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: responsive.spacing(8, 10),
    padding: responsive.padding(12, 16),
    fontSize: responsive.fontSize(16, 18),
    backgroundColor: '#FFFFFF',
    color: Theme.colors.text.primary,
    minHeight: deviceTypes.isAndroid ? 48 : 40,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: Theme.colors.text.secondary,
    borderColor: Theme.colors.border.light,
  },
  inputNote: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  statusLabel: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    color: Theme.colors.text.primary,
  },
  verified: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  unverified: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  notificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  dangerButtonText: {
    color: '#FF4444',
  },
  actionArrow: {
    fontSize: 18,
    color: Theme.colors.text.secondary,
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
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  emptyPaymentMethods: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPaymentMethodsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyPaymentMethodsSubtext: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
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
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: Theme.colors.primary,
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
    borderColor: Theme.colors.border.light,
    borderRadius: 6,
    marginRight: 8,
  },
  setDefaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  deletePaymentButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  paymentHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  paymentHistoryText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },

  // Profile Photo Styles
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  profilePhotoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  profilePhotoEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoUploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.primary,
  },
  removePhotoText: {
    color: '#ef4444',
  },

  // Logout Button Styles
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
});

export default EnhancedAccountSettingsScreen;

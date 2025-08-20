import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import VehicleManagementScreen from './VehicleManagementScreen';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Theme colors - matching our black & white theme
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
  cardBackground: '#F8F8F8',
};

interface DriverProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
  rating: number;
  totalTrips: number;
  yearsActive: number;
  totalEarnings: number;
  specializations: string[];
  yearsExperience: number;
  maxDistance: number;
  preferredTruckTypes: string[];
  status: string;
  isAvailable: boolean;
  vehicleInfo?: {
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string;
    color?: string;
  };
}

export default function DriverProfileScreen({ onBack, onLogout }: DriverProfileScreenProps) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVehicleManagement, setShowVehicleManagement] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
  });

  useEffect(() => {
    loadDriverProfile();
  }, []);

  const loadDriverProfile = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading driver profile...');
      
      // Get current driver from service
      const currentDriver = driverService.getCurrentDriver();
      if (!currentDriver) {
        console.error('No current driver found');
        return;
      }

      // Get trip statistics
      const tripStats = await driverService.getDriverStats();
      
      // Calculate years active from account creation
      const accountCreated = new Date(currentDriver.created_at || new Date());
      const yearsActive = Math.max(1, new Date().getFullYear() - accountCreated.getFullYear());

      const profile: DriverProfile = {
        id: currentDriver.id,
        name: currentDriver.fullName || `${currentDriver.firstName} ${currentDriver.lastName}`.trim() || 'Driver',
        email: currentDriver.email,
        phone: currentDriver.phone || 'Not provided',
        profileImage: undefined, // Add profile image URL when available
        rating: currentDriver.rating || 0,
        totalTrips: currentDriver.total_trips || 0,
        totalEarnings: currentDriver.total_earnings || 0,
        yearsActive: yearsActive,
        yearsExperience: currentDriver.years_experience || 0,
        specializations: currentDriver.specializations || [],
        maxDistance: currentDriver.max_distance_km || 50,
        preferredTruckTypes: currentDriver.preferred_truck_types || [],
        status: currentDriver.status || 'offline',
        isAvailable: currentDriver.is_available || false,
        vehicleInfo: undefined, // Will be populated when vehicle data is available
      };

      setDriverProfile(profile);
      console.log('✅ Driver profile loaded:', profile.name);
    } catch (error) {
      console.error('❌ Error loading driver profile:', error);
      // Set a fallback profile so the screen doesn't crash
      setDriverProfile({
        id: 'unknown',
        name: 'Driver',
        email: 'Not available',
        phone: 'Not available',
        rating: 0,
        totalTrips: 0,
        totalEarnings: 0,
        yearsActive: 1,
        yearsExperience: 0,
        specializations: [],
        maxDistance: 50,
        preferredTruckTypes: [],
        status: 'offline',
        isAvailable: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProfileHeader = () => {
    if (!driverProfile) return null;
    
    return (
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {driverProfile.profileImage ? (
            <Image source={{ uri: driverProfile.profileImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={50} color={theme.white} />
            </View>
          )}
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={() => Alert.alert('Photo', 'Update profile photo')}
          >
            <Ionicons name="camera" size={16} color={theme.white} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.driverName}>{driverProfile.name}</Text>
          <Text style={styles.driverEmail}>{driverProfile.email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.statValue}>{driverProfile.rating.toFixed(1)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="car" size={16} color={theme.primary} />
              <Text style={styles.statValue}>{driverProfile.totalTrips}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color={theme.primary} />
              <Text style={styles.statValue}>{driverProfile.yearsActive}y</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderVehicleInfo = () => {
    if (!driverProfile) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <TouchableOpacity onPress={() => setShowVehicleManagement(true)}>
            <View style={styles.manageVehiclesButton}>
              <Ionicons name="car" size={18} color={theme.primary} />
              <Text style={styles.manageVehiclesText}>Manage</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.vehicleCard}>
          {driverProfile.vehicleInfo ? (
            <>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>Make & Model:</Text>
                <Text style={styles.vehicleValue}>
                  {driverProfile.vehicleInfo.make} {driverProfile.vehicleInfo.model} ({driverProfile.vehicleInfo.year})
                </Text>
              </View>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>License Plate:</Text>
                <Text style={styles.vehicleValue}>{driverProfile.vehicleInfo.licensePlate}</Text>
              </View>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>Color:</Text>
                <Text style={styles.vehicleValue}>{driverProfile.vehicleInfo.color}</Text>
              </View>
            </>
          ) : (
            <View style={styles.vehicleRow}>
              <Text style={styles.vehicleLabel}>No vehicle information available</Text>
              <TouchableOpacity onPress={() => setShowVehicleManagement(true)}>
                <Text style={[styles.vehicleValue, { color: theme.accent }]}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSpecializations = () => {
    if (!driverProfile?.specializations) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Specializations</Text>
          <TouchableOpacity onPress={() => Alert.alert('Edit Skills', 'Manage your specializations')}>
            <Ionicons name="add" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.specializationsContainer}>
          {driverProfile.specializations.map((spec, index) => (
            <View key={index} style={styles.specializationTag}>
              <Text style={styles.specializationText}>{spec}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      {Object.entries(settings).map(([key, value]) => (
        <View key={key} style={styles.settingItem}>
          <Text style={styles.settingLabel}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </Text>
          <Switch
            value={value}
            onValueChange={(newValue) => setSettings(prev => ({ ...prev, [key]: newValue }))}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.white}
          />
        </View>
      ))}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => Alert.alert('Support', 'Contact YouMats support')}
      >
        <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
        <Text style={styles.actionButtonText}>Help & Support</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => Alert.alert('Privacy', 'View privacy policy')}
      >
        <Ionicons name="shield-outline" size={24} color={theme.primary} />
        <Text style={styles.actionButtonText}>Privacy Policy</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.logoutButton]}
        onPress={() => {
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: onLogout },
            ]
          );
        }}
      >
        <Ionicons name="log-out-outline" size={24} color={theme.error} />
        <Text style={[styles.actionButtonText, { color: theme.error }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {showVehicleManagement ? (
        <VehicleManagementScreen onBack={() => setShowVehicleManagement(false)} />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={() => Alert.alert('Edit Profile', 'Edit profile information')}>
              <Ionicons name="pencil" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : !driverProfile ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Profile not available</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={loadDriverProfile}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {renderProfileHeader()}
              {renderVehicleInfo()}
              {renderSpecializations()}
              {renderSettings()}
              {renderActionButtons()}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.white,
  },
  profileInfo: {
    alignItems: 'center',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  driverEmail: {
    fontSize: 16,
    color: theme.lightText,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 4,
  },
  section: {
    backgroundColor: theme.white,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  vehicleCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vehicleLabel: {
    fontSize: 14,
    color: theme.lightText,
  },
  vehicleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specializationTag: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  specializationText: {
    color: theme.white,
    fontSize: 12,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.text,
  },
  actionButtons: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: theme.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: theme.lightText,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '500',
  },
  manageVehiclesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  manageVehiclesText: {
    fontSize: 14,
    color: theme.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
});

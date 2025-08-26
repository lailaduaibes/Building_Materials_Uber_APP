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
import SpecializationsManagementScreen from './SpecializationsManagementScreen';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

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
    model?: string;
    year?: number;
    licensePlate?: string;
  };
}

export default function DriverProfileScreen({ onBack, onLogout }: DriverProfileScreenProps) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverTrucks, setDriverTrucks] = useState<any[]>([]); // NEW: Store actual truck data
  const [loading, setLoading] = useState(true);
  const [showVehicleManagement, setShowVehicleManagement] = useState(false);
  const [showSpecializationsManagement, setShowSpecializationsManagement] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
  });

  useEffect(() => {
    loadDriverProfile();
  }, []);

  // NEW: Load trucks when driver profile is available
  useEffect(() => {
    if (driverProfile) {
      console.log('🔄 [PROFILE DEBUG] Driver profile available, loading trucks...');
      loadDriverTrucks();
    }
  }, [driverProfile]);

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

      // Debug: Log the actual driver data to see what we're working with
      console.log('🔍 Current driver data from service:', {
        id: currentDriver.id,
        firstName: currentDriver.firstName,
        lastName: currentDriver.lastName,
        phone: currentDriver.phone,
        years_experience: currentDriver.years_experience,
        vehicle_model: currentDriver.vehicle_model,
        vehicle_year: currentDriver.vehicle_year,
        vehicle_plate: currentDriver.vehicle_plate,
        specializations: currentDriver.specializations,
        preferred_truck_types: currentDriver.preferred_truck_types,
        rating: currentDriver.rating,
        total_trips: currentDriver.total_trips,
        total_earnings: currentDriver.total_earnings
      });

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
        vehicleInfo: {
          model: currentDriver.vehicle_model || 'Not specified',
          year: currentDriver.vehicle_year || 2020,
          licensePlate: currentDriver.vehicle_plate || 'TBD'
        },
      };

      setDriverProfile(profile);
      // Also reload truck data
      await loadDriverTrucks();
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

  // NEW: Load driver's actual trucks from the fleet
  const loadDriverTrucks = async () => {
    try {
      console.log('🚛 [PROFILE DEBUG] Loading driver trucks from fleet...');
      
      // Check if we have a driver profile
      if (!driverProfile?.id) {
        console.log('❌ [PROFILE DEBUG] No driver profile available');
        setDriverTrucks([]);
        return;
      }
      
      console.log('🔍 [PROFILE DEBUG] Using driver profile id:', driverProfile.id);
      
      // Get detailed truck information from the fleet
      console.log('🔍 [PROFILE DEBUG] Calling driverService.getDriverTruckDetails()...');
      const truckDetails = await driverService.getDriverTruckDetails();
      console.log('✅ [PROFILE DEBUG] Driver truck details returned:', truckDetails);
      
      if (truckDetails.length === 0) {
        console.log('⚠️ [PROFILE DEBUG] No trucks found for driver:', driverProfile.id);
      }
      
      setDriverTrucks(truckDetails);
    } catch (error) {
      console.error('❌ [PROFILE DEBUG] Error loading driver trucks:', error);
      setDriverTrucks([]);
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
        
        {/* Driver Profile Vehicle Info */}
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleSubtitle}>Registration Details</Text>
          {driverProfile.vehicleInfo ? (
            <>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>Model:</Text>
                <Text style={styles.vehicleValue}>
                  {driverProfile.vehicleInfo.model} ({driverProfile.vehicleInfo.year})
                </Text>
              </View>
              <View style={styles.vehicleRow}>
                <Text style={styles.vehicleLabel}>License Plate:</Text>
                <Text style={styles.vehicleValue}>{driverProfile.vehicleInfo.licensePlate}</Text>
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

        {/* NEW: Actual Fleet Trucks */}
        <View style={styles.vehicleCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.vehicleSubtitle}>Fleet Assignment</Text>
            {driverTrucks && driverTrucks.length > 0 && driverTrucks[0]?.source === 'driver_profile' && (
              <View style={styles.profileSourceBadge}>
                <Text style={styles.profileSourceText}>From Registration</Text>
              </View>
            )}
          </View>
          {driverTrucks && driverTrucks.length > 0 ? (
            driverTrucks.map((truck, index) => (
              <View key={truck.id || index} style={styles.truckCard}>
                <View style={styles.truckHeader}>
                  <Ionicons 
                    name={truck.source === 'driver_profile' ? "clipboard-outline" : "car-sport"} 
                    size={20} 
                    color={theme.primary} 
                  />
                  <Text style={styles.truckTitle}>
                    {(truck.truck_types as any)?.name || truck.model || 'Unknown Type'}
                  </Text>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: truck.is_available ? theme.success : theme.warning 
                  }]}>
                    <Text style={styles.statusText}>
                      {truck.source === 'driver_profile' 
                        ? (truck.truck_added_to_fleet ? 'Pending Fleet' : 'Registered') 
                        : (truck.is_available ? 'Available' : 'In Use')
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.truckDetails}>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleLabel}>Vehicle:</Text>
                    <Text style={styles.vehicleValue}>
                      {truck.make} {truck.model} {truck.year && `(${truck.year})`}
                    </Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleLabel}>License Plate:</Text>
                    <Text style={styles.vehicleValue}>{truck.license_plate}</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleLabel}>Max Payload:</Text>
                    <Text style={styles.vehicleValue}>{truck.max_payload} tons</Text>
                  </View>
                  <View style={styles.vehicleRow}>
                    <Text style={styles.vehicleLabel}>Max Volume:</Text>
                    <Text style={styles.vehicleValue}>{truck.max_volume} m³</Text>
                  </View>
                  {(truck.truck_types as any)?.description && (
                    <View style={styles.vehicleRow}>
                      <Text style={styles.vehicleLabel}>Description:</Text>
                      <Text style={styles.vehicleValue}>{(truck.truck_types as any).description}</Text>
                    </View>
                  )}
                  {truck.source === 'driver_profile' && (
                    <View style={styles.profileNoteContainer}>
                      <Ionicons name="information-circle" size={16} color={theme.primary} />
                      <Text style={styles.profileNoteText}>
                        {truck.truck_added_to_fleet 
                          ? "Vehicle pending fleet assignment by admin"
                          : "Contact admin to add this vehicle to fleet"
                        }
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noTrucksContainer}>
              <Ionicons name="car-outline" size={40} color={theme.lightText} />
              <Text style={styles.noTrucksText}>No vehicles found</Text>
              <Text style={styles.noTrucksSubtext}>
                Complete your registration to add vehicle information
              </Text>
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
          <TouchableOpacity onPress={() => setShowSpecializationsManagement(true)}>
            <Ionicons name="pencil" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.specializationsContainer}>
          {driverProfile.specializations.length > 0 ? (
            driverProfile.specializations.map((spec, index) => (
              <View key={index} style={styles.specializationTag}>
                <Text style={styles.specializationText}>
                  {spec.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            ))
          ) : (
            <TouchableOpacity 
              style={styles.addSpecializationButton}
              onPress={() => setShowSpecializationsManagement(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.lightText} />
              <Text style={styles.addSpecializationText}>Add your specializations</Text>
            </TouchableOpacity>
          )}
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
      ) : showSpecializationsManagement ? (
        <SpecializationsManagementScreen 
          onBack={() => setShowSpecializationsManagement(false)}
          currentSpecializations={driverProfile?.specializations || []}
          currentTruckTypes={driverProfile?.preferredTruckTypes || []}
          onUpdate={loadDriverProfile}
        />
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
  addSpecializationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: theme.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: theme.cardBackground,
  },
  addSpecializationText: {
    fontSize: 14,
    color: theme.lightText,
    marginLeft: 8,
    fontStyle: 'italic',
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
  // NEW: Truck display styles
  vehicleSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  truckCard: {
    backgroundColor: theme.white,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  truckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  truckTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 8,
    flex: 1,
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
  truckDetails: {
    padding: 12,
  },
  noTrucksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noTrucksText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.lightText,
    marginTop: 12,
    textAlign: 'center',
  },
  noTrucksSubtext: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 4,
    textAlign: 'center',
  },
  profileSourceBadge: {
    backgroundColor: theme.secondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  profileSourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.white,
  },
  profileNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  profileNoteText: {
    fontSize: 12,
    color: theme.primary,
    marginLeft: 6,
    flex: 1,
  },
});

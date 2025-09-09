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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';
import VehicleManagementScreen from './VehicleManagementScreen';
import VehicleDocumentsScreen from './VehicleDocumentsScreen';
import SpecializationsManagementScreen from './SpecializationsManagementScreen';
import SupportScreen from './SupportScreen';
import { createClient } from '@supabase/supabase-js';

// Import language components
import { useLanguage } from '../src/contexts/LanguageContext';
import LanguageSelector from '../src/components/LanguageSelector';

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

// Professional Blue Theme - matching chat and modern UI
const theme = {
  primary: '#3B82F6',      // Professional blue
  secondary: '#FFFFFF',     // Clean white
  accent: '#1E40AF',       // Darker blue for emphasis
  background: '#F8FAFC',   // Very light blue-gray
  white: '#FFFFFF',
  text: '#1F2937',         // Dark gray for text
  lightText: '#6B7280',    // Medium gray for secondary text
  success: '#10B981',      // Modern green
  warning: '#F59E0B',      // Warm amber
  error: '#EF4444',        // Modern red
  border: '#E5E7EB',       // Light border
  cardBackground: '#FFFFFF', // White cards with shadows
  shadow: '#000000',       // For shadow effects
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
  // Additional registration fields
  licenseNumber?: string;
  licenseExpiry?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  birthDate?: string;
  vehicleInfo?: {
    model?: string;
    year?: number;
    licensePlate?: string;
  };
}

export default function DriverProfileScreen({ onBack, onLogout }: DriverProfileScreenProps) {
  // Language support
  const { t, isRTL, currentLanguageInfo } = useLanguage();
  const { t: i18nT } = useTranslation();
  
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverTrucks, setDriverTrucks] = useState<any[]>([]); // NEW: Store actual truck data
  const [loading, setLoading] = useState(true);
  const [showVehicleManagement, setShowVehicleManagement] = useState(false);
  const [showVehicleDocuments, setShowVehicleDocuments] = useState<any>(null);
  const [showSpecializationsManagement, setShowSpecializationsManagement] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now()); // Force image re-render
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
      
      // First refresh driver profile from database to get latest data
      await driverService.refreshDriverProfile();
      
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
        phoneType: typeof currentDriver.phone,
        phoneLength: currentDriver.phone ? currentDriver.phone.length : 0,
        email: currentDriver.email,
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

      console.log('🖼️ Profile Image Debug:', {
        profile_image_url: currentDriver.profile_image_url,
        profileImage: currentDriver.profile_image_url || undefined,
        hasProfileImage: !!currentDriver.profile_image_url
      });

      const profile: DriverProfile = {
        id: currentDriver.id,
        name: currentDriver.fullName || `${currentDriver.firstName} ${currentDriver.lastName}`.trim() || 'Driver',
        email: currentDriver.email,
        phone: currentDriver.phone || 'Not provided',
        profileImage: currentDriver.profile_image_url || undefined, // Profile image from registration
        rating: tripStats?.allTime?.averageRating || 0, // Use real rating from customer feedback
        totalTrips: currentDriver.total_trips || 0,
        totalEarnings: currentDriver.total_earnings || 0,
        yearsActive: yearsActive,
        yearsExperience: currentDriver.years_experience || 0,
        specializations: currentDriver.specializations || [],
        maxDistance: currentDriver.max_distance_km || 50,
        preferredTruckTypes: currentDriver.preferred_truck_types || [],
        status: currentDriver.status || 'offline',
        isAvailable: currentDriver.is_available || false,
        // Additional fields - using available data or placeholders
        licenseNumber: 'Not provided', // Will be added when available in driver registration
        licenseExpiry: 'Not provided',
        address: 'Not provided',
        emergencyContact: 'Not provided',
        emergencyContactPhone: 'Not provided',
        birthDate: 'Not provided',
        vehicleInfo: {
          model: currentDriver.vehicle_model || 'Not specified',
          year: currentDriver.vehicle_year || 2020,
          licensePlate: currentDriver.vehicle_plate || 'TBD'
        },
      };

      setDriverProfile(profile);
      // Force image refresh when profile is updated
      setImageRefreshKey(Date.now());
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
            <>
              {console.log('📸 Displaying profile image:', driverProfile.profileImage, 'with refresh key:', imageRefreshKey)}
              <Image 
                key={imageRefreshKey} // Force re-render when key changes
                source={{ 
                  uri: `${driverProfile.profileImage}?t=${imageRefreshKey}` // Use refresh key for cache-busting
                }} 
                style={styles.profileImage}
                onError={(error) => {
                  console.error('❌ Image load error:', error.nativeEvent.error);
                  console.error('❌ Failed URL:', `${driverProfile.profileImage}?t=${imageRefreshKey}`);
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', `${driverProfile.profileImage}?t=${imageRefreshKey}`);
                }}
              />
            </>
          ) : (
            <>
              {console.log('👤 No profile image, showing placeholder')}
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={50} color={theme.white} />
              </View>
            </>
          )}
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={() => Alert.alert(
              t('profile.photoTitle'),
              t('profile.photoCannotUpdate'),
              [{ text: t('common.ok') }]
            )}
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
              <Text style={styles.statValue}>{driverTrucks.length}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color={theme.primary} />
              <Text style={styles.statValue}>{driverProfile.yearsExperience}y</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderPersonalInfo = () => {
    if (!driverProfile) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
          <TouchableOpacity onPress={() => Alert.alert(t('profile.edit'), t('profile.contact_support_to_update'))}>
            <Ionicons name="pencil" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleRow}>
            <Ionicons name="person-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.vehicleLabel}>{t('profile.fullName')}</Text>
              <Text style={styles.vehicleValue}>{driverProfile.name}</Text>
            </View>
          </View>
          
          <View style={styles.vehicleRow}>
            <Ionicons name="mail-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.vehicleLabel}>{t('profile.email')}</Text>
              <Text style={styles.vehicleValue}>{driverProfile.email}</Text>
            </View>
          </View>
          
          <View style={styles.vehicleRow}>
            <Ionicons name="call-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.vehicleLabel}>{t('profile.phone')}</Text>
              <Text style={styles.vehicleValue}>{driverProfile.phone}</Text>
            </View>
          </View>
          
          <View style={styles.vehicleRow}>
            <Ionicons name="time-outline" size={20} color={theme.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.vehicleLabel}>{t('profile.yearsExperience')}</Text>
              <Text style={styles.vehicleValue}>{driverProfile.yearsExperience} years</Text>
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
          <Text style={styles.sectionTitle}>{t('profile.vehicleInfo')}</Text>
          {/* Removed Manage button - functionality simplified */}
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
              <Text style={styles.vehicleValue}>Contact admin to add vehicle</Text>
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
                      {(() => {
                        // Avoid duplicate make/model (e.g., "Toyota Toyota")
                        const make = truck.make || '';
                        const model = truck.model || '';
                        
                        if (make && model) {
                          // If model already contains make, just show model
                          if (model.toLowerCase().includes(make.toLowerCase())) {
                            return `${model} ${truck.year ? `(${truck.year})` : ''}`.trim();
                          }
                          // Otherwise show make + model
                          return `${make} ${model} ${truck.year ? `(${truck.year})` : ''}`.trim();
                        }
                        
                        // Fallback to whatever is available
                        return `${make || model || 'Unknown'} ${truck.year ? `(${truck.year})` : ''}`.trim();
                      })()}
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
                      <Text 
                        style={styles.vehicleValue} 
                        numberOfLines={3}
                        ellipsizeMode="tail"
                      >
                        {(truck.truck_types as any).description}
                      </Text>
                    </View>
                  )}
                  {truck.source === 'driver_profile' && (
                    <View style={styles.profileNoteContainer}>
                      <Ionicons name="information-circle" size={16} color={theme.primary} />
                      <Text style={styles.profileNoteText}>
                        {truck.truck_added_to_fleet 
                          ? t('profile.vehicle_pending_assignment')
                          : t('profile.contact_admin_add_vehicle')
                        }
                      </Text>
                    </View>
                  )}
                  
                  {/* Vehicle Documents Button */}
                  <TouchableOpacity 
                    style={styles.vehicleDocumentsButton}
                    onPress={() => setShowVehicleDocuments(truck)}
                  >
                    <Ionicons name="document-text" size={16} color={theme.primary} />
                    <Text style={styles.vehicleDocumentsText}>View Documents</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.lightText} />
                  </TouchableOpacity>
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
              
              {/* Documents access for drivers without vehicles */}
              <TouchableOpacity 
                style={styles.vehicleDocumentsButton}
                onPress={() => setShowVehicleDocuments({ id: 'general', license_plate: 'N/A' })}
              >
                <Ionicons name="document-text" size={16} color={theme.primary} />
                <Text style={styles.vehicleDocumentsText}>Upload Documents</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.lightText} />
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
          <Text style={styles.sectionTitle}>{t('profile.specializations')}</Text>
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
      <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
      
      {/* Language Selector */}
      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>{t('profile.language')}</Text>
        <View style={styles.languageSelectorContainer}>
          <LanguageSelector 
            key={currentLanguageInfo.code} // Force re-render when language changes
            style={styles.languageSelector}
            buttonStyle={styles.languageSelectorButton}
            textStyle={styles.languageSelectorText}
            showFlag={true}
            showNativeName={true}
          />
        </View>
      </View>
      
      {/* Removed notification and location sharing settings as requested */}
      {/* These settings are not needed for driver app */}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => setShowSupport(true)}
      >
        <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
        <Text style={styles.actionButtonText}>{t('profile.help_support')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => Alert.alert(t('profile.privacy'), t('profile.view_privacy_policy'))}
      >
        <Ionicons name="shield-outline" size={24} color={theme.primary} />
        <Text style={styles.actionButtonText}>{t('profile.privacy_policy')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.actionButton, styles.logoutButton]}
        onPress={() => {
          Alert.alert(
            t('profile.logout'),
            t('profile.are_you_sure_logout'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('profile.logout'), style: 'destructive', onPress: onLogout },
            ]
          );
        }}
      >
        <Ionicons name="log-out-outline" size={24} color={theme.error} />
        <Text style={[styles.actionButtonText, { color: theme.error }]}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {showVehicleManagement ? (
        <VehicleManagementScreen onBack={() => setShowVehicleManagement(false)} />
      ) : showVehicleDocuments ? (
        <VehicleDocumentsScreen 
          vehicle={showVehicleDocuments} 
          onBack={() => setShowVehicleDocuments(null)} 
        />
      ) : showSpecializationsManagement ? (
        <SpecializationsManagementScreen 
          onBack={() => setShowSpecializationsManagement(false)}
          currentSpecializations={driverProfile?.specializations || []}
          onUpdate={loadDriverProfile}
        />
      ) : showSupport ? (
        <SupportScreen 
          onBack={() => setShowSupport(false)} 
        />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity 
              onPress={async () => {
                try {
                  console.log('🔄 Manual profile refresh triggered');
                  // Force image to re-render by updating refresh key
                  setImageRefreshKey(Date.now());
                  await loadDriverProfile();
                  Alert.alert(t('profile.profile_refreshed'), t('profile.profile_updated_latest'));
                } catch (error) {
                  console.error('❌ Error refreshing profile:', error);
                  Alert.alert(t('profile.refresh_failed'), t('profile.failed_to_refresh_try_again'));
                }
              }}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={24} color={theme.primary} />
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
              {renderPersonalInfo()}
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
  refreshButton: {
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
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top for better text wrapping
    marginBottom: 8,
    flexWrap: 'wrap', // Allow row to wrap if needed
  },
  vehicleLabel: {
    fontSize: 14,
    color: theme.lightText,
    minWidth: 100, // Fixed minimum width for consistent layout
    marginRight: 12, // Space between label and value
  },
  vehicleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
    flex: 1, // Allow text to take available space
    textAlign: 'right', // Align text to the right
    flexWrap: 'wrap', // Allow text wrapping
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
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  languageSelectorContainer: {
    flex: 1,
    marginLeft: 16,
  },
  languageSelector: {
    // Additional styling if needed
  },
  languageSelectorButton: {
    backgroundColor: theme.cardBackground,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  languageSelectorText: {
    fontSize: 14,
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
    backgroundColor: theme.background,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
  },
  profileNoteText: {
    fontSize: 12,
    color: theme.primary,
    marginLeft: 6,
    flex: 1,
    flexWrap: 'wrap', // Allow text wrapping
    lineHeight: 16, // Better line spacing for wrapped text
  },
  vehicleDocumentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  vehicleDocumentsText: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

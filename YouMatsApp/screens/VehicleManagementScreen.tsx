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
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';
import { responsive } from '../utils/ResponsiveUtils';

const { width } = Dimensions.get('window');

// Theme colors
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

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  truck_type: string;
  is_available: boolean;
  is_active: boolean;
  verification_status?: string;
  insurance_expiry_date?: string;
  registration_expiry_date?: string;
}

interface VehicleManagementScreenProps {
  onBack: () => void;
}

export default function VehicleManagementScreen({ onBack }: VehicleManagementScreenProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      console.log('🚛 Loading driver vehicles...');
      
      // Get current driver's vehicles
      const driverVehicles = await driverService.getDriverVehicles();
      
      if (driverVehicles) {
        setVehicles(driverVehicles);
        console.log('✅ Loaded vehicles:', driverVehicles.length);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      Alert.alert('Error', 'Failed to load vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleRegisterNewVehicle = () => {
    Alert.alert(
      'Register New Vehicle',
      'Vehicle registration feature coming soon! Contact admin to register your vehicle.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleVehicleDetails = (vehicle: Vehicle) => {
    Alert.alert(
      'Vehicle Details',
      `License: ${vehicle.license_plate}\n` +
      `Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.year})\n` +
      `Type: ${vehicle.truck_type}\n` +
      `Status: ${vehicle.is_available ? 'Available' : 'Not Available'}\n` +
      `Verification: ${vehicle.verification_status || 'Not verified'}`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme.success;
      case 'in_use': return theme.primary;
      case 'pending': return theme.warning;
      case 'rejected': return theme.error;
      default: return theme.accent;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'in_use': return 'car';
      case 'pending': return 'time-outline';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Available';
      case 'in_use': return 'In Use';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  };

  const renderVehicleCard = (vehicle: Vehicle) => (
    <TouchableOpacity
      key={vehicle.id}
      style={styles.vehicleCard}
      onPress={() => handleVehicleDetails(vehicle)}
    >
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleMainInfo}>
          <Text style={styles.vehiclePlate}>{vehicle.license_plate}</Text>
          <Text style={styles.vehicleModel}>
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </Text>
          <Text style={styles.vehicleType}>{vehicle.truck_type}</Text>
        </View>
        
        <View style={styles.vehicleStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.verification_status || 'pending') }]}>
            <Ionicons 
              name={getStatusIcon(vehicle.verification_status || 'pending')} 
              size={16} 
              color={theme.white} 
            />
            <Text style={styles.statusText}>
              {getStatusLabel(vehicle.verification_status || 'pending')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="car" size={16} color={theme.accent} />
          <Text style={styles.detailText}>Color: {vehicle.color}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons 
            name={vehicle.is_available ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={vehicle.is_available ? theme.success : theme.error} 
          />
          <Text style={styles.detailText}>
            {vehicle.is_available ? 'Available for trips' : 'Not available'}
          </Text>
        </View>
      </View>

      <View style={styles.vehicleActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="document-text" size={16} color={theme.primary} />
          <Text style={styles.actionText}>Documents</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="settings" size={16} color={theme.primary} />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity onPress={handleRegisterNewVehicle} style={styles.addButton}>
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : vehicles.length > 0 ? (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{vehicles.length}</Text>
                <Text style={styles.statLabel}>Registered Vehicles</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {vehicles.filter(v => v.is_available).length}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {vehicles.filter(v => v.verification_status === 'approved').length}
                </Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>

            <View style={styles.vehiclesSection}>
              <Text style={styles.sectionTitle}>Your Vehicles</Text>
              {vehicles.map(renderVehicleCard)}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car" size={64} color={theme.accent} />
            <Text style={styles.emptyTitle}>No Vehicles Registered</Text>
            <Text style={styles.emptyText}>
              Register your first vehicle to start accepting delivery requests
            </Text>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegisterNewVehicle}
            >
              <Ionicons name="add" size={20} color={theme.white} />
              <Text style={styles.registerButtonText}>Register Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: responsive.padding(20),
    paddingVertical: responsive.padding(15),
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: responsive.padding(8),
  },
  headerTitle: {
    fontSize: responsive.fontSize(20),
    fontWeight: 'bold',
    color: theme.text,
  },
  addButton: {
    padding: responsive.padding(8),
  },
  content: {
    flex: 1,
    padding: responsive.padding(20),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsive.padding(50),
  },
  loadingText: {
    fontSize: responsive.fontSize(16),
    color: theme.lightText,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: responsive.spacing(25),
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.cardBackground,
    padding: responsive.padding(15),
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: responsive.spacing(5),
  },
  statNumber: {
    fontSize: responsive.fontSize(24),
    fontWeight: 'bold',
    color: theme.primary,
  },
  statLabel: {
    fontSize: responsive.fontSize(12),
    color: theme.lightText,
    marginTop: responsive.spacing(5),
  },
  vehiclesSection: {
    marginBottom: responsive.spacing(20),
  },
  sectionTitle: {
    fontSize: responsive.fontSize(18),
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: responsive.spacing(15),
  },
  vehicleCard: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: responsive.padding(15),
    marginBottom: responsive.spacing(15),
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing(12),
  },
  vehicleMainInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: responsive.fontSize(18),
    fontWeight: 'bold',
    color: theme.primary,
  },
  vehicleModel: {
    fontSize: responsive.fontSize(16),
    color: theme.text,
    marginTop: responsive.spacing(2),
  },
  vehicleType: {
    fontSize: responsive.fontSize(14),
    color: theme.lightText,
    marginTop: responsive.spacing(2),
  },
  vehicleStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: responsive.padding(8),
    paddingVertical: responsive.padding(4),
    borderRadius: 12,
  },
  statusText: {
    fontSize: responsive.fontSize(12),
    color: theme.white,
    marginLeft: responsive.spacing(4),
    textTransform: 'capitalize',
  },
  vehicleDetails: {
    marginBottom: responsive.spacing(12),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing(5),
  },
  detailText: {
    fontSize: responsive.fontSize(14),
    color: theme.text,
    marginLeft: responsive.spacing(8),
  },
  vehicleActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: responsive.spacing(12),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: responsive.padding(8),
    paddingHorizontal: responsive.padding(12),
  },
  actionText: {
    fontSize: responsive.fontSize(14),
    color: theme.primary,
    marginLeft: responsive.spacing(4),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsive.padding(60),
  },
  emptyTitle: {
    fontSize: responsive.fontSize(20),
    fontWeight: 'bold',
    color: theme.text,
    marginTop: responsive.spacing(20),
  },
  emptyText: {
    fontSize: responsive.fontSize(16),
    color: theme.lightText,
    textAlign: 'center',
    marginTop: responsive.spacing(10),
    paddingHorizontal: responsive.padding(40),
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: responsive.padding(20),
    paddingVertical: responsive.padding(12),
    borderRadius: 8,
    marginTop: responsive.spacing(20),
  },
  registerButtonText: {
    fontSize: responsive.fontSize(16),
    color: theme.white,
    marginLeft: responsive.spacing(8),
    fontWeight: '600',
  },
});

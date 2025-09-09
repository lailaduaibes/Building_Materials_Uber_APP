import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Professional Blue Theme
const theme = {
  primary: '#3B82F6',
  secondary: '#FFFFFF',
  accent: '#1E40AF',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  lightText: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E5E7EB',
  cardBackground: '#FFFFFF',
  shadow: '#000000',
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
}

interface VehicleSettings {
  isAvailable: boolean;
  autoAcceptTrips: boolean;
  maxTripDistance: number;
  workingHours: {
    start: string;
    end: string;
    enabled: boolean;
  };
  notifications: {
    newTrips: boolean;
    tripUpdates: boolean;
    maintenance: boolean;
  };
  preferences: {
    preferredTripTypes: string[];
    avoidTollRoads: boolean;
    fuelEfficiencyMode: boolean;
  };
}

interface VehicleSettingsScreenProps {
  vehicle: Vehicle;
  onBack: () => void;
  onVehicleUpdate?: (vehicle: Vehicle) => void;
}

export default function VehicleSettingsScreen({ vehicle, onBack, onVehicleUpdate }: VehicleSettingsScreenProps) {
  const { t: i18nT } = useTranslation();
  const [settings, setSettings] = useState<VehicleSettings>({
    isAvailable: vehicle.is_available,
    autoAcceptTrips: false,
    maxTripDistance: 50,
    workingHours: {
      start: '08:00',
      end: '18:00',
      enabled: true,
    },
    notifications: {
      newTrips: true,
      tripUpdates: true,
      maintenance: true,
    },
    preferences: {
      preferredTripTypes: ['local_delivery', 'construction'],
      avoidTollRoads: false,
      fuelEfficiencyMode: true,
    },
  });
  
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; value: any } | null>(null);

  const handleSettingChange = (category: keyof VehicleSettings, field: string, value: any) => {
    if (category === 'isAvailable' || category === 'autoAcceptTrips' || category === 'maxTripDistance') {
      setSettings(prev => ({
        ...prev,
        [category]: value,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [category]: {
          ...(prev[category] as any),
          [field]: value,
        },
      }));
    }
  };

  const handleAvailabilityToggle = (value: boolean) => {
    if (!value && settings.isAvailable) {
      // Going offline - show confirmation
      setPendingAction({ action: 'availability', value });
      setShowConfirmDialog(true);
    } else {
      handleSettingChange('isAvailable', '', value);
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      if (pendingAction.action === 'availability') {
        handleSettingChange('isAvailable', '', pendingAction.value);
      }
      setPendingAction(null);
    }
    setShowConfirmDialog(false);
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const saveFieldEdit = () => {
    if (editingField) {
      const [category, field] = editingField.split('.');
      if (field) {
        handleSettingChange(category as keyof VehicleSettings, field, tempValue);
      } else {
        handleSettingChange(category as keyof VehicleSettings, '', parseInt(tempValue) || 0);
      }
    }
    setEditingField(null);
    setTempValue('');
  };

  const handleRemoveVehicle = () => {
    Alert.alert(
      i18nT('vehicle.remove_vehicle'),
      i18nT('vehicle.remove_confirmation', { licensePlate: vehicle.license_plate }),
      [
        {
          text: i18nT('common.cancel'),
          style: 'cancel',
        },
        {
          text: i18nT('common.remove'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(i18nT('vehicle.vehicle_removed'), i18nT('vehicle.removal_pending'));
            onBack();
          },
        },
      ]
    );
  };

  const saveSettings = () => {
    Alert.alert(
      i18nT('vehicle.settings_saved'),
      i18nT('vehicle.settings_updated'),
      [{ text: i18nT('common.ok'), onPress: () => onBack() }]
    );
  };

  const renderSettingRow = (
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    icon: string
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={theme.white}
      />
    </View>
  );

  const renderEditableField = (
    title: string,
    value: string,
    field: string,
    icon: string,
    suffix?: string
  ) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={() => handleEditField(field, value)}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={24} color={theme.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingValue}>{value}{suffix}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.lightText} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Vehicle Settings</Text>
          <Text style={styles.headerSubtitle}>{vehicle.license_plate}</Text>
        </View>
        <TouchableOpacity onPress={saveSettings} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Vehicle Info */}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </Text>
          <Text style={styles.vehiclePlate}>{vehicle.license_plate}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: settings.isAvailable ? theme.success : theme.error 
          }]}>
            <Text style={styles.statusText}>
              {settings.isAvailable ? 'Available' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Availability Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          {renderSettingRow(
            'Vehicle Available',
            'Accept new trip requests for this vehicle',
            settings.isAvailable,
            handleAvailabilityToggle,
            'car'
          )}
          {renderSettingRow(
            'Auto Accept Trips',
            'Automatically accept compatible trip requests',
            settings.autoAcceptTrips,
            (value) => handleSettingChange('autoAcceptTrips', '', value),
            'flash'
          )}
        </View>

        {/* Trip Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Preferences</Text>
          {renderEditableField(
            'Maximum Trip Distance',
            settings.maxTripDistance.toString(),
            'maxTripDistance',
            'location',
            ' km'
          )}
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          {renderSettingRow(
            'Enable Working Hours',
            'Only accept trips during specified hours',
            settings.workingHours.enabled,
            (value) => handleSettingChange('workingHours', 'enabled', value),
            'time'
          )}
          {settings.workingHours.enabled && (
            <>
              {renderEditableField(
                'Start Time',
                settings.workingHours.start,
                'workingHours.start',
                'sunrise'
              )}
              {renderEditableField(
                'End Time',
                settings.workingHours.end,
                'workingHours.end',
                'sunset'
              )}
            </>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSettingRow(
            'New Trip Alerts',
            'Get notified when new trips are available',
            settings.notifications.newTrips,
            (value) => handleSettingChange('notifications', 'newTrips', value),
            'notifications'
          )}
          {renderSettingRow(
            'Trip Updates',
            'Receive updates about ongoing trips',
            settings.notifications.tripUpdates,
            (value) => handleSettingChange('notifications', 'tripUpdates', value),
            'chatbubble'
          )}
          {renderSettingRow(
            'Maintenance Reminders',
            'Get reminders for vehicle maintenance',
            settings.notifications.maintenance,
            (value) => handleSettingChange('notifications', 'maintenance', value),
            'construct'
          )}
        </View>

        {/* Vehicle Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Preferences</Text>
          {renderSettingRow(
            'Avoid Toll Roads',
            'Prefer routes without toll roads',
            settings.preferences.avoidTollRoads,
            (value) => handleSettingChange('preferences', 'avoidTollRoads', value),
            'ban'
          )}
          {renderSettingRow(
            'Fuel Efficiency Mode',
            'Optimize routes for better fuel economy',
            settings.preferences.fuelEfficiencyMode,
            (value) => handleSettingChange('preferences', 'fuelEfficiencyMode', value),
            'leaf'
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.error }]}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleRemoveVehicle}>
            <Ionicons name="trash" size={20} color={theme.error} />
            <Text style={styles.dangerButtonText}>Remove Vehicle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Field Modal */}
      <Modal
        visible={editingField !== null}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Value</Text>
            <TextInput
              style={styles.modalInput}
              value={tempValue}
              onChangeText={setTempValue}
              autoFocus={true}
              selectTextOnFocus={true}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditingField(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={saveFieldEdit}
              >
                <Text style={styles.saveModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog */}
      <Modal
        visible={showConfirmDialog}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Go Offline?</Text>
            <Text style={styles.modalMessage}>
              You will stop receiving new trip requests. Any ongoing trips will continue normally.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmAction}
              >
                <Text style={styles.confirmButtonText}>Go Offline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: theme.white,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.lightText,
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  vehicleInfo: {
    backgroundColor: theme.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  vehiclePlate: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '500',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: theme.white,
    fontWeight: '500',
  },
  section: {
    backgroundColor: theme.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.lightText,
  },
  settingValue: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.error,
    borderRadius: 12,
    backgroundColor: theme.white,
  },
  dangerButtonText: {
    fontSize: 16,
    color: theme.error,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: theme.lightText,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.background,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.lightText,
    fontWeight: '500',
  },
  saveModalButton: {
    backgroundColor: theme.primary,
  },
  saveModalButtonText: {
    fontSize: 16,
    color: theme.white,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: theme.error,
  },
  confirmButtonText: {
    fontSize: 16,
    color: theme.white,
    fontWeight: '500',
  },
});

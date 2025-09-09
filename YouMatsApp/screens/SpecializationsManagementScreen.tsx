/**
 * SpecializationsManagementScreen - Manage driver specializations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { driverService } from '../services/DriverService';

const { width: screenWidth } = Dimensions.get('window');

// Professional Blue Theme - matching other screens
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

// Available specializations for drivers
const AVAILABLE_SPECIALIZATIONS = [
  { id: 'heavy_machinery', label: 'Heavy Machinery', icon: '🏗️' },
  { id: 'hazardous_materials', label: 'Hazardous Materials', icon: '⚠️' },
  { id: 'oversized_loads', label: 'Oversized Loads', icon: '📏' },
  { id: 'crane_operations', label: 'Crane Operations', icon: '🏗️' },
  { id: 'steel_transport', label: 'Steel Transport', icon: '⚙️' },
  { id: 'concrete_delivery', label: 'Concrete Delivery', icon: '🏗️' },
  { id: 'lumber_transport', label: 'Lumber Transport', icon: '🪵' },
  { id: 'equipment_hauling', label: 'Equipment Hauling', icon: '🚛' },
  { id: 'hardware_transport', label: 'Hardware & Tools', icon: '🔧' },
  { id: 'night_delivery', label: 'Night Delivery', icon: '🌙' },
  { id: 'long_distance', label: 'Long Distance', icon: '🛣️' },
  { id: 'express_delivery', label: 'Express Delivery', icon: '⚡' },
  { id: 'fragile_items', label: 'Fragile Items', icon: '📦' },
];

interface SpecializationsManagementScreenProps {
  onBack: () => void;
  currentSpecializations: string[];
  onUpdate: () => void;
}

export default function SpecializationsManagementScreen({
  onBack,
  currentSpecializations,
  onUpdate,
}: SpecializationsManagementScreenProps) {
  const { t: i18nT } = useTranslation();
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(currentSpecializations);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSpecialization = (id: string) => {
    setSelectedSpecializations(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const addCustomSpecialization = () => {
    if (customSpecialization.trim()) {
      const customId = customSpecialization.toLowerCase().replace(/\s+/g, '_');
      setSelectedSpecializations(prev => [...prev, customId]);
      setCustomSpecialization('');
      setShowCustomModal(false);
    }
  };

  const removeSpecialization = (id: string) => {
    setSelectedSpecializations(prev => prev.filter(s => s !== id));
  };

  const saveChanges = async () => {
    try {
      setLoading(true);

      // Update specializations only
      const specializationsSuccess = await driverService.updateSpecializations(selectedSpecializations);
      if (!specializationsSuccess) {
        throw new Error('Failed to update specializations');
      }

      Alert.alert(
        'Success',
        'Your specializations have been updated!',
        [{ text: 'OK', onPress: () => { onUpdate(); onBack(); } }]
      );

    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderSpecializationItem = ({ item }: { item: typeof AVAILABLE_SPECIALIZATIONS[0] }) => {
    const isSelected = selectedSpecializations.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => toggleSpecialization(item.id)}
      >
        <Text style={styles.optionIcon}>{item.icon}</Text>
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {item.label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
        )}
      </TouchableOpacity>
    );
  };

  const renderCustomSpecializations = () => {
    const customSpecs = selectedSpecializations.filter(spec => 
      !AVAILABLE_SPECIALIZATIONS.find(item => item.id === spec)
    );

    if (customSpecs.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Specializations</Text>
        {customSpecs.map((spec, index) => (
          <View key={index} style={styles.customSpecItem}>
            <Text style={styles.customSpecText}>{spec.replace(/_/g, ' ')}</Text>
            <TouchableOpacity onPress={() => removeSpecialization(spec)}>
              <Ionicons name="close-circle" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Skills</Text>
        <TouchableOpacity 
          onPress={saveChanges} 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Specializations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <TouchableOpacity 
              onPress={() => setShowCustomModal(true)}
              style={styles.addButton}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
              <Text style={styles.addButtonText}>Add Custom</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={AVAILABLE_SPECIALIZATIONS}
            renderItem={renderSpecializationItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Custom Specializations */}
        {renderCustomSpecializations()}

        {/* Selected Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            Specializations: {selectedSpecializations.length}
          </Text>
        </View>
      </ScrollView>

      {/* Custom Specialization Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Specialization</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter specialization (e.g., Glass Transport)"
              value={customSpecialization}
              onChangeText={setCustomSpecialization}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                onPress={() => setShowCustomModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={addCustomSpecialization}
                style={[styles.modalButton, styles.modalButtonAdd]}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonAddText]}>Add</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    padding: 8,
    minWidth: 44, // iOS minimum touch target
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    flex: 1,
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: theme.lightText,
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.white,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: '600',
    color: theme.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.primary + '10',
  },
  addButtonText: {
    marginLeft: 5,
    color: theme.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 56, // Better touch target
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  optionItemSelected: {
    backgroundColor: theme.primary + '10',
    borderColor: theme.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: Math.min(screenWidth * 0.04, 16),
    color: theme.text,
    flexWrap: 'wrap',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: theme.primary,
  },
  customSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: theme.warning + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.warning,
    minHeight: 56,
  },
  customSpecText: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    color: theme.text,
    textTransform: 'capitalize',
    flex: 1,
  },
  summarySection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryTitle: {
    fontSize: Math.min(screenWidth * 0.04, 16),
    fontWeight: '600',
    color: theme.text,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: Math.min(screenWidth * 0.035, 14),
    color: theme.lightText,
    marginBottom: 5,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: Math.min(screenWidth * 0.045, 18),
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 48,
    backgroundColor: theme.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalButtonAdd: {
    backgroundColor: theme.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  modalButtonAddText: {
    color: theme.white,
  },
});

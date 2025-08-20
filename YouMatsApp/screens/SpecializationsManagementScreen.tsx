/**
 * SpecializationsManagementScreen - Manage driver specializations and truck preferences
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverService } from '../services/DriverService';

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

// Available truck types
const AVAILABLE_TRUCK_TYPES = [
  { id: 'small_truck', label: 'Small Truck (up to 3.5t)', icon: '🚐' },
  { id: 'medium_truck', label: 'Medium Truck (3.5-7.5t)', icon: '🚚' },
  { id: 'large_truck', label: 'Large Truck (7.5-18t)', icon: '🚛' },
  { id: 'heavy_truck', label: 'Heavy Truck (18t+)', icon: '🚛' },
  { id: 'flatbed_truck', label: 'Flatbed Truck', icon: '🛻' },
  { id: 'dump_truck', label: 'Dump Truck', icon: '🚛' },
  { id: 'concrete_mixer', label: 'Concrete Mixer', icon: '🚛' },
  { id: 'crane_truck', label: 'Crane Truck', icon: '🏗️' },
  { id: 'box_truck', label: 'Box Truck', icon: '📦' },
  { id: 'refrigerated_truck', label: 'Refrigerated Truck', icon: '❄️' },
];

interface SpecializationsManagementScreenProps {
  onBack: () => void;
  currentSpecializations: string[];
  currentTruckTypes: string[];
  onUpdate: () => void;
}

export default function SpecializationsManagementScreen({
  onBack,
  currentSpecializations,
  currentTruckTypes,
  onUpdate,
}: SpecializationsManagementScreenProps) {
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(currentSpecializations);
  const [selectedTruckTypes, setSelectedTruckTypes] = useState<string[]>(currentTruckTypes);
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

  const toggleTruckType = (id: string) => {
    setSelectedTruckTypes(prev => 
      prev.includes(id) 
        ? prev.filter(t => t !== id)
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

      // Update specializations
      const specializationsSuccess = await driverService.updateSpecializations(selectedSpecializations);
      if (!specializationsSuccess) {
        throw new Error('Failed to update specializations');
      }

      // Update truck types
      const truckTypesSuccess = await driverService.updatePreferredTruckTypes(selectedTruckTypes);
      if (!truckTypesSuccess) {
        throw new Error('Failed to update truck types');
      }

      Alert.alert(
        'Success',
        'Your specializations and truck preferences have been updated!',
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

  const renderTruckTypeItem = ({ item }: { item: typeof AVAILABLE_TRUCK_TYPES[0] }) => {
    const isSelected = selectedTruckTypes.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => toggleTruckType(item.id)}
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

        {/* Truck Types Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Truck Types</Text>
          <FlatList
            data={AVAILABLE_TRUCK_TYPES}
            renderItem={renderTruckTypeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Selected Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            Specializations: {selectedSpecializations.length}
          </Text>
          <Text style={styles.summaryText}>
            Truck Types: {selectedTruckTypes.length}
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
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: theme.accent,
  },
  saveButtonText: {
    color: theme.white,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    marginLeft: 5,
    color: theme.primary,
    fontWeight: '500',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 4,
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionItemSelected: {
    backgroundColor: '#E8F5E8',
    borderColor: theme.success,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: theme.text,
  },
  customSpecItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.warning,
  },
  customSpecText: {
    fontSize: 16,
    color: theme.text,
    textTransform: 'capitalize',
  },
  summarySection: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: theme.cardBackground,
    borderRadius: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: theme.lightText,
    marginBottom: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.white,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.cardBackground,
  },
  modalButtonAdd: {
    backgroundColor: theme.primary,
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

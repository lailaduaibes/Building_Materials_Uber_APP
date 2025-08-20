/**
 * Order Placement - Professional Building Materials Ordering Interface
 * Clean, business-focused order creation for customers
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OrderItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  quantity: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface OrderPlacementProps {
  user: User;
  onNavigate: (screen: string) => void;
}

const BUILDING_MATERIALS = [
  { id: '1', name: 'Concrete Blocks', category: 'Concrete', unit: 'pieces', pricePerUnit: 2.50 },
  { id: '2', name: 'Steel Rebar', category: 'Steel', unit: 'kg', pricePerUnit: 1.20 },
  { id: '3', name: 'Cement Bags', category: 'Cement', unit: 'bags', pricePerUnit: 24.00 },
  { id: '4', name: 'Sand', category: 'Aggregates', unit: 'cubic meters', pricePerUnit: 35.00 },
  { id: '5', name: 'Gravel', category: 'Aggregates', unit: 'cubic meters', pricePerUnit: 40.00 },
  { id: '6', name: 'Brick Red', category: 'Bricks', unit: 'pieces', pricePerUnit: 0.80 },
  { id: '7', name: 'Roof Tiles', category: 'Roofing', unit: 'pieces', pricePerUnit: 3.20 },
  { id: '8', name: 'PVC Pipes', category: 'Plumbing', unit: 'meters', pricePerUnit: 8.50 },
];

const OrderPlacement: React.FC<OrderPlacementProps> = ({ user, onNavigate }) => {
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);

  const addMaterial = (material: any) => {
    const newItem: OrderItem = {
      id: material.id,
      name: material.name,
      category: material.category,
      unit: material.unit,
      pricePerUnit: material.pricePerUnit,
      quantity: 1,
    };

    const existingIndex = selectedItems.findIndex(item => item.id === material.id);
    if (existingIndex >= 0) {
      const updatedItems = [...selectedItems];
      updatedItems[existingIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      setSelectedItems([...selectedItems, newItem]);
    }
    setShowMaterialSelector(false);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(selectedItems.filter(item => item.id !== itemId));
    } else {
      setSelectedItems(selectedItems.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your order');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please provide a delivery address');
      return;
    }

    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`${API_URL}/api/v1/customer/orders`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${token}`
      //   },
      //   body: JSON.stringify({
      //     items: selectedItems,
      //     deliveryAddress,
      //     deliveryDate,
      //     specialInstructions,
      //     totalAmount: calculateTotal()
      //   })
      // });

      Alert.alert(
        'Order Placed Successfully',
        `Your order for $${calculateTotal().toFixed(2)} has been submitted and will be processed shortly.`,
        [
          { text: 'Track Order', onPress: () => onNavigate('track-order') },
          { text: 'Back to Dashboard', onPress: () => onNavigate('dashboard') }
        ]
      );

      // Reset form
      setSelectedItems([]);
      setDeliveryAddress('');
      setDeliveryDate('');
      setSpecialInstructions('');

    } catch (error) {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    }
  };

  const groupedMaterials = BUILDING_MATERIALS.reduce((acc, material) => {
    if (!acc[material.category]) {
      acc[material.category] = [];
    }
    acc[material.category].push(material);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2c3e50', '#34495e']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('dashboard')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place New Order</Text>
        <Text style={styles.headerSubtitle}>Select building materials for delivery</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Selected Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Selected Items</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowMaterialSelector(true)}
            >
              <Text style={styles.addButtonText}>+ Add Material</Text>
            </TouchableOpacity>
          </View>

          {selectedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items selected</Text>
              <Text style={styles.emptySubtext}>Add materials to start building your order</Text>
            </View>
          ) : (
            selectedItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                  <Text style={styles.itemPrice}>${item.pricePerUnit} per {item.unit}</Text>
                </View>
                
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemTotal}>
                  ${(item.pricePerUnit * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter complete delivery address"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Delivery Date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD (optional)"
              value={deliveryDate}
              onChangeText={setDeliveryDate}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Instructions</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any special delivery instructions..."
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Order Summary */}
        {selectedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items ({selectedItems.length})</Text>
                <Text style={styles.summaryValue}>${calculateTotal().toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>$25.00</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>${(calculateTotal() + 25).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Place Order Button */}
      {selectedItems.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.placeOrderButton} onPress={submitOrder}>
            <Text style={styles.placeOrderText}>
              Place Order - ${(calculateTotal() + 25).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Material Selector Modal */}
      <Modal
        visible={showMaterialSelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Building Materials</Text>
            <TouchableOpacity onPress={() => setShowMaterialSelector(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {Object.entries(groupedMaterials).map(([category, materials]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {materials.map((material) => (
                  <TouchableOpacity
                    key={material.id}
                    style={styles.materialItem}
                    onPress={() => addMaterial(material)}
                  >
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>{material.name}</Text>
                      <Text style={styles.materialPrice}>
                        ${material.pricePerUnit} per {material.unit}
                      </Text>
                    </View>
                    <Text style={styles.addText}>+</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ecf0f1',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ecf0f1',
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#495057',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  quantityButton: {
    backgroundColor: '#e9ecef',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
    minWidth: 80,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#495057',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#495057',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  footer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  placeOrderButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeOrderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  categorySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
  },
  materialItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  materialPrice: {
    fontSize: 14,
    color: '#6c757d',
  },
  addText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
});

export default OrderPlacement;

/**
 * Order Management Screens - Complete B2B Delivery System
 * Professional UI for creating and managing building material orders
 * Fixed version without VirtualizedList nesting issues
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { API_ENDPOINTS, getAuthHeaders, ApiResponse } from './apiConfig';
import { authService } from './AuthServiceSupabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Material Types with icons
const MATERIAL_TYPES = [
  { id: 'cement', name: 'Cement', icon: '🏗️', unit: 'bags' },
  { id: 'steel', name: 'Steel Rebar', icon: '🔩', unit: 'pieces' },
  { id: 'bricks', name: 'Bricks', icon: '🧱', unit: 'pieces' },
  { id: 'sand', name: 'Sand', icon: '🏖️', unit: 'cubic meters' },
  { id: 'gravel', name: 'Gravel', icon: '🪨', unit: 'cubic meters' },
  { id: 'concrete_blocks', name: 'Concrete Blocks', icon: '🏠', unit: 'pieces' },
  { id: 'lumber', name: 'Lumber', icon: '🪵', unit: 'pieces' },
  { id: 'pipes', name: 'Pipes', icon: '🚰', unit: 'pieces' },
  { id: 'tiles', name: 'Tiles', icon: '🔲', unit: 'square meters' },
  { id: 'other', name: 'Other', icon: '❓', unit: 'units' },
];

// Order status with colors
const ORDER_STATUSES = {
  pending: { label: 'Pending', color: '#F59E0B', icon: '⏳' },
  assigned: { label: 'Assigned', color: '#3B82F6', icon: '👤' },
  picked_up: { label: 'Picked Up', color: '#8B5CF6', icon: '📦' },
  in_transit: { label: 'In Transit', color: '#06B6D4', icon: '🚚' },
  delivered: { label: 'Delivered', color: '#10B981', icon: '✅' },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: '❌' },
  failed: { label: 'Failed', color: '#DC2626', icon: '⚠️' },
};

interface OrderItem {
  materialType: string;
  description: string;
  quantity: number;
  unit: string;
  weight: number;
  volume?: number;
  specialHandling?: string[];
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  specialInstructions?: string;
}

interface Order {
  id: string;
  orderType: string;
  status: string;
  items: OrderItem[];
  pickupAddress: Address;
  deliveryAddress: Address;
  totalWeight: number;
  totalVolume: number;
  scheduledPickupTime?: string;
  scheduledDeliveryTime?: string;
  createdAt: string;
  notes?: string;
}

interface OrderScreensProps {
  user: any;
  onBack: () => void;
}

export const OrderScreens: React.FC<OrderScreensProps> = ({ user, onBack }) => {
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'create' | 'details' | 'track'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  // Create Order Form State
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [pickupAddress, setPickupAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'UAE',
  });
  const [deliveryAddress, setDeliveryAddress] = useState<Address>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'UAE',
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  // Material Selection Modal
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<OrderItem>>({});

  // Load orders on mount
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const session = authService.getCurrentSession();
      const token = session?.access_token;
      
      console.log('Loading orders with token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(API_ENDPOINTS.orders, {
        headers: getAuthHeaders(token),
      });
      
      console.log('Orders API response status:', response.status);
      
      if (response.ok) {
        const data: ApiResponse = await response.json();
        console.log('Orders loaded successfully:', data.data?.orders?.length || 0);
        setOrders(data.data?.orders || []);
      } else {
        const errorText = await response.text();
        console.error('Orders API error:', response.status, errorText);
        Alert.alert('Error', `Failed to load orders: ${response.status}`);
      }
    } catch (error) {
      console.error('Orders loading error:', error);
      Alert.alert('Error', 'Failed to load orders - Check network connection');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item to your order');
      return;
    }

    if (!pickupAddress.street || !deliveryAddress.street) {
      Alert.alert('Error', 'Please fill in pickup and delivery addresses');
      return;
    }

    setLoading(true);
    try {
      const session = authService.getCurrentSession();
      const token = session?.access_token;
      
      const orderData = {
        items: orderItems,
        pickupAddress,
        deliveryAddress,
        scheduledPickupTime: pickupTime || null,
        scheduledDeliveryTime: deliveryTime || null,
        notes: orderNotes || null,
      };

      console.log('Creating order with data:', orderData);
      console.log('Using token:', token ? 'Present' : 'Missing');

      const response = await fetch(API_ENDPOINTS.orders, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(orderData),
      });

      console.log('Create order response status:', response.status);

      if (response.ok) {
        Alert.alert('Success', 'Order created successfully!');
        setCurrentScreen('dashboard');
        clearOrderForm();
        loadOrders();
      } else {
        const error: ApiResponse = await response.json();
        console.error('Create order error:', error);
        Alert.alert('Error', error.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('Create order error:', error);
      Alert.alert('Error', 'Failed to create order - Check network connection');
    } finally {
      setLoading(false);
    }
  };

  const clearOrderForm = () => {
    setOrderItems([]);
    setPickupAddress({ street: '', city: '', state: '', zipCode: '', country: 'UAE' });
    setDeliveryAddress({ street: '', city: '', state: '', zipCode: '', country: 'UAE' });
    setOrderNotes('');
    setPickupTime('');
    setDeliveryTime('');
  };

  const addOrUpdateItem = () => {
    if (!currentItem.materialType || !currentItem.description || !currentItem.quantity || !currentItem.weight) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const material = MATERIAL_TYPES.find(m => m.id === currentItem.materialType);
    const newItem: OrderItem = {
      materialType: currentItem.materialType!,
      description: currentItem.description!,
      quantity: Number(currentItem.quantity!),
      unit: material?.unit || 'units',
      weight: Number(currentItem.weight!),
      volume: currentItem.volume ? Number(currentItem.volume) : undefined,
      specialHandling: currentItem.specialHandling || [],
    };

    if (editingItemIndex !== null) {
      const updatedItems = [...orderItems];
      updatedItems[editingItemIndex] = newItem;
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, newItem]);
    }

    setMaterialModalVisible(false);
    setCurrentItem({});
    setEditingItemIndex(null);
  };

  const removeItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const editItem = (index: number) => {
    setCurrentItem(orderItems[index]);
    setEditingItemIndex(index);
    setMaterialModalVisible(true);
  };

  // Dashboard Screen
  const renderDashboard = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#2C5CC5', '#1E40AF']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Management</Text>
          <Text style={styles.headerSubtitle}>Manage your delivery orders</Text>
        </View>
      </LinearGradient>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => setCurrentScreen('create')}
        >
          <Text style={styles.actionButtonIcon}>📦</Text>
          <Text style={styles.actionButtonText}>Create Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
          onPress={loadOrders}
        >
          <Text style={styles.actionButtonIcon}>🔄</Text>
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2C5CC5" style={styles.loader} />
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📦</Text>
            <Text style={styles.emptyStateText}>No orders yet</Text>
            <Text style={styles.emptyStateSubtext}>Create your first delivery order</Text>
          </View>
        ) : (
          <ScrollView style={styles.ordersContainer}>
            {orders.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.orderCard}
                onPress={() => {
                  setSelectedOrder(item);
                  setCurrentScreen('details');
                }}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderTitle}>Order #{item.id.slice(-8)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: ORDER_STATUSES[item.status as keyof typeof ORDER_STATUSES]?.color }]}>
                    <Text style={styles.statusText}>
                      {ORDER_STATUSES[item.status as keyof typeof ORDER_STATUSES]?.icon} {ORDER_STATUSES[item.status as keyof typeof ORDER_STATUSES]?.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderWeight}>📦 {item.totalWeight}kg • 📏 {item.totalVolume}m³</Text>
                <Text style={styles.orderAddress}>📍 {item.deliveryAddress.city}</Text>
                <Text style={styles.orderDate}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );

  // Create Order Screen
  const renderCreateOrder = () => (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setCurrentScreen('dashboard')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Order</Text>
          <Text style={styles.headerSubtitle}>Building materials delivery</Text>
        </View>
      </LinearGradient>

      <View style={styles.form}>
        {/* Order Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setCurrentItem({});
                setEditingItemIndex(null);
                setMaterialModalVisible(true);
              }}
            >
              <Text style={styles.addButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {orderItems.length === 0 ? (
            <View style={styles.emptyItemsState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateText}>No items added</Text>
            </View>
          ) : (
            <View>
              {orderItems.map((item, index) => {
                const material = MATERIAL_TYPES.find(m => m.id === item.materialType);
                return (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{material?.icon} {material?.name}</Text>
                      <View style={styles.itemActions}>
                        <TouchableOpacity onPress={() => editItem(index)} style={styles.editButton}>
                          <Text style={styles.editButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemDetails}>
                      📦 {item.quantity} {item.unit} • ⚖️ {item.weight}kg
                      {item.volume && ` • 📏 ${item.volume}m³`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Pickup Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Pickup Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            value={pickupAddress.street}
            onChangeText={(text) => setPickupAddress({...pickupAddress, street: text})}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="City"
              value={pickupAddress.city}
              onChangeText={(text) => setPickupAddress({...pickupAddress, city: text})}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="State"
              value={pickupAddress.state}
              onChangeText={(text) => setPickupAddress({...pickupAddress, state: text})}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="ZIP Code"
            value={pickupAddress.zipCode}
            onChangeText={(text) => setPickupAddress({...pickupAddress, zipCode: text})}
          />
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Street Address"
            value={deliveryAddress.street}
            onChangeText={(text) => setDeliveryAddress({...deliveryAddress, street: text})}
          />
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="City"
              value={deliveryAddress.city}
              onChangeText={(text) => setDeliveryAddress({...deliveryAddress, city: text})}
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="State"
              value={deliveryAddress.state}
              onChangeText={(text) => setDeliveryAddress({...deliveryAddress, state: text})}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="ZIP Code"
            value={deliveryAddress.zipCode}
            onChangeText={(text) => setDeliveryAddress({...deliveryAddress, zipCode: text})}
          />
        </View>

        {/* Schedule & Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Schedule & Notes</Text>
          <TextInput
            style={styles.input}
            placeholder="Preferred Pickup Time (optional)"
            value={pickupTime}
            onChangeText={setPickupTime}
          />
          <TextInput
            style={styles.input}
            placeholder="Preferred Delivery Time (optional)"
            value={deliveryTime}
            onChangeText={setDeliveryTime}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Special instructions or notes"
            value={orderNotes}
            onChangeText={setOrderNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, { opacity: loading ? 0.6 : 1 }]}
          onPress={createOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.createButtonText}>Create Order 📦</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Material Selection Modal
  const renderMaterialModal = () => (
    <Modal visible={materialModalVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setMaterialModalVisible(false)}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingItemIndex !== null ? 'Edit Item' : 'Add Item'}
          </Text>
          <TouchableOpacity onPress={addOrUpdateItem}>
            <Text style={styles.modalSaveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>Material Type</Text>
          <View style={styles.materialGrid}>
            {MATERIAL_TYPES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.materialOption,
                  currentItem.materialType === item.id && styles.materialOptionSelected
                ]}
                onPress={() => setCurrentItem({...currentItem, materialType: item.id})}
              >
                <Text style={styles.materialIcon}>{item.icon}</Text>
                <Text style={styles.materialName}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Portland Cement 50kg bags"
            value={currentItem.description || ''}
            onChangeText={(text) => setCurrentItem({...currentItem, description: text})}
          />

          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={currentItem.quantity?.toString() || ''}
                onChangeText={(text) => setCurrentItem({...currentItem, quantity: Number(text) || 0})}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={currentItem.weight?.toString() || ''}
                onChangeText={(text) => setCurrentItem({...currentItem, weight: Number(text) || 0})}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Volume (m³) - Optional</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={currentItem.volume?.toString() || ''}
            onChangeText={(text) => setCurrentItem({...currentItem, volume: Number(text) || undefined})}
            keyboardType="numeric"
          />
        </ScrollView>
      </View>
    </Modal>
  );

  // Main render
  return (
    <View style={styles.mainContainer}>
      {currentScreen === 'dashboard' && renderDashboard()}
      {currentScreen === 'create' && renderCreateOrder()}
      {renderMaterialModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
  ordersContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderWeight: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  orderAddress: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  orderDate: {
    fontSize: 14,
    color: '#64748B',
  },
  form: {
    padding: 20,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyItemsState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    padding: 5,
  },
  editButtonText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  itemDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 5,
  },
  itemDetails: {
    fontSize: 12,
    color: '#94A3B8',
  },
  createButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#EF4444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  materialOption: {
    width: '48%',
    margin: '1%',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  materialOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  materialIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  materialName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#374151',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../theme';
import paymentService, { PaymentMethod } from '../services/PaymentService';
import AddPaymentMethodScreen from '../AddPaymentMethodScreen';

interface PaymentMethodsScreenProps {
  onBack: () => void;
}

export default function PaymentMethodsScreen({ onBack }: PaymentMethodsScreenProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPaymentMethods();
    setRefreshing(false);
  };

  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    Alert.alert(
      'Remove Payment Method',
      `Are you sure you want to remove •••• •••• •••• ${paymentMethod.last4}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deletePaymentMethod(paymentMethod),
        },
      ]
    );
  };

  const deletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      setProcessingId(paymentMethod.id);
      await paymentService.removePaymentMethod(paymentMethod.id);
      setPaymentMethods(methods => methods.filter(m => m.id !== paymentMethod.id));
      Alert.alert('Success', 'Payment method removed successfully');
    } catch (error) {
      console.error('Error removing payment method:', error);
      Alert.alert('Error', 'Failed to remove payment method. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSetDefault = async (paymentMethod: PaymentMethod) => {
    try {
      setProcessingId(paymentMethod.id);
      await paymentService.setDefaultPaymentMethod(paymentMethod.id);
      setPaymentMethods(methods =>
        methods.map(m => ({
          ...m,
          is_default: m.id === paymentMethod.id
        }))
      );
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const getCardIcon = (brand?: string): "credit-card" => {
    return 'credit-card'; // Using generic credit card icon for all types
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.paymentMethodCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <MaterialIcons 
            name={getCardIcon(item.brand)} 
            size={32} 
            color={Theme.colors.primary} 
          />
          <View style={styles.cardDetails}>
            <Text style={styles.cardBrand}>
              {item.brand?.toUpperCase()} •••• {item.last4}
            </Text>
            <Text style={styles.cardExpiry}>
              Expires {item.expiryMonth?.toString().padStart(2, '0')}/{item.expiryYear?.toString().slice(-2)}
            </Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>DEFAULT</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.cardActions}>
          {!item.isDefault && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(item)}
              disabled={processingId === item.id}
            >
              {processingId === item.id ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              ) : (
                <MaterialIcons name="star-border" size={24} color={Theme.colors.primary} />
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeletePaymentMethod(item)}
            disabled={processingId === item.id}
          >
            {processingId === item.id ? (
              <ActivityIndicator size="small" color={Theme.colors.error} />
            ) : (
              <MaterialIcons name="delete-outline" size={24} color={Theme.colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (showAddPayment) {
    return (
      <AddPaymentMethodScreen
        onBack={() => setShowAddPayment(false)}
        onPaymentAdded={() => {
          setShowAddPayment(false);
          loadPaymentMethods();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={Theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Methods</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>Loading payment methods...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={paymentMethods}
              keyExtractor={(item) => item.id}
              renderItem={renderPaymentMethod}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={Theme.colors.primary}
                />
              }
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <MaterialIcons 
                    name="credit-card" 
                    size={64} 
                    color={Theme.colors.text.secondary} 
                  />
                  <Text style={styles.emptyTitle}>No Payment Methods</Text>
                  <Text style={styles.emptyText}>
                    Add a payment method to complete your orders
                  </Text>
                </View>
              )}
              contentContainerStyle={[
                styles.listContent,
                paymentMethods.length === 0 && styles.emptyListContent
              ]}
            />

            {/* Add Payment Method Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddPayment(true)}
            >
              <MaterialIcons name="add" size={24} color="white" />
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  paymentMethodCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  cardExpiry: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: Theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  addButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginTop: 16,
  },
});

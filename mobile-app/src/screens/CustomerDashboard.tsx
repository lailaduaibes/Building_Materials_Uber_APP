import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { Colors, Spacing, BorderRadius, FontSizes } from "../constants/theme";
import { Order } from "../types";
import { ordersAPI } from "../services/api";

interface CustomerDashboardProps {
  navigation: any;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getOrders();
      if (response.success) {
        setOrders(response.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return Colors.pending;
      case "assigned": return Colors.assigned;
      case "picked_up": return Colors.pickedUp;
      case "in_transit": return Colors.inTransit;
      case "delivered": return Colors.delivered;
      default: return Colors.gray500;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "assigned": return "Assigned";
      case "picked_up": return "Picked Up";
      case "in_transit": return "In Transit";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const renderOrderCard = (order: Order) => (
    <TouchableOpacity 
      key={order.id}
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderDetails", { orderId: order.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.orderDate}>
        Ordered: {new Date(order.createdAt).toLocaleDateString()}
      </Text>
      
      <Text style={styles.itemCount}>
        {order.items.length} item(s) • {order.totalWeight}kg
      </Text>
      
      <Text style={styles.deliveryAddress} numberOfLines={2}>
        📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}
      </Text>
      
      {order.estimatedDeliveryTime && (
        <Text style={styles.estimatedTime}>
          🕒 Est. Delivery: {new Date(order.estimatedDeliveryTime).toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Deliveries</Text>
        <TouchableOpacity 
          style={styles.newOrderButton}
          onPress={() => navigation.navigate("CreateOrder")}
        >
          <Text style={styles.newOrderButtonText}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {orders.filter(o => o.status === "in_transit").length}
          </Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {orders.filter(o => o.status === "delivered").length}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView 
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Create your first building materials delivery order
            </Text>
            <TouchableOpacity 
              style={styles.createFirstOrderButton}
              onPress={() => navigation.navigate("CreateOrder")}
            >
              <Text style={styles.createFirstOrderButtonText}>Create First Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  newOrderButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  newOrderButtonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: FontSizes.sm,
  },
  statsContainer: {
    flexDirection: "row",
    padding: Spacing.lg,
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: Colors.surface,
    flex: 1,
    marginHorizontal: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    elevation: 1,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: "bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  ordersList: {
    flex: 1,
    padding: Spacing.lg,
  },
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  orderNumber: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  orderDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  itemCount: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  deliveryAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  estimatedTime: {
    fontSize: FontSizes.sm,
    color: Colors.info,
  },
  loadingContainer: {
    alignItems: "center",
    padding: Spacing.xxl,
  },
  loadingText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    padding: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  createFirstOrderButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createFirstOrderButtonText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
});

export default CustomerDashboard;

/**
 * ActivityScreen - Shows user's delivery activity and order history
 * Displays: Recent orders, trip history, notifications, delivery updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../theme';
import TripService from '../services/TripService';
import { authService } from '../AuthServiceSupabase';

interface ActivityItem {
  id: string;
  type: 'order_created' | 'pickup_scheduled' | 'driver_assigned' | 'in_transit' | 'delivered';
  title: string;
  description: string;
  timestamp: string;
  orderId?: string;
  status?: string;
}

interface ActivityScreenProps {
  onBack: () => void;
  onNavigateToOrder: (orderId: string) => void;
}

const ActivityScreen: React.FC<ActivityScreenProps> = ({
  onBack,
  onNavigateToOrder,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Get recent orders and trip requests
      const trips = await TripService.getTripHistory();

      // Convert to activity items
      const activityItems: ActivityItem[] = [];

      // Add order activities
      trips.forEach(order => {
        activityItems.push({
          id: `order-${order.id}`,
          type: getActivityType(order.status),
          title: getActivityTitle(order.status),
          description: `Material delivery to ${order.deliveryAddress.street}, ${order.deliveryAddress.city}`,
          timestamp: order.orderDate,
          orderId: order.id,
          status: order.status,
        });
      });

      // If no trips, add some sample data for demonstration
      if (activityItems.length === 0) {
        const sampleActivities: ActivityItem[] = [
          {
            id: 'sample-1',
            type: 'delivered',
            title: 'Delivery Completed',
            description: 'Cement and sand delivered to 123 Main St, Dubai',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            status: 'delivered',
          },
          {
            id: 'sample-2',
            type: 'in_transit',
            title: 'Delivery In Progress',
            description: 'Building materials on the way to Al Barsha',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            status: 'in_transit',
          },
          {
            id: 'sample-3',
            type: 'driver_assigned',
            title: 'Driver Assigned',
            description: 'Ahmed has been assigned to your order',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
            status: 'matched',
          },
        ];
        activityItems.push(...sampleActivities);
      }

      // Sort by timestamp (newest first)
      activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activityItems.slice(0, 20)); // Show last 20 activities
    } catch (error) {
      console.error('Error loading activity:', error);
      // Show sample data even if there's an error
      const sampleActivities: ActivityItem[] = [
        {
          id: 'sample-1',
          type: 'delivered',
          title: 'Delivery Completed',
          description: 'Cement and sand delivered to 123 Main St, Dubai',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          status: 'delivered',
        },
        {
          id: 'sample-2',
          type: 'in_transit',
          title: 'Delivery In Progress',
          description: 'Building materials on the way to Al Barsha',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: 'in_transit',
        },
      ];
      setActivities(sampleActivities);
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (status: string): ActivityItem['type'] => {
    switch (status) {
      case 'pending': return 'order_created';
      case 'matched': return 'driver_assigned';
      case 'in_transit': return 'in_transit';
      case 'delivered': return 'delivered';
      default: return 'order_created';
    }
  };

  const getActivityTitle = (status: string): string => {
    switch (status) {
      case 'pending': return 'Order Created';
      case 'matched': return 'Driver Assigned';
      case 'in_transit': return 'Delivery In Progress';
      case 'delivered': return 'Delivery Completed';
      default: return 'Order Update';
    }
  };

  const getActivityIcon = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'order_created': return 'add-shopping-cart';
      case 'driver_assigned': return 'person';
      case 'pickup_scheduled': return 'schedule';
      case 'in_transit': return 'local-shipping';
      case 'delivered': return 'check-circle';
      default: return 'info';
    }
  };

  const getActivityColor = (type: ActivityItem['type']): string => {
    switch (type) {
      case 'order_created': return Theme.colors.primary;
      case 'driver_assigned': return '#2196F3';
      case 'pickup_scheduled': return '#FF9800';
      case 'in_transit': return '#4CAF50';
      case 'delivered': return '#8BC34A';
      default: return Theme.colors.text.secondary;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderActivityItem = (item: ActivityItem, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.activityItem}
      onPress={() => item.orderId && onNavigateToOrder(item.orderId)}
    >
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) }]}>
        <MaterialIcons
          name={getActivityIcon(item.type) as any}
          size={20}
          color="white"
        />
      </View>
      
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityTime}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        <Text style={styles.activityDescription}>{item.description}</Text>
        {item.status && (
          <Text style={[styles.activityStatus, { color: getActivityColor(item.type) }]}>
            Status: {item.status.replace('_', ' ').toUpperCase()}
          </Text>
        )}
      </View>
      
      <MaterialIcons name="chevron-right" size={20} color={Theme.colors.text.secondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Activity List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color={Theme.colors.text.secondary} />
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyText}>
              Your delivery orders and updates will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activities.map(renderActivityItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.primary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  activityList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  activityTime: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
  },
  activityDescription: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ActivityScreen;

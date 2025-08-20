import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const useNetworkStatus = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      });
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
};

// Offline storage keys
const OFFLINE_KEYS = {
  ORDERS: 'offline_orders',
  USER_DATA: 'offline_user_data',
  PENDING_REQUESTS: 'offline_pending_requests',
};

export class OfflineManager {
  // Store data for offline access
  static async storeOfflineData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store offline data:', error);
    }
  }

  // Retrieve offline data
  static async getOfflineData(key: string): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  // Store user orders for offline viewing
  static async storeUserOrders(orders: any[]): Promise<void> {
    await this.storeOfflineData(OFFLINE_KEYS.ORDERS, orders);
  }

  // Get cached orders when offline
  static async getCachedOrders(): Promise<any[]> {
    const orders = await this.getOfflineData(OFFLINE_KEYS.ORDERS);
    return orders || [];
  }

  // Store user profile data
  static async storeUserData(userData: any): Promise<void> {
    await this.storeOfflineData(OFFLINE_KEYS.USER_DATA, userData);
  }

  // Get cached user data
  static async getCachedUserData(): Promise<any> {
    return await this.getOfflineData(OFFLINE_KEYS.USER_DATA);
  }

  // Queue requests for when connection is restored
  static async queueOfflineRequest(request: {
    url: string;
    method: string;
    body?: any;
    timestamp: number;
  }): Promise<void> {
    try {
      const existingQueue = await this.getOfflineData(OFFLINE_KEYS.PENDING_REQUESTS) || [];
      existingQueue.push(request);
      await this.storeOfflineData(OFFLINE_KEYS.PENDING_REQUESTS, existingQueue);
    } catch (error) {
      console.error('Failed to queue offline request:', error);
    }
  }

  // Process queued requests when connection is restored
  static async processQueuedRequests(): Promise<void> {
    try {
      const queue = await this.getOfflineData(OFFLINE_KEYS.PENDING_REQUESTS) || [];
      
      for (const request of queue) {
        try {
          // Attempt to send the queued request
          const response = await fetch(request.url, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          });

          if (response.ok) {
            console.log('Queued request processed successfully:', request.url);
          } else {
            console.log('Queued request failed:', request.url, response.status);
          }
        } catch (error) {
          console.error('Failed to process queued request:', error);
          // Keep the request in queue for next attempt
          continue;
        }
      }

      // Clear the queue after processing
      await AsyncStorage.removeItem(OFFLINE_KEYS.PENDING_REQUESTS);
    } catch (error) {
      console.error('Failed to process queued requests:', error);
    }
  }

  // Clear all offline data
  static async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        OFFLINE_KEYS.ORDERS,
        OFFLINE_KEYS.USER_DATA,
        OFFLINE_KEYS.PENDING_REQUESTS,
      ]);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }
}

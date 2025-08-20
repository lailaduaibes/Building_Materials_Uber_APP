import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useNetworkStatus } from '../services/NetworkManager';

interface NetworkStatusBarProps {
  onRetry?: () => void;
}

export const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ onRetry }) => {
  const networkState = useNetworkStatus();
  const [slideAnim] = React.useState(new Animated.Value(-60));

  React.useEffect(() => {
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      // Show the bar
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide the bar
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  if (networkState.isConnected && networkState.isInternetReachable) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>
          {!networkState.isConnected 
            ? 'No internet connection' 
            : 'Connection issues'}
        </Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

export const OfflineBanner: React.FC = () => {
  const networkState = useNetworkStatus();

  if (networkState.isConnected && networkState.isInternetReachable) {
    return null;
  }

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>
        📵 You're offline. Some features may not be available.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff6b6b',
    zIndex: 1000,
    paddingTop: 40, // Account for status bar
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: '#ffa726',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

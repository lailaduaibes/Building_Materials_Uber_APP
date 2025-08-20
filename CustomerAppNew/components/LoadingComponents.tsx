import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingScreenProps {
  visible: boolean;
  message?: string;
  overlay?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible,
  message = 'Loading...',
  overlay = true,
}) => {
  if (!visible) return null;

  const content = (
    <View style={[styles.container, !overlay && styles.fullScreen]}>
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  if (overlay) {
    return (
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        statusBarTranslucent
      >
        {content}
      </Modal>
    );
  }

  return content;
};

interface LoadingButtonProps {
  loading: boolean;
  title: string;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  title,
  onPress,
  style,
  disabled = false,
}) => {
  return (
    <LinearGradient
      colors={disabled || loading ? ['#cccccc', '#999999'] : ['#667eea', '#764ba2']}
      style={[styles.button, style]}
    >
      <TouchableOpacity
        style={styles.buttonTouchable}
        onPress={onPress}
        disabled={disabled || loading}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.buttonText}>Loading...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </TouchableOpacity>
    </LinearGradient>
  );
};

// Import TouchableOpacity
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreen: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonTouchable: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

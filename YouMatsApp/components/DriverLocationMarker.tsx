import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '../theme/colors';

interface DriverLocationMarkerProps {
  isActive?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const DriverLocationMarker: React.FC<DriverLocationMarkerProps> = ({
  isActive = true,
  size = 'medium',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isActive, pulseAnim]);

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 36, height: 36, borderRadius: 18 };
      case 'large':
        return { width: 52, height: 52, borderRadius: 26 };
      default:
        return { width: 44, height: 44, borderRadius: 22 };
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated pulsing ring */}
      {isActive && (
        <Animated.View 
          style={[
            styles.pulseRing, 
            getSizeStyle(),
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.4],
                outputRange: [0.7, 0.0],
              }),
            }
          ]} 
        />
      )}
      
      {/* Main marker */}
      <View style={[
        styles.marker,
        getSizeStyle(),
        !isActive && styles.inactiveMarker
      ]}>
        <View style={[
          styles.innerCircle,
          {
            width: getSizeStyle().width * 0.4,
            height: getSizeStyle().height * 0.4,
            borderRadius: getSizeStyle().borderRadius * 0.4,
          }
        ]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: Colors.primary + '30',
    borderWidth: 2,
    borderColor: Colors.primary + '60',
  },
  marker: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  inactiveMarker: {
    backgroundColor: Colors.text.secondary,
    opacity: 0.7,
  },
  innerCircle: {
    backgroundColor: Colors.background.primary,
  },
});

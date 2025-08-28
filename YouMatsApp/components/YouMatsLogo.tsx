/**
 * YouMats Logo Component for Driver App
 * Professional logo component ready for actual YouMats logo image
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';

interface YouMatsLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: any;
  animated?: boolean;
  showText?: boolean;
}

export const YouMatsLogo: React.FC<YouMatsLogoProps> = ({ 
  size = 'medium',
  style,
  animated = false,
  showText = true
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Gentle pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [animated]);

  const sizeStyles = {
    small: {
      logo: { width: 60, height: 60 },
      text: { fontSize: 18 },
      container: { height: 70 }
    },
    medium: {
      logo: { width: 80, height: 80 },
      text: { fontSize: 24 },
      container: { height: 90 }
    },
    large: {
      logo: { width: 100, height: 100 },
      text: { fontSize: 32 },
      container: { height: 120 }
    },
    xlarge: {
      logo: { width: 140, height: 140 },
      text: { fontSize: 42 },
      container: { height: 160 }
    }
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.container, { height: currentSize.container.height }, style]}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: animated ? pulseAnim : 1 }
            ]
          }
        ]}
      >
        {/* Actual YouMats Logo Image */}
        <Image
          source={require('../assets/images/YouMats-logo.webp')}
          style={[styles.logoImage, {
            width: currentSize.logo.width,
            height: currentSize.logo.height,
          }]}
          resizeMode="contain"
        />
        
        {/* Placeholder - now commented out since we have the actual logo */}
        {/* <View style={[styles.logoPlaceholder, {
          width: currentSize.logo.width,
          height: currentSize.logo.height,
        }]}>
          <Text style={[styles.placeholderText, { fontSize: currentSize.logo.width * 0.25 }]}>
            YouMats
          </Text>
          <Text style={[styles.placeholderSubtext, { fontSize: currentSize.logo.width * 0.12 }]}>
            EGYPT
          </Text>
        </View> */}
      </Animated.View>
      
      {/* Company Name Text */}
      {showText && (
        <Text style={[styles.logoText, { fontSize: currentSize.text.fontSize }]}>
          You<Text style={styles.matsText}>Mats</Text>
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    // Actual logo image styling
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  logoPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    color: '#1E40AF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: '#1E40AF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  logoText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  matsText: {
    color: '#60A5FA', // Light blue accent for "Mats"
  },
});

export default YouMatsLogo;

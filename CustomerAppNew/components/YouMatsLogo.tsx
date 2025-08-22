/**
 * YouMats Logo Component
 * Professional logo using the actual YouMats image with animations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Theme } from '../theme';

interface YouMatsLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  style?: any;
  animated?: boolean;
}

export const YouMatsLogo: React.FC<YouMatsLogoProps> = ({ 
  size = 'medium',
  style,
  animated = false
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Continuous pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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

      // Gentle rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );

      pulseAnimation.start();
      rotateAnimation.start();

      return () => {
        pulseAnimation.stop();
        rotateAnimation.stop();
      };
    }
  }, [animated]);

  const sizeStyles = {
    small: {
      container: { width: 120, height: 60 },
      logo: { width: 50, height: 50 },
      text: { fontSize: 16 }
    },
    medium: {
      container: { width: 180, height: 80 },
      logo: { width: 70, height: 70 },
      text: { fontSize: 24 }
    },
    large: {
      container: { width: 240, height: 100 },
      logo: { width: 90, height: 90 },
      text: { fontSize: 32 }
    },
    xlarge: {
      container: { width: 320, height: 140 },
      logo: { width: 120, height: 120 },
      text: { fontSize: 42 }
    }
  };

  const currentSize = sizeStyles[size];

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, currentSize.container, style]}>
      {/* Animated Logo Image */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: animated ? pulseAnim : 1 },
              { rotate: animated ? rotateInterpolate : '0deg' }
            ]
          }
        ]}
      >
        {/* Fallback logo design until real image is added */}
        <View style={[styles.fallbackLogo, {
          width: currentSize.logo.width,
          height: currentSize.logo.height,
        }]}>
          <Text style={[styles.fallbackText, { fontSize: currentSize.logo.width * 0.3 }]}>
            YM
          </Text>
        </View>
        
        {/* Uncomment this when you add the real logo image */}
        {/* <Image
          source={require('../assets/images/youmats-logo.png')}
          style={[styles.logoImage, {
            width: currentSize.logo.width,
            height: currentSize.logo.height,
          }]}
          resizeMode="contain"
        /> */}
      </Animated.View>
      
      {/* Company Name */}
      <Text style={[styles.logoText, { fontSize: currentSize.text.fontSize }]}>
        You<Text style={styles.matsText}>Mats</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    // Image will be styled by inline width/height
  },
  fallbackLogo: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  fallbackText: {
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoText: {
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for logo on blue background
    letterSpacing: -0.5,
  },
  matsText: {
    color: '#60A5FA', // Light blue accent for "Mats"
  },
});

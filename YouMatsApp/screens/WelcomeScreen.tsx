/**
 * YouMats Driver App Welcome Screen
 * Professional welcome screen with minimal design and YouMats branding
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { YouMatsLogo } from '../components';
import { Colors, getGradient } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  // Animation references
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Professional sequential animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Content fade in
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Buttons slide up
      Animated.timing(buttonsTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={getGradient('welcome')}
      style={styles.fullScreenContainer}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      {/* Main Content Container */}
      <View style={styles.mainContainer}>
        {/* Animated YouMats Logo */}
        <Animated.View 
          style={[
            styles.logoSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }
          ]}
        >
          <YouMatsLogo size="xlarge" animated={true} showText={false} />
        </Animated.View>

        {/* YouMats Brand Text */}
        <Animated.View 
          style={[
            styles.brandContainer,
            { opacity: contentOpacity }
          ]}
        >
          <Text style={styles.powerText}>Power</Text>
          <Text style={styles.youMatsText}>YouMats Driver</Text>
        </Animated.View>
      </View>

      {/* Action Button */}
      <Animated.View 
        style={[
          styles.actionContainer,
          { transform: [{ translateY: buttonsTranslateY }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.getStartedButton}
          onPress={onGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>

        {/* Minimal Footer */}
        <Text style={styles.footerText}>
          Professional delivery solutions
        </Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    backgroundColor: Colors.primary, // Fallback color
  },
  
  mainContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.08, // Responsive horizontal padding (8% of screen width)
    paddingTop: height * 0.05, // Responsive top padding (5% of screen height)
  },
  
  logoSection: {
    alignItems: 'center',
    marginBottom: height * 0.08, // Responsive margin (8% of screen height)
  },
  
  brandContainer: {
    alignItems: 'center',
  },
  
  powerText: {
    fontSize: Math.min(width * 0.075, 32), // Responsive font size, max 32
    color: '#ffffff',
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  
  youMatsText: {
    fontSize: Math.min(width * 0.085, 36), // Responsive font size, max 36
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  
  actionContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: width * 0.1, // Responsive horizontal padding (10% of screen width)
    paddingBottom: height * 0.08, // Responsive bottom padding (8% of screen height)
  },
  
  getStartedButton: {
    backgroundColor: '#ffffff',
    paddingVertical: height * 0.02, // Responsive vertical padding (2% of screen height)
    paddingHorizontal: width * 0.15, // Responsive horizontal padding (15% of screen width)
    borderRadius: 25,
    marginBottom: height * 0.04, // Responsive margin (4% of screen height)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: width * 0.5, // Minimum 50% of screen width
  },
  
  getStartedText: {
    fontSize: Math.min(width * 0.045, 18), // Responsive font size, max 18
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  
  footerText: {
    fontSize: Math.min(width * 0.035, 14), // Responsive font size, max 14
    color: '#ffffff',
    opacity: 0.7,
    textAlign: 'center',
    fontWeight: '300',
  },
});

export default WelcomeScreen;

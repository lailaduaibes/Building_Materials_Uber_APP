/**
 * YouMats Welcome Screen
 * Professional welcome screen with brand identity and animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, YouMatsLogo } from '../components';
import { Theme } from '../theme';
import { responsive, deviceTypes } from '../utils/ResponsiveUtils';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin,
}) => {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Sequential animations for professional entrance
    Animated.sequence([
      // Logo entrance with scale and fade
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
      // Subtle rotation animation
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Tagline fade in
      Animated.timing(taglineOpacity, {
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

    // Continuous subtle rotation for logo
    const rotateLoop = () => {
      Animated.loop(
        Animated.timing(logoRotate, {
          toValue: 2,
          duration: 8000,
          useNativeDriver: true,
        })
      ).start();
    };

    const rotateTimer = setTimeout(rotateLoop, 2000);
    return () => clearTimeout(rotateTimer);
  }, []);

  const rotateInterpolate = logoRotate.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '2deg', '0deg'],
  });

  return (
    <Screen safeArea={false} padding={false}>
      <LinearGradient
        colors={Theme.colors.gradients.primary}
        style={styles.gradientContainer}
      >
        {/* Main Content Container */}
        <View style={styles.mainContainer}>
          {/* Animated Logo Section */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { rotate: rotateInterpolate }
                ]
              }
            ]}
          >
            <YouMatsLogo size="xlarge" style={styles.logo} animated={true} />
          </Animated.View>

          {/* Animated Tagline */}
          <Animated.View 
            style={[
              styles.taglineContainer,
              { opacity: taglineOpacity }
            ]}
          >
            <Text style={styles.powerText}>Power</Text>
            <Text style={styles.youMatsText}>YouMats</Text>
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <Animated.View 
          style={[
            styles.actionContainer,
            { transform: [{ translateY: buttonsTranslateY }] }
          ]}
        >
          <Button
            title="Get Started"
            onPress={onGetStarted}
            variant="accent"
            size="large"
            fullWidth
            style={styles.primaryButton}
          />
          
          <Button
            title="I already have an account"
            onPress={onLogin}
            variant="secondary"
            size="large"
            fullWidth
            style={styles.secondaryButton}
          />
        </Animated.View>
      </LinearGradient>
    </Screen>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    paddingHorizontal: responsive.padding(Theme.spacing.screen.horizontal, 40),
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  
  mainContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: responsive.spacing(Theme.spacing.xl, 40),
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: responsive.spacing(Theme.spacing.xxl, 60),
  },
  
  logo: {
    // Additional styling for the logo if needed
  },
  
  taglineContainer: {
    alignItems: 'center',
  },
  
  powerText: {
    fontSize: responsive.fontSize(28, 36),
    color: '#ffffff',
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: responsive.spacing(4, 6),
  },
  
  youMatsText: {
    fontSize: responsive.fontSize(32, 42),
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  actionContainer: {
    paddingBottom: responsive.spacing(Theme.spacing.lg, 32),
    paddingTop: responsive.spacing(Theme.spacing.md, 16),
    paddingHorizontal: responsive.padding(Theme.spacing.screen.horizontal, 40),
  },
  
  primaryButton: {
    marginBottom: responsive.spacing(Theme.spacing.lg, 24),
    minHeight: deviceTypes.isAndroid ? 56 : 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#ffffff',
    borderWidth: 1,
    minHeight: deviceTypes.isAndroid ? 56 : 50,
  },
});

export default WelcomeScreen;

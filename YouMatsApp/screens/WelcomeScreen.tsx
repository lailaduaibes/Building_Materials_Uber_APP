/**
 * YouMats Driver App Welcome Screen
 * Professional welcome screen matching customer app design with multi-language support
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { YouMatsLogo } from '../components';
import { Colors, getGradient } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onGetStarted, 
  onLogin 
}) => {
  const { t } = useTranslation();
  
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
    <LinearGradient
      colors={getGradient('welcome')}
      style={styles.gradientContainer}
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
          <YouMatsLogo size="xlarge" animated={true} showText={false} />
        </Animated.View>

        {/* Animated Tagline */}
        <Animated.View 
          style={[
            styles.taglineContainer,
            { opacity: taglineOpacity }
          ]}
        >
          <Text style={styles.powerText}>Power YouMats</Text>
          <Text style={styles.youMatsText}>Driver Portal</Text>
        </Animated.View>
      </View>

      {/* Action Buttons */}
      <Animated.View 
        style={[
          styles.actionContainer,
          { transform: [{ translateY: buttonsTranslateY }] }
        ]}
      >
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={onGetStarted}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={onLogin}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.alreadyDriver')} {t('welcome.loginButton')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    paddingHorizontal: isTablet ? 40 : 20,
    maxWidth: isTablet ? 600 : '100%',
    alignSelf: isTablet ? 'center' : 'stretch',
  },
  
  mainContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  
  taglineContainer: {
    alignItems: 'center',
  },
  
  powerText: {
    fontSize: isTablet ? 36 : 28,
    color: '#ffffff',
    fontWeight: '300',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  youMatsText: {
    fontSize: isTablet ? 42 : 32,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  actionContainer: {
    paddingBottom: 32,
    paddingTop: 16,
    paddingHorizontal: 40,
  },
  
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 24,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#ffffff',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 25,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default WelcomeScreen;

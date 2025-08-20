/**
 * YouMats Welcome Screen
 * Professional welcome screen with brand identity
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Button, Card } from '../components';
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
  return (
    <Screen safeArea={false} padding={false}>
      <LinearGradient
        colors={['#000000', '#1a1a1a', '#000000']}
        style={styles.gradientContainer}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logoContainer}>
              {/* Placeholder for logo - replace with actual logo */}
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoIcon}>🏗️</Text>
              </View>
              <Text style={styles.brandName}>YouMats</Text>
            </View>
            <Text style={styles.brandTagline}>Building Materials Delivered</Text>
          </View>
          
          <Text style={styles.mainTitle}>
            Professional Construction Materials
          </Text>
          
          <Text style={styles.subtitle}>
            Fast delivery • Quality materials • Trusted service
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🚚</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Fast Delivery</Text>
                <Text style={styles.featureDescription}>
                  Same-day delivery for urgent projects
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📋</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Easy Ordering</Text>
                <Text style={styles.featureDescription}>
                  Quick search and order placement
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📍</Text>
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real-Time Tracking</Text>
                <Text style={styles.featureDescription}>
                  Track your delivery every step of the way
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
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
        </View>
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
  
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: responsive.spacing(Theme.spacing.xxxl, 60),
  },
  
  brandContainer: {
    alignItems: 'center',
    marginBottom: responsive.spacing(Theme.spacing.xxl, 50),
  },
  
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing(Theme.spacing.sm, 16),
  },
  
  logoPlaceholder: {
    width: responsive.spacing(56, 70),
    height: responsive.spacing(56, 70),
    borderRadius: responsive.spacing(16, 20),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsive.spacing(Theme.spacing.md, 20),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  logoIcon: {
    fontSize: responsive.fontSize(28, 34),
  },
  
  brandName: {
    fontSize: responsive.fontSize(28, 36),
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  brandTagline: {
    fontSize: responsive.fontSize(16, 18),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  mainTitle: {
    fontSize: responsive.fontSize(20, 26),
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: responsive.spacing(Theme.spacing.md, 20),
    paddingHorizontal: responsive.spacing(Theme.spacing.lg, 32),
  },
  
  subtitle: {
    fontSize: responsive.fontSize(16, 18),
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: responsive.spacing(Theme.spacing.lg, 32),
  },
  
  featuresContainer: {
    paddingVertical: responsive.spacing(Theme.spacing.xxl, 50),
  },
  
  featureCard: {
    marginBottom: responsive.spacing(Theme.spacing.md, 20),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  featureIcon: {
    width: responsive.spacing(48, 56),
    height: responsive.spacing(48, 56),
    borderRadius: responsive.spacing(24, 28),
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsive.spacing(Theme.spacing.lg, 24),
  },
  
  featureIconText: {
    fontSize: responsive.fontSize(24, 28),
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: responsive.fontSize(18, 20),
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: responsive.spacing(Theme.spacing.xs, 8),
  },
  
  featureDescription: {
    fontSize: responsive.fontSize(14, 16),
    color: '#666666',
  },
  
  actionContainer: {
    paddingBottom: responsive.spacing(Theme.spacing.xxxl, 60),
  },
  
  primaryButton: {
    marginBottom: responsive.spacing(Theme.spacing.lg, 24),
    minHeight: deviceTypes.isAndroid ? 56 : 50,
  },
  
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#ffffff',
    minHeight: deviceTypes.isAndroid ? 56 : 50,
  },
});

export default WelcomeScreen;

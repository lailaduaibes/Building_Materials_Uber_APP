/**
 * Android-Compatible Welcome Screen
 * Simple, clean design that works well on Android devices
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SimpleSafeArea,
  SimpleCard,
  SimpleButton,
  SimpleText,
  platformStyles,
} from '../components/SimpleComponents';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const AndroidCompatibleWelcome: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
  onLogin,
}) => {
  return (
    <SimpleSafeArea>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏗️</Text>
            </View>
            <SimpleText variant="heading" style={styles.appName}>
              YouMats
            </SimpleText>
          </View>
          
          <SimpleText style={styles.tagline}>
            Building Materials Delivered
          </SimpleText>
          
          <SimpleText variant="heading" style={styles.mainTitle}>
            Professional Construction Materials
          </SimpleText>
          
          <SimpleText style={styles.subtitle}>
            Fast delivery • Quality materials • Trusted service
          </SimpleText>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <SimpleText variant="heading" style={styles.featuresTitle}>
            Why Choose YouMats?
          </SimpleText>
          
          <SimpleCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>🚚</Text>
              </View>
              <View style={styles.featureContent}>
                <SimpleText style={styles.featureTitle}>Fast Delivery</SimpleText>
                <SimpleText variant="caption" style={styles.featureDescription}>
                  Same-day delivery for urgent projects
                </SimpleText>
              </View>
            </View>
          </SimpleCard>

          <SimpleCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>📋</Text>
              </View>
              <View style={styles.featureContent}>
                <SimpleText style={styles.featureTitle}>Easy Ordering</SimpleText>
                <SimpleText variant="caption" style={styles.featureDescription}>
                  Quick search and order placement
                </SimpleText>
              </View>
            </View>
          </SimpleCard>

          <SimpleCard style={styles.featureCard}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>📍</Text>
              </View>
              <View style={styles.featureContent}>
                <SimpleText style={styles.featureTitle}>Real-Time Tracking</SimpleText>
                <SimpleText variant="caption" style={styles.featureDescription}>
                  Track your delivery every step of the way
                </SimpleText>
              </View>
            </View>
          </SimpleCard>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <SimpleButton
            title="Get Started"
            onPress={onGetStarted}
            style={styles.primaryButton}
          />
          
          <SimpleButton
            title="I already have an account"
            onPress={onLogin}
            style={styles.secondaryButton}
            textStyle={styles.secondaryButtonText}
          />
        </View>
        
        {/* Bottom padding for safe scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SimpleSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: platformStyles.colors.background,
  },
  
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 40,
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  
  logoCircle: {
    width: Platform.OS === 'android' ? 80 : 90,
    height: Platform.OS === 'android' ? 80 : 90,
    borderRadius: Platform.OS === 'android' ? 40 : 45,
    backgroundColor: platformStyles.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...platformStyles.shadow,
  },
  
  logoEmoji: {
    fontSize: Platform.OS === 'android' ? 40 : 45,
  },
  
  appName: {
    color: platformStyles.colors.primary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  
  tagline: {
    color: platformStyles.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontSize: Platform.OS === 'android' ? 16 : 18,
  },
  
  mainTitle: {
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    fontSize: Platform.OS === 'android' ? 22 : 24,
    lineHeight: Platform.OS === 'android' ? 28 : 30,
  },
  
  subtitle: {
    textAlign: 'center',
    color: platformStyles.colors.textSecondary,
    paddingHorizontal: 20,
    fontSize: Platform.OS === 'android' ? 14 : 16,
    lineHeight: Platform.OS === 'android' ? 20 : 22,
  },
  
  featuresSection: {
    paddingVertical: 32,
  },
  
  featuresTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: Platform.OS === 'android' ? 20 : 22,
  },
  
  featureCard: {
    marginBottom: 16,
    backgroundColor: platformStyles.colors.background,
  },
  
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  featureIcon: {
    width: Platform.OS === 'android' ? 50 : 56,
    height: Platform.OS === 'android' ? 50 : 56,
    borderRadius: Platform.OS === 'android' ? 25 : 28,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  
  featureEmoji: {
    fontSize: Platform.OS === 'android' ? 24 : 28,
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: Platform.OS === 'android' ? 16 : 18,
  },
  
  featureDescription: {
    color: platformStyles.colors.textSecondary,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  },
  
  buttonContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  
  primaryButton: {
    marginBottom: 16,
    paddingVertical: Platform.OS === 'android' ? 16 : 18,
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: platformStyles.colors.primary,
    paddingVertical: Platform.OS === 'android' ? 16 : 18,
  },
  
  secondaryButtonText: {
    color: platformStyles.colors.primary,
    fontWeight: '600',
  },
  
  bottomPadding: {
    height: Platform.OS === 'android' ? 60 : 80,
  },
});

export default AndroidCompatibleWelcome;

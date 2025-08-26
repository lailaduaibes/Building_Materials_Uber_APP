/**
 * UberStyleMainDashboard - Clean Main Interface
 * Matches Uber's home screen design with search and suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../AuthServiceSupabase';
import { Theme } from '../theme';

const { width } = Dimensions.get('window');

interface UberMainDashboardProps {
  onNavigateToLocation: () => void;
  onNavigateToProfile: () => void;
  onNavigateToActivity: () => void;
  onNavigateToServices: () => void;
  onNavigateToServiceType: (serviceType: string) => void;
  userName?: string;
}

const UberStyleMainDashboard: React.FC<UberMainDashboardProps> = ({
  onNavigateToLocation,
  onNavigateToProfile,
  onNavigateToActivity,
  onNavigateToServices,
  onNavigateToServiceType,
  userName = "User"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    loadProfilePhoto();
  }, []);

  const loadProfilePhoto = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user?.id) {
        const savedPhoto = await AsyncStorage.getItem(`profile_photo_${user.id}`);
        if (savedPhoto) {
          setProfilePhoto(savedPhoto);
        }
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  const handleNavigateToLocation = () => {
    console.log('🔄 Main search touched - navigating to location');
    onNavigateToLocation();
  };

  const handleNavigateToProfile = () => {
    console.log('👤 Profile button touched');
    onNavigateToProfile();
  };

  const handleNavigateToServices = () => {
    console.log('🛠️ Services button touched');
    onNavigateToServices();
  };

  const quickServices = [
    { 
      id: 'delivery', 
      title: 'Order History', 
      icon: 'history',
      description: 'View all your orders'
    },
    { 
      id: 'urgent', 
      title: 'New Order', 
      icon: 'add-circle',
      description: 'Place a new order'
    },
    { 
      id: 'bulk', 
      title: 'Track Order', 
      icon: 'local-shipping',
      description: 'Track active deliveries'
    },
    { 
      id: 'tripHistory', 
      title: 'Support', 
      icon: 'help',
      description: 'Get help & support'
    },
  ];

  // No mock locations - will show current location only when available

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>YouMats</Text>
          <TouchableOpacity onPress={handleNavigateToProfile} style={styles.profileButton}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <MaterialIcons name="account-circle" size={32} color={Theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Search Input */}
        <TouchableOpacity style={styles.searchContainer} onPress={handleNavigateToLocation}>
          <MaterialIcons name="search" size={20} color={Theme.colors.text.secondary} />
          <Text style={styles.searchPlaceholder}>Where to deliver?</Text>
        </TouchableOpacity>

        {/* Recent Locations section removed - showing only current location */}

        {/* Suggestions Section */}
        <View style={styles.suggestionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <TouchableOpacity onPress={handleNavigateToServices}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.servicesGrid}>
            {quickServices.map((service) => (
              <TouchableOpacity 
                key={service.id} 
                style={styles.serviceItem}
                onPress={() => onNavigateToServiceType(service.id)}
              >
                <View style={styles.serviceIcon}>
                  <MaterialIcons 
                    name={service.icon as any} 
                    size={24} 
                    color={Theme.colors.primary} 
                  />
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoSection}>
          <View style={styles.promoBanner}>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Fast material delivery</Text>
              <Text style={styles.promoSubtitle}>Professional construction materials delivered to your site</Text>
            </View>
            <View style={styles.promoIcon}>
              <MaterialIcons name="local-shipping" size={60} color="rgba(255,255,255,0.3)" />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <MaterialIcons name="home" size={24} color={Theme.colors.primary} />
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={onNavigateToServices}>
          <MaterialIcons name="apps" size={24} color={Theme.colors.text.secondary} />
          <Text style={styles.navText}>Services</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={onNavigateToActivity}>
          <MaterialIcons name="receipt" size={24} color={Theme.colors.text.secondary} />
          <Text style={styles.navText}>Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={onNavigateToProfile}>
          <MaterialIcons name="person" size={24} color={Theme.colors.text.secondary} />
          <Text style={styles.navText}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '500',
  },
  recentSection: {
    marginVertical: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  recentText: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 16,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  recentAddress: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  suggestionsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: 14,
    color: Theme.colors.primary,
    fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: (width - 48) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 12,
    color: Theme.colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  promoSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  promoBanner: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  promoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  promoIcon: {
    marginLeft: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border.light,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  navTextActive: {
    color: Theme.colors.primary,
    fontWeight: '500',
  },
});

export default UberStyleMainDashboard;

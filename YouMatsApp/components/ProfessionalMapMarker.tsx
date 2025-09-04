import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { PickupTimeDisplay } from './PickupTimeDisplay';

const { width: screenWidth } = Dimensions.get('window');

// Enhanced responsive calculations for Android compatibility
const getResponsiveMarkerValue = (small: number, medium: number = small * 1.1, large: number = small * 1.3) => {
  if (screenWidth < 360) return small * 0.85; // Very small Android phones
  if (screenWidth < 400) return small; // Standard Android phones
  if (screenWidth < 600) return medium; // Large phones/small tablets
  return large; // Tablets
};

interface ProfessionalMapMarkerProps {
  price: number;
  materialType?: string;
  isSelected?: boolean;
  isIncompatible?: boolean;
  isPriority?: boolean;
  pickupTimePreference?: 'asap' | 'scheduled';
  scheduledPickupTime?: string;
}

export const ProfessionalMapMarker: React.FC<ProfessionalMapMarkerProps> = ({
  price,
  materialType = 'GENERAL',
  isSelected = false,
  isIncompatible = false,
  isPriority = false,
  pickupTimePreference,
  scheduledPickupTime,
}) => {
  const getMarkerStyle = () => {
    if (isIncompatible) {
      return [styles.marker, styles.incompatibleMarker];
    }
    if (isSelected) {
      return [styles.marker, styles.selectedMarker];
    }
    if (isPriority) {
      return [styles.marker, styles.priorityMarker];
    }
    return styles.marker;
  };

  const getTextColor = () => {
    if (isSelected) return Colors.background.primary;
    if (isIncompatible) return Colors.status.cancelled;
    return Colors.text.primary;
  };

  const getSecondaryTextColor = () => {
    if (isSelected) return Colors.background.primary + 'DD';
    if (isIncompatible) return Colors.status.cancelled + 'BB';
    return Colors.text.secondary;
  };

  const getPointerStyle = () => {
    if (isIncompatible) {
      return [styles.pointer, { backgroundColor: Colors.status.cancelled }];
    }
    if (isSelected) {
      return [styles.pointer, { backgroundColor: Colors.background.primary }];
    }
    if (isPriority) {
      return [styles.pointer, { backgroundColor: '#FF6B35' }];
    }
    return [styles.pointer, { backgroundColor: Colors.primary }];
  };

  return (
    <View style={[styles.markerContainer, Platform.OS === 'android' && styles.androidMarkerContainer]}>
      <View style={getMarkerStyle()}>
        <View style={styles.content}>
          <Text style={[styles.priceText, { color: getTextColor() }]}>
            AED {price}
          </Text>
          <Text style={[styles.typeText, { color: getSecondaryTextColor() }]}>
            {isIncompatible ? '⚠️ INCOMPATIBLE' : materialType.toUpperCase()}
          </Text>
          {pickupTimePreference && (
            <PickupTimeDisplay 
              pickupTimePreference={pickupTimePreference}
              scheduledPickupTime={scheduledPickupTime}
              size="small"
              showIcon={false}
            />
          )}
          {isPriority && !isIncompatible && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>HOT</Text>
            </View>
          )}
        </View>
        <View style={getPointerStyle()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Ensure no clipping on Android
    ...Platform.select({
      android: {
        paddingTop: getResponsiveMarkerValue(4, 6, 8),
        paddingBottom: getResponsiveMarkerValue(12, 16, 20),
        paddingHorizontal: getResponsiveMarkerValue(4, 6, 8),
      },
    }),
  },
  androidMarkerContainer: {
    // Additional Android-specific container fixes
    overflow: 'visible',
    backgroundColor: 'transparent',
    // Prevent clipping of shadow/elevation
    marginTop: getResponsiveMarkerValue(8, 10, 12),
    marginBottom: getResponsiveMarkerValue(8, 10, 12),
    marginHorizontal: getResponsiveMarkerValue(8, 10, 12),
  },
  marker: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: getResponsiveMarkerValue(12, 16, 20),
    paddingVertical: getResponsiveMarkerValue(8, 12, 16),
    borderRadius: getResponsiveMarkerValue(12, 16, 20),
    borderWidth: getResponsiveMarkerValue(2, 2, 3),
    borderColor: Colors.primary,
    minWidth: getResponsiveMarkerValue(80, 100, 120),
    alignItems: 'center',
    // Android-specific fixes for marker visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: getResponsiveMarkerValue(4, 6, 8) },
        shadowOpacity: 0.15,
        shadowRadius: getResponsiveMarkerValue(8, 12, 16),
      },
      android: {
        elevation: getResponsiveMarkerValue(6, 8, 12),
        // Ensure marker is not clipped
        overflow: 'visible',
        // Fix for Android rendering issues
        backgroundColor: Colors.background.primary,
        borderColor: Colors.primary,
      },
    }),
  },
  selectedMarker: {
    backgroundColor: Colors.primary,
    borderColor: Colors.background.primary,
    borderWidth: getResponsiveMarkerValue(2, 3, 4),
    // Android scaling fix - use smaller scale to prevent clipping
    transform: [{ scale: Platform.OS === 'android' ? 1.1 : 1.2 }],
    ...Platform.select({
      ios: {
        shadowOpacity: 0.25,
        shadowRadius: getResponsiveMarkerValue(12, 16, 20),
      },
      android: {
        elevation: getResponsiveMarkerValue(10, 12, 16),
        // Additional Android fixes for selected state
        overflow: 'visible',
        // Ensure selected marker is fully visible
        marginTop: getResponsiveMarkerValue(2, 3, 4),
        marginBottom: getResponsiveMarkerValue(2, 3, 4),
      },
    }),
  },
  incompatibleMarker: {
    opacity: 0.75,
    borderColor: Colors.status.cancelled,
    backgroundColor: Colors.background.primary,
    borderWidth: getResponsiveMarkerValue(2, 2, 3),
  },
  priorityMarker: {
    borderColor: '#FF6B35',
    borderWidth: getResponsiveMarkerValue(2, 3, 4),
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B35',
        shadowOpacity: 0.3,
      },
      android: {
        elevation: getResponsiveMarkerValue(8, 10, 14),
      },
    }),
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  priceText: {
    fontSize: getResponsiveMarkerValue(13, 16, 19),
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: getResponsiveMarkerValue(16, 20, 24),
  },
  typeText: {
    fontSize: getResponsiveMarkerValue(8, 10, 12),
    fontWeight: '700',
    marginTop: getResponsiveMarkerValue(1, 2, 3),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: getResponsiveMarkerValue(10, 12, 15),
  },
  priorityBadge: {
    position: 'absolute',
    top: getResponsiveMarkerValue(-6, -8, -10),
    right: getResponsiveMarkerValue(-8, -12, -16),
    backgroundColor: '#FF6B35',
    borderRadius: getResponsiveMarkerValue(6, 8, 10),
    paddingHorizontal: getResponsiveMarkerValue(4, 6, 8),
    paddingVertical: getResponsiveMarkerValue(1, 2, 3),
    borderWidth: 1,
    borderColor: Colors.background.primary,
    minWidth: getResponsiveMarkerValue(24, 28, 32),
    alignItems: 'center',
  },
  priorityText: {
    fontSize: getResponsiveMarkerValue(7, 8, 10),
    fontWeight: '900',
    color: Colors.background.primary,
    letterSpacing: 0.5,
    lineHeight: getResponsiveMarkerValue(8, 10, 12),
  },
  pointer: {
    position: 'absolute',
    bottom: getResponsiveMarkerValue(-8, -10, -12),
    left: '50%',
    marginLeft: getResponsiveMarkerValue(-8, -10, -12),
    width: getResponsiveMarkerValue(16, 20, 24),
    height: getResponsiveMarkerValue(16, 20, 24),
    borderRadius: getResponsiveMarkerValue(2, 3, 4),
    transform: [{ rotate: '45deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: getResponsiveMarkerValue(4, 6, 8),
        // Android-specific fixes for pointer visibility
        overflow: 'visible',
        // Ensure pointer is properly rendered on Android
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
      },
    }),
  },
});

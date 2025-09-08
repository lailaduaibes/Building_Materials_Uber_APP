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
    <>
      {Platform.OS === 'android' ? (
        // Android: Simple professional marker icon
        <View style={styles.professionalMarkerContainer}>
          <View style={[
            styles.professionalMarker, 
            isSelected && styles.professionalMarkerSelected,
            isIncompatible && styles.professionalMarkerIncompatible,
            isPriority && styles.professionalMarkerPriority
          ]}>
            <Text style={styles.markerIcon}>
              {isIncompatible ? '⚠️' : isPriority ? '🔥' : '📦'}
            </Text>
          </View>
          {/* Professional pointer */}
          <View style={[
            styles.professionalPointer,
            isSelected && { backgroundColor: Colors.primary },
            isIncompatible && { backgroundColor: Colors.status.cancelled },
            isPriority && { backgroundColor: '#FF6B35' }
          ]} />
        </View>
      ) : (
        // iOS: Keep the complex design or use the same simple approach
        <View style={styles.professionalMarkerContainer}>
          <View style={[
            styles.professionalMarker, 
            isSelected && styles.professionalMarkerSelected,
            isIncompatible && styles.professionalMarkerIncompatible,
            isPriority && styles.professionalMarkerPriority
          ]}>
            <Text style={styles.markerIcon}>
              {isIncompatible ? '⚠️' : isPriority ? '🔥' : '📦'}
            </Text>
          </View>
          {/* Professional pointer */}
          <View style={[
            styles.professionalPointer,
            isSelected && { backgroundColor: Colors.primary },
            isIncompatible && { backgroundColor: Colors.status.cancelled },
            isPriority && { backgroundColor: '#FF6B35' }
          ]} />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Aggressive padding fix for Android clipping
    ...Platform.select({
      android: {
        paddingTop: getResponsiveMarkerValue(25, 30, 35),
        paddingBottom: getResponsiveMarkerValue(35, 40, 45),
        paddingHorizontal: getResponsiveMarkerValue(25, 30, 35),
        // Force container to be large enough
        minWidth: getResponsiveMarkerValue(140, 160, 180),
        minHeight: getResponsiveMarkerValue(120, 140, 160),
      },
      ios: {
        paddingTop: getResponsiveMarkerValue(4, 6, 8),
        paddingBottom: getResponsiveMarkerValue(12, 16, 20),
        paddingHorizontal: getResponsiveMarkerValue(4, 6, 8),
      },
    }),
  },
  androidMarkerContainer: {
    // Aggressive Android-specific container fixes
    overflow: 'visible',
    backgroundColor: 'transparent',
    // Much larger margins to completely prevent clipping
    marginTop: getResponsiveMarkerValue(30, 35, 40),
    marginBottom: getResponsiveMarkerValue(30, 35, 40),
    marginHorizontal: getResponsiveMarkerValue(30, 35, 40),
    // Force large container size
    width: getResponsiveMarkerValue(160, 180, 200),
    height: getResponsiveMarkerValue(140, 160, 180),
  },
  androidSelectedContainer: {
    // Even more space for selected markers on Android
    marginTop: getResponsiveMarkerValue(40, 45, 50),
    marginBottom: getResponsiveMarkerValue(40, 45, 50),
    marginHorizontal: getResponsiveMarkerValue(40, 45, 50),
    // Larger container for selected state
    width: getResponsiveMarkerValue(180, 200, 220),
    height: getResponsiveMarkerValue(160, 180, 200),
  },
  androidAbsoluteWrapper: {
    // Absolute wrapper to prevent any clipping issues
    position: 'relative',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    // Large enough to contain any marker
    width: getResponsiveMarkerValue(200, 220, 240),
    height: getResponsiveMarkerValue(180, 200, 220),
  },
  androidSelectedWrapper: {
    // Even larger wrapper for selected markers
    width: getResponsiveMarkerValue(240, 260, 280),
    height: getResponsiveMarkerValue(220, 240, 260),
  },
  // Simplified Android marker styles to prevent clipping
  androidSimpleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveMarkerValue(100, 120, 140),
    height: getResponsiveMarkerValue(60, 70, 80),
  },
  androidSimpleMarker: {
    backgroundColor: Colors.background.primary,
    borderRadius: getResponsiveMarkerValue(8, 10, 12),
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: getResponsiveMarkerValue(8, 10, 12),
    paddingVertical: getResponsiveMarkerValue(4, 6, 8),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: getResponsiveMarkerValue(70, 80, 90),
    // Simple shadow for Android
    elevation: 3,
  },
  androidSimpleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.background.primary,
    borderWidth: 3,
    elevation: 5,
  },
  androidPriceText: {
    fontSize: getResponsiveMarkerValue(12, 14, 16),
    fontWeight: '800',
    textAlign: 'center',
  },
  androidTypeText: {
    fontSize: getResponsiveMarkerValue(8, 9, 10),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  // Professional marker styles for both platforms
  professionalMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveMarkerValue(50, 55, 60),
    height: getResponsiveMarkerValue(70, 75, 80),
  },
  professionalMarker: {
    width: getResponsiveMarkerValue(40, 44, 48),
    height: getResponsiveMarkerValue(40, 44, 48),
    borderRadius: getResponsiveMarkerValue(20, 22, 24),
    backgroundColor: Colors.background.primary,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  professionalMarkerSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.background.primary,
    borderWidth: 4,
    transform: [{ scale: 1.15 }],
    ...Platform.select({
      ios: {
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  professionalMarkerIncompatible: {
    backgroundColor: Colors.background.primary,
    borderColor: Colors.status.cancelled,
    opacity: 0.8,
  },
  professionalMarkerPriority: {
    borderColor: '#FF6B35',
    borderWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B35',
        shadowOpacity: 0.3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  markerIcon: {
    fontSize: getResponsiveMarkerValue(16, 18, 20),
    textAlign: 'center',
  },
  professionalPointer: {
    position: 'absolute',
    bottom: getResponsiveMarkerValue(-6, -7, -8),
    left: '50%',
    marginLeft: getResponsiveMarkerValue(-6, -7, -8),
    width: getResponsiveMarkerValue(12, 14, 16),
    height: getResponsiveMarkerValue(12, 14, 16),
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
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
        elevation: getResponsiveMarkerValue(4, 6, 8), // Reduced elevation for better performance
        // Ensure marker is not clipped
        overflow: 'visible',
        // Force proper rendering on Android
        backgroundColor: Colors.background.primary,
        borderColor: Colors.primary,
        // Add subtle border to improve visibility
        borderWidth: getResponsiveMarkerValue(1.5, 2, 2.5),
      },
    }),
  },
  selectedMarker: {
    backgroundColor: Colors.primary,
    borderColor: Colors.background.primary,
    borderWidth: getResponsiveMarkerValue(2, 3, 4),
    // Disable scaling on Android to prevent clipping - use visual changes instead
    transform: Platform.OS === 'android' ? [] : [{ scale: 1.2 }],
    ...Platform.select({
      ios: {
        shadowOpacity: 0.25,
        shadowRadius: getResponsiveMarkerValue(12, 16, 20),
      },
      android: {
        elevation: getResponsiveMarkerValue(8, 10, 12),
        // Android fixes without scaling
        overflow: 'visible',
        backgroundColor: Colors.primary,
        borderColor: Colors.background.primary,
        // Make selected marker more prominent without scaling
        borderWidth: getResponsiveMarkerValue(3, 4, 5),
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
    bottom: getResponsiveMarkerValue(-10, -12, -15),
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
        elevation: getResponsiveMarkerValue(2, 3, 4),
        // Android-specific fixes for pointer visibility
        overflow: 'visible',
        // Ensure pointer is visible and properly positioned
        borderWidth: 0,
        backgroundColor: 'inherit',
      },
    }),
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { PickupTimeDisplay } from './PickupTimeDisplay';

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
  );
};

const styles = StyleSheet.create({
  marker: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  selectedMarker: {
    backgroundColor: Colors.primary,
    borderColor: Colors.background.primary,
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 15,
  },
  incompatibleMarker: {
    opacity: 0.75,
    borderColor: Colors.status.cancelled,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
  },
  priorityMarker: {
    borderColor: '#FF6B35',
    borderWidth: 3,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  priorityBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.background.primary,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: '900',
    color: Colors.background.primary,
    letterSpacing: 0.5,
  },
  pointer: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
});

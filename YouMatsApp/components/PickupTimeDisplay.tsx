import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface PickupTimeDisplayProps {
  pickupTimePreference: 'asap' | 'scheduled';
  scheduledPickupTime?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export const PickupTimeDisplay: React.FC<PickupTimeDisplayProps> = ({
  pickupTimePreference,
  scheduledPickupTime,
  size = 'medium',
  showIcon = true,
}) => {
  const formatScheduledTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
      return `${dateStr} at ${timeStr}`;
    }
  };

  const getTimeUrgency = () => {
    if (pickupTimePreference === 'asap') {
      return 'urgent';
    }
    
    if (!scheduledPickupTime) return 'normal';
    
    const scheduledDate = new Date(scheduledPickupTime);
    const now = new Date();
    const hoursUntilPickup = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilPickup < 2) return 'urgent';
    if (hoursUntilPickup < 24) return 'soon';
    return 'normal';
  };

  const urgency = getTimeUrgency();
  const { styles, colors, iconSize } = getStyles(size, urgency);

  const renderContent = () => {
    if (pickupTimePreference === 'asap') {
      return (
        <View style={styles.container}>
          {showIcon && (
            <Ionicons 
              name="flash" 
              size={iconSize} 
              color={colors.urgent} 
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: colors.urgent }]}>ASAP</Text>
        </View>
      );
    }

    if (!scheduledPickupTime) {
      return (
        <View style={styles.container}>
          {showIcon && (
            <Ionicons 
              name="time" 
              size={iconSize} 
              color={colors.normal} 
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: colors.normal }]}>Scheduled</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {showIcon && (
          <Ionicons 
            name="calendar" 
            size={iconSize} 
            color={colors.text} 
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, { color: colors.text }]}>
          {formatScheduledTime(scheduledPickupTime)}
        </Text>
      </View>
    );
  };

  return renderContent();
};

const getStyles = (size: 'small' | 'medium' | 'large', urgency: 'urgent' | 'soon' | 'normal') => {
  const sizeConfig = {
    small: { fontSize: 12, iconSize: 14, padding: 4 },
    medium: { fontSize: 14, iconSize: 16, padding: 6 },
    large: { fontSize: 16, iconSize: 18, padding: 8 },
  };

  const config = sizeConfig[size];
  
  const colors = {
    urgent: Colors.warning,
    soon: Colors.primary,
    normal: Colors.text.secondary,
    text: urgency === 'urgent' ? Colors.warning : 
          urgency === 'soon' ? Colors.primary : Colors.text.secondary,
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: config.padding,
      paddingVertical: config.padding / 2,
    },
    icon: {
      marginRight: 4,
    },
    text: {
      fontSize: config.fontSize,
      fontWeight: '600',
    },
  });

  return {
    styles,
    colors,
    iconSize: config.iconSize,
  };
};

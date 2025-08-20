/**
 * YouMats Card Component
 * Professional card with elevation and proper spacing
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Theme } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  onPress?: () => void;
  touchableProps?: Omit<TouchableOpacityProps, 'onPress' | 'style'>;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  elevated = false,
  onPress,
  touchableProps = {},
}) => {
  const cardStyle = elevated
    ? Theme.components.card.elevated
    : Theme.components.card.default;

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.8}
        {...touchableProps}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    // Base styles are applied from theme
  },
});

export default Card;

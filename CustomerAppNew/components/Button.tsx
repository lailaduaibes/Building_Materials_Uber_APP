/**
 * YouMats Button Component
 * Professional button with proper sizing and accessibility
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Theme } from '../theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle = disabled
      ? Theme.components.button.disabled
      : Theme.components.button[variant];

    const sizeStyle = getSizeStyle();

    return {
      ...baseStyle,
      ...sizeStyle,
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled || loading ? 0.6 : 1,
    };
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          minHeight: Theme.layout.button.heightSmall,
          paddingVertical: Theme.spacing.sm,
          paddingHorizontal: Theme.spacing.lg,
        };
      case 'large':
        return {
          minHeight: Theme.layout.button.heightLarge,
          paddingVertical: Theme.spacing.lg,
          paddingHorizontal: Theme.spacing.xxl,
        };
      default:
        return {
          minHeight: Theme.layout.button.height,
          paddingVertical: Theme.spacing.button.paddingVertical,
          paddingHorizontal: Theme.spacing.button.paddingHorizontal,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextColor = disabled
      ? Theme.colors.text.light
      : Theme.components.button[variant].color;

    const sizeTextStyle = getTextSizeStyle();

    return {
      ...Theme.typography.button,
      ...sizeTextStyle,
      color: baseTextColor,
      textAlign: 'center',
    };
  };

  const getTextSizeStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return Theme.typography.buttonSmall;
      case 'large':
        return Theme.typography.buttonLarge;
      default:
        return Theme.typography.button;
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={getTextStyle().color}
            style={styles.loader}
          />
        )}
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: Theme.spacing.sm,
  },
});

export default Button;

/**
 * Cross-Platform Component Library
 * React Native components following best practices for Android/iOS
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  Platform,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { CrossPlatformTheme } from '../theme/CrossPlatformTheme';

// Cross-platform touchable component
interface TouchableProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}

export const CrossPlatformTouchable: React.FC<TouchableProps> = ({
  children,
  onPress,
  style,
  disabled = false,
  testID,
}) => {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        background={TouchableNativeFeedback.Ripple('#00000020', false)}
      >
        <View style={[styles.touchableContainer, style]}>{children}</View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.touchableContainer, style]}
      disabled={disabled}
      testID={testID}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

// Cross-platform button component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const CrossPlatformButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  testID,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (variant === 'primary') baseStyle.push(styles.buttonPrimary);
    if (variant === 'secondary') baseStyle.push(styles.buttonSecondary);
    if (variant === 'text') baseStyle.push(styles.buttonText);
    
    if (size === 'small') baseStyle.push(styles.buttonSmall);
    if (size === 'large') baseStyle.push(styles.buttonLarge);
    
    if (disabled) baseStyle.push(styles.buttonDisabled);
    if (style) baseStyle.push(style);
    
    return baseStyle;
  };

  const getTextStyle = () => {
    if (variant === 'primary') return styles.buttonTextPrimary;
    if (variant === 'secondary') return styles.buttonTextSecondary;
    return styles.buttonTextDefault;
  };

  return (
    <CrossPlatformTouchable
      onPress={onPress}
      style={getButtonStyle()}
      disabled={disabled || loading}
      testID={testID}
    >
      <Text style={getTextStyle()}>{loading ? 'Loading...' : title}</Text>
    </CrossPlatformTouchable>
  );
};

// Cross-platform safe area wrapper
interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  statusBarStyle?: 'light-content' | 'dark-content';
  statusBarBackgroundColor?: string;
}

export const CrossPlatformSafeArea: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor = '#FFFFFF',
}) => {
  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackgroundColor}
        translucent={false}
      />
      <SafeAreaView style={[styles.safeArea, style]}>
        {children}
      </SafeAreaView>
    </>
  );
};

// Styles
const styles = StyleSheet.create({
  touchableContainer: {
    minHeight: CrossPlatformTheme.components.touchTarget.minHeight,
    minWidth: CrossPlatformTheme.components.touchTarget.minWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Button styles
  button: {
    height: CrossPlatformTheme.components.button.height,
    borderRadius: CrossPlatformTheme.components.button.borderRadius,
    paddingHorizontal: CrossPlatformTheme.components.button.paddingHorizontal,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  
  buttonPrimary: {
    backgroundColor: CrossPlatformTheme.colors.primary,
    ...CrossPlatformTheme.elevation.small,
  },
  
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CrossPlatformTheme.colors.primary,
  },
  
  buttonText: {
    backgroundColor: 'transparent',
  },
  
  buttonSmall: {
    height: 36,
    paddingHorizontal: 16,
  },
  
  buttonLarge: {
    height: 56,
    paddingHorizontal: 32,
  },
  
  buttonDisabled: {
    opacity: 0.5,
  },
  
  buttonTextPrimary: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  
  buttonTextSecondary: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: CrossPlatformTheme.colors.primary,
    textAlign: 'center',
  },
  
  buttonTextDefault: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    color: CrossPlatformTheme.colors.primary,
    textAlign: 'center',
  },
  
  // Safe area
  safeArea: {
    flex: 1,
    backgroundColor: CrossPlatformTheme.colors.background,
  },
});

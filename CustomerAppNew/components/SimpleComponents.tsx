/**
 * Simple Cross-Platform UI Components
 * Fixed for Android/iOS compatibility
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StatusBar,
  SafeAreaView,
} from 'react-native';

// Simple cross-platform styles
const platformStyles = {
  // Status bar height
  statusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44,
  
  // Colors
  colors: {
    primary: Platform.OS === 'android' ? '#1976D2' : '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: Platform.OS === 'android' ? '#5F6368' : '#8E8E93',
    border: Platform.OS === 'android' ? '#E0E0E0' : '#C6C6C8',
  },
  
  // Shadows
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  
  // Typography
  text: {
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
    fontSize: 16,
    color: '#000000',
  },
};

// Simple Button Component
interface SimpleButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        simpleStyles.button,
        disabled && simpleStyles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[simpleStyles.buttonText, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
};

// Simple Card Component
interface SimpleCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const SimpleCard: React.FC<SimpleCardProps> = ({
  children,
  style,
  onPress,
}) => {
  if (onPress) {
    return (
      <TouchableOpacity
        style={[simpleStyles.card, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[simpleStyles.card, style]}>{children}</View>;
};

// Simple Safe Area
interface SimpleSafeAreaProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SimpleSafeArea: React.FC<SimpleSafeAreaProps> = ({
  children,
  style,
}) => {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <SafeAreaView style={[simpleStyles.safeArea, style]}>
        {children}
      </SafeAreaView>
    </>
  );
};

// Simple Text Component
interface SimpleTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  variant?: 'heading' | 'body' | 'caption';
}

export const SimpleText: React.FC<SimpleTextProps> = ({
  children,
  style,
  variant = 'body',
}) => {
  const getTextStyle = () => {
    switch (variant) {
      case 'heading':
        return simpleStyles.textHeading;
      case 'caption':
        return simpleStyles.textCaption;
      default:
        return simpleStyles.textBody;
    }
  };

  return <Text style={[getTextStyle(), style]}>{children}</Text>;
};

// Styles
const simpleStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: platformStyles.colors.background,
    paddingTop: Platform.OS === 'android' ? platformStyles.statusBarHeight : 0,
  },
  
  button: {
    backgroundColor: platformStyles.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 12 : 16,
    borderRadius: Platform.OS === 'android' ? 8 : 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'android' ? 48 : 44,
    ...platformStyles.shadow,
  },
  
  buttonDisabled: {
    opacity: 0.5,
  },
  
  buttonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: Platform.OS === 'android' ? '500' : '600',
    fontFamily: platformStyles.text.fontFamily,
    textAlign: 'center',
  },
  
  card: {
    backgroundColor: platformStyles.colors.background,
    borderRadius: Platform.OS === 'android' ? 8 : 12,
    padding: Platform.OS === 'android' ? 16 : 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: platformStyles.colors.border,
    ...platformStyles.shadow,
  },
  
  textHeading: {
    fontSize: Platform.OS === 'android' ? 24 : 28,
    fontWeight: Platform.OS === 'android' ? '500' : '700',
    fontFamily: platformStyles.text.fontFamily,
    color: platformStyles.colors.text,
    lineHeight: Platform.OS === 'android' ? 32 : 34,
  },
  
  textBody: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: platformStyles.text.fontFamily,
    color: platformStyles.colors.text,
    lineHeight: Platform.OS === 'android' ? 24 : 22,
  },
  
  textCaption: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: platformStyles.text.fontFamily,
    color: platformStyles.colors.textSecondary,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
  },
});

export { platformStyles };

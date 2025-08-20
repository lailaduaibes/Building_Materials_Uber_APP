/**
 * React Native Cross-Platform Theme System
 * Following React Native best practices for Android/iOS compatibility
 */

import { Platform, Dimensions, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// Device detection
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

// Safe area calculations
const getStatusBarHeight = () => {
  if (isIOS) return 44; // iOS safe area
  return StatusBar.currentHeight || 24; // Android status bar
};

// Material Design 3 + iOS Human Interface Guidelines
export const CrossPlatformTheme = {
  // Colors following both Material Design and iOS guidelines
  colors: {
    // Primary palette
    primary: isAndroid ? '#1976D2' : '#007AFF', // Material Blue / iOS Blue
    primaryVariant: isAndroid ? '#1565C0' : '#0056CC',
    secondary: isAndroid ? '#03DAC6' : '#FF9500', // Material Teal / iOS Orange
    
    // Background colors
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceVariant: isAndroid ? '#F5F5F5' : '#F2F2F7',
    
    // Text colors
    onBackground: '#000000',
    onSurface: '#000000',
    onSurfaceVariant: isAndroid ? '#5F6368' : '#8E8E93',
    
    // Status colors
    success: isAndroid ? '#4CAF50' : '#34C759',
    warning: isAndroid ? '#FF9800' : '#FF9500',
    error: isAndroid ? '#F44336' : '#FF3B30',
    
    // Border colors
    outline: isAndroid ? '#E0E0E0' : '#C6C6C8',
    outlineVariant: isAndroid ? '#F5F5F5' : '#E5E5EA',
  },

  // Typography following platform conventions
  typography: {
    // Headings
    h1: {
      fontSize: isAndroid ? 28 : 32,
      fontWeight: isAndroid ? '500' : '700',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 36 : 38,
    },
    h2: {
      fontSize: isAndroid ? 24 : 28,
      fontWeight: isAndroid ? '500' : '600',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 32 : 34,
    },
    h3: {
      fontSize: isAndroid ? 20 : 22,
      fontWeight: isAndroid ? '500' : '600',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 28 : 28,
    },
    
    // Body text
    body1: {
      fontSize: 16,
      fontWeight: '400',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 24 : 22,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 20 : 20,
    },
    
    // Captions and labels
    caption: {
      fontSize: 12,
      fontWeight: '400',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      lineHeight: isAndroid ? 16 : 16,
    },
    button: {
      fontSize: isAndroid ? 14 : 16,
      fontWeight: isAndroid ? '500' : '600',
      fontFamily: isAndroid ? 'Roboto' : 'System',
      textTransform: isAndroid ? 'uppercase' : 'none',
    },
  },

  // Spacing following 8dp grid (Android) and 8pt grid (iOS)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    
    // Component-specific spacing
    screenPadding: isAndroid ? 16 : 20,
    cardPadding: isAndroid ? 16 : 20,
    buttonPadding: isAndroid ? 12 : 16,
  },

  // Elevation and shadows
  elevation: {
    none: {
      elevation: 0,
      shadowOpacity: 0,
    },
    small: isAndroid ? {
      elevation: 2,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    medium: isAndroid ? {
      elevation: 4,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    large: isAndroid ? {
      elevation: 8,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
  },

  // Border radius following platform conventions
  borderRadius: {
    none: 0,
    sm: isAndroid ? 4 : 6,
    md: isAndroid ? 8 : 10,
    lg: isAndroid ? 12 : 16,
    xl: isAndroid ? 16 : 20,
    full: 9999,
  },

  // Component dimensions
  components: {
    // Touch targets (minimum 48dp on Android, 44pt on iOS)
    touchTarget: {
      minHeight: isAndroid ? 48 : 44,
      minWidth: isAndroid ? 48 : 44,
    },
    
    // Buttons
    button: {
      height: isAndroid ? 48 : 50,
      borderRadius: isAndroid ? 8 : 10,
      paddingHorizontal: isAndroid ? 16 : 20,
    },
    
    // Input fields
    input: {
      height: isAndroid ? 56 : 50,
      borderRadius: isAndroid ? 4 : 8,
      paddingHorizontal: isAndroid ? 16 : 16,
    },
    
    // Cards
    card: {
      borderRadius: isAndroid ? 8 : 12,
      padding: isAndroid ? 16 : 20,
    },
  },

  // Layout constants
  layout: {
    statusBarHeight: getStatusBarHeight(),
    screenWidth: width,
    screenHeight: height,
    safeAreaTop: getStatusBarHeight(),
    bottomTabHeight: isAndroid ? 56 : 83, // Include safe area
  },
};

/**
 * Responsive Design Utilities
 * Provides consistent breakpoints and responsive helpers for tablets and phones
 */

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
export const breakpoints = {
  phone: 0,
  tablet: 768,
  largeTablet: 1024,
  desktop: 1200,
};

// Device type detection
export const deviceTypes = {
  isPhone: width < breakpoints.tablet,
  isTablet: width >= breakpoints.tablet && width < breakpoints.largeTablet,
  isLargeTablet: width >= breakpoints.largeTablet,
  isAndroid: Platform.OS === 'android',
  isIOS: Platform.OS === 'ios',
};

// Responsive sizing functions
export const responsive = {
  // Font sizes
  fontSize: (phoneSize: number, tabletSize?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return tabletSize || phoneSize * 1.2;
    }
    return phoneSize;
  },

  // Spacing
  spacing: (phoneSpacing: number, tabletSpacing?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return tabletSpacing || phoneSpacing * 1.5;
    }
    return phoneSpacing;
  },

  // Padding
  padding: (phoneValue: number, tabletValue?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return tabletValue || phoneValue * 1.5;
    }
    return phoneValue;
  },

  // Width with max constraints for tablets
  width: (phoneWidth: string | number, maxTabletWidth?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return maxTabletWidth || 600;
    }
    return phoneWidth;
  },

  // Touch target sizes
  touchTarget: () => ({
    minHeight: deviceTypes.isAndroid ? 48 : 44,
    minWidth: deviceTypes.isAndroid ? 48 : 44,
  }),

  // Platform-specific values
  platformValue: <T>(androidValue: T, iosValue: T) => {
    return Platform.OS === 'android' ? androidValue : iosValue;
  },
};

// Layout helpers
export const layout = {
  // Center content on tablets
  centerOnTablet: () => ({
    maxWidth: deviceTypes.isTablet || deviceTypes.isLargeTablet ? 600 : '100%',
    alignSelf: deviceTypes.isTablet || deviceTypes.isLargeTablet ? 'center' as const : 'stretch' as const,
  }),

  // Container padding
  containerPadding: () => ({
    paddingHorizontal: responsive.padding(20, 40),
  }),

  // Card padding
  cardPadding: () => ({
    padding: responsive.padding(16, 24),
  }),

  // Grid layout for tablets
  gridColumns: (phoneColumns: number, tabletColumns?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return tabletColumns || Math.min(phoneColumns * 2, 3);
    }
    return phoneColumns;
  },
};

// Typography scale
export const typography = {
  // Heading sizes
  h1: responsive.fontSize(32, 48),
  h2: responsive.fontSize(24, 36),
  h3: responsive.fontSize(20, 28),
  h4: responsive.fontSize(18, 24),
  
  // Body text
  body: responsive.fontSize(16, 18),
  bodySmall: responsive.fontSize(14, 16),
  
  // Caption and labels
  caption: responsive.fontSize(12, 14),
  label: responsive.fontSize(14, 16),
  
  // Button text
  button: responsive.fontSize(16, 18),
};

// Shadow helpers
export const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
  
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  
  large: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
};

// Export screen dimensions
export const screenDimensions = {
  width,
  height,
  isLandscape: width > height,
  isPortrait: height > width,
};

export default {
  breakpoints,
  deviceTypes,
  responsive,
  layout,
  typography,
  shadows,
  screenDimensions,
};

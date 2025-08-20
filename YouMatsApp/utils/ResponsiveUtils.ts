/**
 * Responsive Design Utilities for Driver App
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

  // Margin
  margin: (phoneValue: number, tabletValue?: number) => {
    if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
      return tabletValue || phoneValue * 1.5;
    }
    return phoneValue;
  },

  // Width/Height calculations
  width: (percentage: number) => {
    return (width * percentage) / 100;
  },

  height: (percentage: number) => {
    return (height * percentage) / 100;
  },

  // Scale based on screen size
  scale: (size: number) => {
    if (deviceTypes.isLargeTablet) {
      return size * 1.4;
    } else if (deviceTypes.isTablet) {
      return size * 1.2;
    }
    return size;
  },

  // Conditional layouts
  layout: {
    // Grid columns for different screen sizes
    getColumns: () => {
      if (deviceTypes.isLargeTablet) return 4;
      if (deviceTypes.isTablet) return 3;
      return 2;
    },

    // Container max width
    containerMaxWidth: () => {
      if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
        return 600;
      }
      return '100%';
    },

    // Flex direction for responsive layouts
    flexDirection: (phoneDirection: 'row' | 'column', tabletDirection?: 'row' | 'column') => {
      if (deviceTypes.isTablet || deviceTypes.isLargeTablet) {
        return tabletDirection || phoneDirection;
      }
      return phoneDirection;
    },
  },
};

// Typography scale for responsive text
export const typography = {
  // Headings
  h1: responsive.fontSize(32, 40),
  h2: responsive.fontSize(28, 34),
  h3: responsive.fontSize(24, 28),
  h4: responsive.fontSize(20, 24),
  h5: responsive.fontSize(18, 22),
  h6: responsive.fontSize(16, 20),

  // Body text
  body1: responsive.fontSize(16, 18),
  body2: responsive.fontSize(14, 16),
  caption: responsive.fontSize(12, 14),
  small: responsive.fontSize(10, 12),

  // Button text
  button: responsive.fontSize(16, 18),
  buttonLarge: responsive.fontSize(18, 20),
  buttonSmall: responsive.fontSize(14, 16),
};

// Common responsive styles
export const responsiveStyles = {
  // Container styles
  container: {
    flex: 1,
    paddingHorizontal: responsive.padding(16, 24),
    maxWidth: responsive.layout.containerMaxWidth(),
    alignSelf: (deviceTypes.isTablet || deviceTypes.isLargeTablet) ? 'center' : 'stretch',
  },

  // Section spacing
  section: {
    marginBottom: responsive.spacing(20, 30),
  },

  // Card styles
  card: {
    borderRadius: responsive.spacing(12, 16),
    padding: responsive.padding(16, 24),
    marginBottom: responsive.spacing(16, 20),
  },

  // Button styles
  button: {
    paddingHorizontal: responsive.padding(20, 30),
    paddingVertical: responsive.padding(12, 16),
    borderRadius: responsive.spacing(8, 10),
    minHeight: deviceTypes.isAndroid ? 48 : 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Input styles
  input: {
    paddingHorizontal: responsive.padding(16, 20),
    paddingVertical: responsive.padding(12, 16),
    borderRadius: responsive.spacing(8, 10),
    fontSize: responsive.fontSize(16, 18),
    minHeight: deviceTypes.isAndroid ? 48 : 44,
  },

  // Header styles
  header: {
    paddingHorizontal: responsive.padding(16, 24),
    paddingVertical: responsive.padding(12, 16),
    height: responsive.spacing(56, 64),
  },

  // Navigation styles
  tabBar: {
    height: responsive.spacing(60, 70),
    paddingHorizontal: responsive.padding(8, 16),
  },
};

// Utility functions
export const utils = {
  // Check if current orientation is landscape
  isLandscape: () => width > height,

  // Get safe padding for notched devices
  getSafePadding: () => {
    if (deviceTypes.isIOS) {
      return {
        paddingTop: 44,
        paddingBottom: 34,
      };
    }
    return {
      paddingTop: 24,
      paddingBottom: 16,
    };
  },

  // Get optimal number of columns for grid layouts
  getOptimalColumns: (itemWidth: number, spacing: number = 16) => {
    const availableWidth = width - (responsive.padding(32, 48)); // Account for container padding
    const columnsCount = Math.floor((availableWidth + spacing) / (itemWidth + spacing));
    return Math.max(1, columnsCount);
  },
};

export default {
  breakpoints,
  deviceTypes,
  responsive,
  typography,
  responsiveStyles,
  utils,
};

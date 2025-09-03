/**
 * Support Screen Responsive Utilities
 * Provides responsive calculations for the Support Screen components
 */

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Device categories for responsive design
export const getDeviceCategory = () => {
  if (screenWidth < 375) return 'small'; // iPhone SE, small Android
  if (screenWidth < 414) return 'medium'; // iPhone 12/13/14, most Android
  if (screenWidth < 768) return 'large'; // iPhone Pro Max, large Android
  return 'tablet'; // iPad, Android tablets
};

// Platform-specific minimum touch targets
export const getMinTouchTarget = () => {
  return Platform.OS === 'ios' ? 44 : 48; // iOS: 44pt, Android: 48dp
};

// Responsive spacing based on screen size
export const getResponsiveSpacing = () => {
  const deviceCategory = getDeviceCategory();
  
  return {
    xs: deviceCategory === 'small' ? 4 : deviceCategory === 'medium' ? 6 : 8,
    sm: deviceCategory === 'small' ? 8 : deviceCategory === 'medium' ? 12 : 16,
    md: deviceCategory === 'small' ? 12 : deviceCategory === 'medium' ? 16 : 20,
    lg: deviceCategory === 'small' ? 16 : deviceCategory === 'medium' ? 20 : 24,
    xl: deviceCategory === 'small' ? 20 : deviceCategory === 'medium' ? 24 : 32,
  };
};

// Responsive font sizes
export const getResponsiveFontSizes = () => {
  const deviceCategory = getDeviceCategory();
  
  return {
    xs: deviceCategory === 'small' ? 11 : deviceCategory === 'medium' ? 12 : 13,
    sm: deviceCategory === 'small' ? 13 : deviceCategory === 'medium' ? 14 : 15,
    md: deviceCategory === 'small' ? 15 : deviceCategory === 'medium' ? 16 : 17,
    lg: deviceCategory === 'small' ? 17 : deviceCategory === 'medium' ? 18 : 19,
    xl: deviceCategory === 'small' ? 19 : deviceCategory === 'medium' ? 20 : 22,
    xxl: deviceCategory === 'small' ? 22 : deviceCategory === 'medium' ? 24 : 26,
  };
};

// Calculate optimal button width for priority buttons
export const getPriorityButtonDimensions = () => {
  const spacing = getResponsiveSpacing();
  const minTouchTarget = getMinTouchTarget();
  
  // Calculate available width for 3 buttons with gaps
  const containerPadding = spacing.lg * 2; // Left and right padding of container
  const buttonGaps = spacing.sm * 2; // 2 gaps between 3 buttons (reduced gap)
  const availableWidth = screenWidth - containerPadding - buttonGaps;
  
  const buttonWidth = Math.floor(availableWidth / 3);
  // Make height responsive but ensure minimum touch target
  const buttonHeight = Math.max(minTouchTarget + 12, 65);
  
  return {
    width: buttonWidth,
    height: buttonHeight,
    gap: spacing.sm,
  };
};

// Calculate optimal category button layout
export const getCategoryButtonLayout = () => {
  const spacing = getResponsiveSpacing();
  const minTouchTarget = getMinTouchTarget();
  const deviceCategory = getDeviceCategory();
  
  // Determine buttons per row based on screen width (not device category)
  let buttonsPerRow = 2; // Default for most phones
  if (screenWidth >= 768) {
    buttonsPerRow = 3; // Tablets
  } else if (screenWidth >= 414) {
    buttonsPerRow = 2; // Large phones (iPhone Pro Max, etc.)
  } else if (screenWidth < 375) {
    buttonsPerRow = 1; // Very small phones
  }
  
  const containerPadding = spacing.lg * 2;
  const buttonGaps = spacing.sm * (buttonsPerRow - 1);
  const availableWidth = screenWidth - containerPadding - buttonGaps;
  
  const buttonWidth = Math.floor(availableWidth / buttonsPerRow);
  // Ensure proper height for text content
  const buttonHeight = Math.max(minTouchTarget + 8, 60);
  
  return {
    buttonsPerRow,
    buttonWidth,
    buttonHeight,
    gap: spacing.sm,
    rowGap: spacing.sm, // Gap between rows
  };
};

// Platform-specific shadow/elevation
export const getPlatformShadow = (elevation: number = 2) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: 'rgba(0, 0, 0, 0.1)',
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: 0.1 + (elevation * 0.05),
      shadowRadius: elevation + 1,
    };
  } else {
    return {
      elevation: elevation,
    };
  }
};

// Animation durations based on platform guidelines
export const getAnimationDurations = () => ({
  fast: Platform.OS === 'ios' ? 200 : 150,
  medium: Platform.OS === 'ios' ? 300 : 250,
  slow: Platform.OS === 'ios' ? 500 : 400,
});

export default {
  getDeviceCategory,
  getMinTouchTarget,
  getResponsiveSpacing,
  getResponsiveFontSizes,
  getPriorityButtonDimensions,
  getCategoryButtonLayout,
  getPlatformShadow,
  getAnimationDurations,
};

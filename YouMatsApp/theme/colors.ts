/**
 * YouMats Driver App Color System
 * Minimal white theme matching the customer app's clean design
 * Responsive design utilities for cross-platform compatibility
 */

import { Dimensions, PixelRatio } from 'react-native';

// Get device dimensions and pixel density for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIXEL_RATIO = PixelRatio.get();

// Device type detection
export const isTablet = SCREEN_WIDTH >= 768;
export const isLargeScreen = SCREEN_WIDTH >= 1024;

// Responsive scaling functions
export const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / 375; // iPhone 6/7/8 base
  const newSize = size * scale;
  
  if (isTablet) {
    return Math.max(size * 1.1, newSize);
  }
  
  return Math.max(size * 0.9, Math.min(newSize, size * 1.3));
};

export const scaleSpacing = (spacing: number): number => {
  if (isTablet) {
    return spacing * 1.5;
  }
  return spacing;
};

export const scaleIconSize = (size: number): number => {
  if (isTablet) {
    return size * 1.2;
  }
  return size;
};

export const Colors = {
  // Primary Brand Colors - Minimal Blue Theme (matching customer app)
  primary: '#1E3A8A',        // YouMats Professional Blue (for accents only)
  secondary: '#3B82F6',      // Bright Blue for subtle accents
  success: '#1D4ED8',        // Professional blue for confirmations (instead of green)
  warning: '#F59E0B',        // Amber for alerts
  error: '#6B7280',          // Professional gray for errors (instead of red)

  // Background Colors - Minimal White Theme
  background: {
    primary: '#FFFFFF',       // Clean White (main background)
    secondary: '#F8FAFC',     // Very Light Blue-Gray (subtle sections)
    card: '#FFFFFF',          // Pure White cards with shadow
    section: '#FFFFFF',       // White sections
    welcome: '#1E3A8A',       // YouMats Blue for welcome screen only
    overlay: 'rgba(255,255,255,0.95)', // Semi-transparent white overlays
  },

  // Text Colors - Minimal approach
  text: {
    primary: '#1F2937',       // Dark Gray for primary text (not blue)
    secondary: '#64748B',     // Blue-Gray for secondary text
    light: '#94A3B8',         // Light Blue-Gray for subtle text
    white: '#FFFFFF',         // On dark backgrounds
    onPrimary: '#FFFFFF',     // Text on primary color
    onSecondary: '#FFFFFF',   // Text on secondary color
    accent: '#1E3A8A',        // YouMats Blue for emphasis only
  },

  // Gradients - Minimal use
  gradients: {
    primary: ['#1E3A8A', '#3B82F6'],      // YouMats Blue gradient (welcome only)
    accent: ['#3B82F6', '#60A5FA'],       // Light Blue gradient (minimal use)
    welcome: ['#1E3A8A', '#2563EB'],      // Welcome screen gradient
    subtle: ['#F8FAFC', '#FFFFFF'],       // Very subtle gradient
  },

  // Interactive States - Minimal
  states: {
    pressed: '#F3F4F6',       // Light gray for pressed state
    disabled: '#E5E7EB',      // Light gray for disabled
    focus: '#E0E7FF',         // Very light blue for focus
    hover: '#F3F4F6',         // Light gray for hover
  },

  // Border Colors - Minimal
  border: {
    light: '#E5E7EB',         // Very light gray border
    medium: '#D1D5DB',        // Light gray border
    focus: '#3B82F6',         // Blue focus border (subtle)
    error: '#6B7280',         // Professional gray border for errors (instead of red)
  },

  // Shadows - Subtle
  shadow: {
    color: '#000000',
    opacity: 0.05,           // Very subtle shadows
  },

  // Status Colors - Professional blue theme
  status: {
    pending: '#F59E0B',       // Amber for pending
    assigned: '#3B82F6',      // Blue for assigned
    inProgress: '#2563EB',    // Darker blue for in progress
    completed: '#1D4ED8',     // Professional blue for completed (instead of green)
    cancelled: '#6B7280',     // Professional gray for cancelled (instead of red)
    matched: '#1D4ED8',       // Professional blue for matched (instead of green)
    in_transit: '#2563EB',    // Blue for in transit
    delivered: '#1D4ED8',     // Professional blue for delivered (instead of green)
  },

  // Driver App Specific Colors - Professional blue theme
  driver: {
    online: '#1D4ED8',        // Professional blue for online status (instead of green)
    offline: '#94A3B8',       // Light gray for offline status
    busy: '#F59E0B',          // Amber for busy status
    earnings: '#1D4ED8',      // Professional blue for earnings (instead of green)
    rating: '#F59E0B',        // Amber for rating stars
    cardBg: '#FFFFFF',        // Pure white card backgrounds
    iconBg: '#F8FAFC',        // Very light background for icons
  },
} as const;

export type ColorKey = keyof typeof Colors;

// Legacy theme object for backward compatibility - Updated to professional blue theme
export const theme = {
  primary: Colors.text.primary,        // Dark gray instead of blue for text
  secondary: Colors.text.secondary,
  accent: Colors.primary,              // Blue only for accents
  background: Colors.background.primary, // Pure white
  white: Colors.text.white,
  text: Colors.text.primary,           // Dark gray text
  lightText: Colors.text.light,
  success: Colors.status.completed,    // Professional blue instead of green
  warning: Colors.warning,
  error: Colors.status.cancelled,      // Professional gray instead of red
  border: Colors.border.light,
};

// Utility function to get gradient string for React Native
export const getGradient = (gradientName: 'primary' | 'accent' | 'welcome' | 'subtle') => {
  return Colors.gradients[gradientName];
};

// Utility function for consistent styling
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return Colors.status.pending;
    case 'assigned':
    case 'matched':
      return Colors.status.assigned;
    case 'in_progress':
    case 'in_transit':
      return Colors.status.inProgress;
    case 'completed':
    case 'delivered':
      return Colors.status.completed;
    case 'cancelled':
      return Colors.status.cancelled;
    default:
      return Colors.text.secondary;
  }
};

// Responsive spacing system
export const Spacing = {
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(16),
  lg: scaleSpacing(24),
  xl: scaleSpacing(32),
  xxl: scaleSpacing(48),
} as const;

// Responsive typography scale
export const Typography = {
  h1: scaleFont(32),
  h2: scaleFont(28),
  h3: scaleFont(24),
  h4: scaleFont(20),
  body: scaleFont(16),
  bodySmall: scaleFont(14),
  caption: scaleFont(12),
  button: scaleFont(16),
} as const;

// Responsive component sizes
export const ComponentSizes = {
  buttonHeight: isTablet ? 56 : 48,
  inputHeight: isTablet ? 52 : 44,
  iconSize: {
    small: scaleIconSize(16),
    medium: scaleIconSize(24),
    large: scaleIconSize(32),
  },
  borderRadius: {
    small: 6,
    medium: 12,
    large: 16,
  },
} as const;

// Utility functions for common styling patterns
export const createShadow = (elevation: 'small' | 'medium' | 'large') => ({
  shadowColor: Colors.shadow.color,
  shadowOffset: {
    width: 0,
    height: elevation === 'small' ? 1 : elevation === 'medium' ? 2 : 4,
  },
  shadowOpacity: Colors.shadow.opacity,
  shadowRadius: elevation === 'small' ? 2 : elevation === 'medium' ? 4 : 8,
  elevation: elevation === 'small' ? 2 : elevation === 'medium' ? 4 : 8,
});

export const createButtonStyle = (variant: 'primary' | 'secondary' | 'outline') => ({
  height: ComponentSizes.buttonHeight,
  borderRadius: ComponentSizes.borderRadius.medium,
  paddingHorizontal: Spacing.lg,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  ...(variant === 'primary' && {
    backgroundColor: Colors.primary,
  }),
  ...(variant === 'secondary' && {
    backgroundColor: Colors.background.secondary,
  }),
  ...(variant === 'outline' && {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border.medium,
  }),
  ...createShadow('small'),
});

export const createInputStyle = () => ({
  height: ComponentSizes.inputHeight,
  borderRadius: ComponentSizes.borderRadius.small,
  borderWidth: 1,
  borderColor: Colors.border.light,
  backgroundColor: Colors.background.primary,
  paddingHorizontal: Spacing.md,
  fontSize: Typography.body,
  color: Colors.text.primary,
});

/**
 * YouMats App Color System
 * Professional construction industry brand colors
 */

export const Colors = {
  // Primary Brand Colors
  primary: '#1B365D',        // Deep Professional Blue
  secondary: '#FF6B35',      // Construction Orange
  success: '#27AE60',        // Green for confirmations
  warning: '#F39C12',        // Amber for alerts
  error: '#E74C3C',          // Red for errors

  // Background Colors
  background: {
    primary: '#FFFFFF',       // White
    secondary: '#F8F9FA',     // Light Gray
    card: '#FFFFFF',          // Card background with shadow
    section: '#ECF0F1',       // Very Light Gray
  },

  // Text Colors
  text: {
    primary: '#2C3E50',       // Dark Blue-Gray
    secondary: '#6C757D',     // Medium Gray
    light: '#ADB5BD',         // Light Gray
    white: '#FFFFFF',         // On dark backgrounds
    onPrimary: '#FFFFFF',     // Text on primary color
    onSecondary: '#FFFFFF',   // Text on secondary color
  },

  // Gradients
  gradients: {
    primary: ['#1B365D', '#2C5282'],      // Blue gradient
    accent: ['#FF6B35', '#FF8C42'],       // Orange gradient
  },

  // Interactive States
  states: {
    pressed: '#0F2A47',       // Darker blue for pressed state
    disabled: '#E9ECEF',      // Light gray for disabled
    focus: '#3B82F6',         // Focus blue
    hover: '#2563EB',         // Hover blue
  },

  // Border Colors
  border: {
    light: '#E9ECEF',         // Light border
    medium: '#DEE2E6',        // Medium border
    focus: '#3B82F6',         // Focus border
    error: '#E74C3C',         // Error border
  },

  // Shadows
  shadow: {
    color: '#000000',
    opacity: 0.1,
  },

  // Status Colors
  status: {
    pending: '#F39C12',       // Orange for pending
    inProgress: '#3498DB',    // Blue for in progress
    completed: '#27AE60',     // Green for completed
    cancelled: '#E74C3C',     // Red for cancelled
  },
} as const;

export type ColorKey = keyof typeof Colors;

// Utility function to get gradient string for React Native
export const getGradient = (gradientName: 'primary' | 'accent') => {
  return Colors.gradients[gradientName];
};

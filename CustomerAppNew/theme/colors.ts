/**
 * YouMats App Color System
 * Professional construction industry brand colors
 */

export const Colors = {
  // Primary Brand Colors - Updated to YouMats Blue Theme
  primary: '#1E3A8A',        // YouMats Professional Blue (from logo)
  secondary: '#3B82F6',      // Bright Blue for accents
  success: '#10B981',        // Green for confirmations
  warning: '#F59E0B',        // Amber for alerts
  error: '#EF4444',          // Red for errors

  // Background Colors
  background: {
    primary: '#FFFFFF',       // White
    secondary: '#F8FAFC',     // Very Light Blue-Gray
    card: '#FFFFFF',          // Card background with shadow
    section: '#EFF6FF',       // Very Light Blue
  },

  // Text Colors
  text: {
    primary: '#1E3A8A',       // YouMats Blue for primary text
    secondary: '#64748B',     // Blue-Gray for secondary text
    light: '#94A3B8',         // Light Blue-Gray
    white: '#FFFFFF',         // On dark backgrounds
    onPrimary: '#FFFFFF',     // Text on primary color
    onSecondary: '#FFFFFF',   // Text on secondary color
  },

  // Gradients - Updated to Blue theme
  gradients: {
    primary: ['#1E3A8A', '#3B82F6'],      // YouMats Blue gradient
    accent: ['#3B82F6', '#60A5FA'],       // Light Blue gradient
  },

  // Interactive States
  states: {
    pressed: '#1E40AF',       // Darker blue for pressed state
    disabled: '#E2E8F0',      // Light gray for disabled
    focus: '#3B82F6',         // Focus blue
    hover: '#2563EB',         // Hover blue
  },

  // Border Colors
  border: {
    light: '#E2E8F0',         // Light blue-gray border
    medium: '#CBD5E1',        // Medium blue-gray border
    focus: '#3B82F6',         // Focus border
    error: '#EF4444',         // Error border
  },

  // Shadows
  shadow: {
    color: '#000000',
    opacity: 0.1,
  },

  // Status Colors - Updated for Blue theme
  status: {
    pending: '#F59E0B',       // Amber for pending
    inProgress: '#3B82F6',    // YouMats Blue for in progress
    completed: '#10B981',     // Green for completed
    cancelled: '#EF4444',     // Red for cancelled
  },
} as const;

export type ColorKey = keyof typeof Colors;

// Utility function to get gradient string for React Native
export const getGradient = (gradientName: 'primary' | 'accent') => {
  return Colors.gradients[gradientName];
};

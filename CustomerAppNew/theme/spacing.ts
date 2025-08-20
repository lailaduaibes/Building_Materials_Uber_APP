/**
 * YouMats App Spacing System
 * Consistent spacing values for layouts
 */

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,

  // Standard spacing values
  xs: 4,    // Extra small
  sm: 8,    // Small
  md: 12,   // Medium
  lg: 16,   // Large
  xl: 20,   // Extra large
  xxl: 24,  // Extra extra large
  xxxl: 32, // Extra extra extra large

  // Semantic spacing
  padding: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  margin: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Component-specific spacing
  screen: {
    horizontal: 16,  // Standard screen padding
    vertical: 20,    // Standard screen padding
  },

  card: {
    padding: 16,     // Internal card padding
    margin: 12,      // Space between cards
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginVertical: 8,
  },

  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },

  // Touch targets (minimum 44px)
  touchTarget: {
    minimum: 44,
  },
} as const;

/**
 * Border radius values for consistent rounded corners
 */
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,    // Standard button radius
  lg: 12,   // Card radius
  xl: 16,
  xxl: 20,
  full: 999, // Fully rounded (pills)
} as const;

/**
 * Shadow/Elevation values for depth
 */
export const Elevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  // 1dp elevation
  small: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1,
    elevation: 1,
  },

  // 2dp elevation (cards)
  medium: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // 4dp elevation (buttons)
  large: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },

  // 8dp elevation (modals, popups)
  xlarge: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

/**
 * Layout dimensions
 */
export const Layout = {
  // Screen dimensions (will be set dynamically)
  screen: {
    width: 0,
    height: 0,
  },

  // Header heights
  header: {
    height: 56,
    heightLarge: 64,
  },

  // Tab bar height
  tabBar: {
    height: 60,
  },

  // Container dimensions
  container: {
    maxWidth: 480, // Maximum width for tablet layouts
  },

  // Input heights
  input: {
    height: 48,    // Standard input height (minimum 44px + padding)
    heightSmall: 40,
    heightLarge: 56,
  },

  // Button heights
  button: {
    height: 48,    // Standard button height (minimum 44px + padding)
    heightSmall: 40,
    heightLarge: 56,
  },
} as const;

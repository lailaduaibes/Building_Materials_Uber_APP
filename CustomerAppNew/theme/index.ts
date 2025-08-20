/**
 * YouMats App Theme
 * Complete theme system combining colors, typography, and spacing
 */

import { Colors } from './colors';
import { Typography } from './typography';
import { Spacing, BorderRadius, Elevation, Layout } from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  elevation: Elevation,
  layout: Layout,

  // Component-specific theme values
  components: {
    button: {
      primary: {
        backgroundColor: Colors.primary,
        color: Colors.text.onPrimary,
        borderRadius: BorderRadius.md,
        ...Elevation.medium,
        minHeight: Layout.button.height,
        paddingVertical: Spacing.button.paddingVertical,
        paddingHorizontal: Spacing.button.paddingHorizontal,
      },
      secondary: {
        backgroundColor: Colors.background.primary,
        color: Colors.primary,
        borderColor: Colors.primary,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        ...Elevation.small,
        minHeight: Layout.button.height,
        paddingVertical: Spacing.button.paddingVertical,
        paddingHorizontal: Spacing.button.paddingHorizontal,
      },
      accent: {
        backgroundColor: Colors.secondary,
        color: Colors.text.onSecondary,
        borderRadius: BorderRadius.md,
        ...Elevation.medium,
        minHeight: Layout.button.height,
        paddingVertical: Spacing.button.paddingVertical,
        paddingHorizontal: Spacing.button.paddingHorizontal,
      },
      danger: {
        backgroundColor: Colors.error,
        color: Colors.text.white,
        borderRadius: BorderRadius.md,
        ...Elevation.medium,
        minHeight: Layout.button.height,
        paddingVertical: Spacing.button.paddingVertical,
        paddingHorizontal: Spacing.button.paddingHorizontal,
      },
      disabled: {
        backgroundColor: Colors.states.disabled,
        color: Colors.text.light,
        borderRadius: BorderRadius.md,
        ...Elevation.none,
        minHeight: Layout.button.height,
        paddingVertical: Spacing.button.paddingVertical,
        paddingHorizontal: Spacing.button.paddingHorizontal,
      },
    },

    input: {
      default: {
        backgroundColor: Colors.background.primary,
        borderColor: Colors.border.medium,
        borderWidth: 1,
        borderRadius: BorderRadius.md,
        color: Colors.text.primary,
        minHeight: Layout.input.height,
        paddingVertical: Spacing.input.paddingVertical,
        paddingHorizontal: Spacing.input.paddingHorizontal,
      },
      focused: {
        borderColor: Colors.border.focus,
        borderWidth: 2,
      },
      error: {
        borderColor: Colors.border.error,
        borderWidth: 1,
      },
    },

    card: {
      default: {
        backgroundColor: Colors.background.card,
        borderRadius: BorderRadius.lg,
        ...Elevation.medium,
        padding: Spacing.card.padding,
        margin: Spacing.card.margin,
      },
      elevated: {
        backgroundColor: Colors.background.card,
        borderRadius: BorderRadius.lg,
        ...Elevation.large,
        padding: Spacing.card.padding,
        margin: Spacing.card.margin,
      },
    },

    screen: {
      default: {
        backgroundColor: Colors.background.primary,
        flex: 1,
        paddingHorizontal: Spacing.screen.horizontal,
        paddingVertical: Spacing.screen.vertical,
      },
      secondary: {
        backgroundColor: Colors.background.secondary,
        flex: 1,
        paddingHorizontal: Spacing.screen.horizontal,
        paddingVertical: Spacing.screen.vertical,
      },
    },

    navigation: {
      tabBar: {
        backgroundColor: Colors.background.primary,
        borderTopColor: Colors.border.light,
        borderTopWidth: 1,
        height: Layout.tabBar.height,
        ...Elevation.medium,
      },
      header: {
        backgroundColor: Colors.primary,
        height: Layout.header.height,
        ...Elevation.medium,
      },
    },
  },
} as const;

export default Theme;

// Export individual theme parts for convenience
export { Colors, Typography, Spacing, BorderRadius, Elevation, Layout };

// Type definitions
export type ThemeType = typeof Theme;
export type ComponentTheme = typeof Theme.components;

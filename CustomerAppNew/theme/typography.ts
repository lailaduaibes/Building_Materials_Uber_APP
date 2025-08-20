/**
 * YouMats App Typography System
 * Professional and readable typography for construction industry
 */

import { Platform } from 'react-native';

// Font families with fallbacks
const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
  light: Platform.select({
    ios: 'System',
    android: 'Roboto-Light',
    default: 'System',
  }),
};

export const Typography = {
  // Headlines
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  h4: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  h5: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  h6: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },

  // Body text
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  body2: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  body3: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
  },

  // Interactive elements
  button: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  buttonSmall: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  buttonLarge: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500' as const,
  },

  // Form elements
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
  placeholder: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },

  // Navigation
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  navTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500' as const,
  },

  // Special elements
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.5,
  },
  code: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },

  // Price displays
  price: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  priceSmall: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
} as const;

export type TypographyKey = keyof typeof Typography;

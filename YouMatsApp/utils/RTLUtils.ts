/**
 * RTL (Right-to-Left) Utilities for Professional App Layout
 * Handles selective RTL behavior like Uber, WhatsApp, and other professional apps
 */

import { I18nManager, Platform } from 'react-native';
import { RTL_LANGUAGES } from '../src/i18n';

/**
 * Professional RTL handling rules:
 * 1. Text and reading order: Always follow RTL
 * 2. UI elements that should flip: Back buttons, navigation, text alignment
 * 3. UI elements that should NOT flip: Icons, logos, images, maps, numbers
 * 4. Time/dates: Keep LTR format
 * 5. Technical elements: Phone numbers, URLs, code - always LTR
 */

export interface RTLConfig {
  // Text and content
  textAlign: 'left' | 'right' | 'center';
  flexDirection: 'row' | 'row-reverse';
  
  // Layout positioning
  alignSelf: 'flex-start' | 'flex-end';
  marginLeft: number;
  marginRight: number;
  paddingLeft: number;
  paddingRight: number;
  
  // Specific element behavior
  shouldFlip: boolean;
  iconDirection: 'ltr' | 'rtl' | 'neutral';
}

class RTLUtils {
  /**
   * Check if current language is RTL
   */
  static isRTL(): boolean {
    return I18nManager.isRTL;
  }

  /**
   * Get text alignment based on RTL
   */
  static getTextAlign(override?: 'left' | 'right' | 'center'): 'left' | 'right' | 'center' {
    if (override) return override;
    return RTLUtils.isRTL() ? 'right' : 'left';
  }

  /**
   * Get flex direction for layouts that should respect RTL
   */
  static getFlexDirection(shouldFlip: boolean = true): 'row' | 'row-reverse' {
    if (!shouldFlip) return 'row';
    return RTLUtils.isRTL() ? 'row-reverse' : 'row';
  }

  /**
   * Get margin/padding values with RTL awareness
   * Professional apps: Logical properties (start/end) instead of left/right
   */
  static getSpacing(startValue: number, endValue?: number) {
    const end = endValue ?? startValue;
    
    if (RTLUtils.isRTL()) {
      return {
        marginLeft: end,
        marginRight: startValue,
        paddingLeft: end,
        paddingRight: startValue,
      };
    }
    
    return {
      marginLeft: startValue,
      marginRight: end,
      paddingLeft: startValue,
      paddingRight: end,
    };
  }

  /**
   * Transform style object to handle RTL
   */
  static transformStyle(style: any, config?: Partial<RTLConfig>) {
    const isRTL = RTLUtils.isRTL();
    const transformed = { ...style };

    // Handle text alignment
    if (style.textAlign === 'left' || style.textAlign === 'right') {
      if (config?.shouldFlip !== false) {
        transformed.textAlign = isRTL ? 
          (style.textAlign === 'left' ? 'right' : 'left') : 
          style.textAlign;
      }
    }

    // Handle flex direction
    if (style.flexDirection === 'row') {
      if (config?.shouldFlip !== false) {
        transformed.flexDirection = isRTL ? 'row-reverse' : 'row';
      }
    }

    // Handle logical properties
    if (style.marginStart !== undefined) {
      const spacing = RTLUtils.getSpacing(style.marginStart, style.marginEnd);
      transformed.marginLeft = spacing.marginLeft;
      transformed.marginRight = spacing.marginRight;
      delete transformed.marginStart;
      delete transformed.marginEnd;
    }

    if (style.paddingStart !== undefined) {
      const spacing = RTLUtils.getSpacing(style.paddingStart, style.paddingEnd);
      transformed.paddingLeft = spacing.paddingLeft;
      transformed.paddingRight = spacing.paddingRight;
      delete transformed.paddingStart;
      delete transformed.paddingEnd;
    }

    return transformed;
  }

  /**
   * Professional icon handling
   * Icons that should never flip: logos, technical icons, universal symbols
   * Icons that should flip: directional arrows, back buttons
   */
  static getIconStyle(iconType: 'directional' | 'neutral' | 'logo' = 'neutral') {
    const isRTL = RTLUtils.isRTL();
    
    switch (iconType) {
      case 'directional':
        return {
          transform: [{ scaleX: isRTL ? -1 : 1 }]
        };
      case 'logo':
      case 'neutral':
      default:
        return {
          transform: [{ scaleX: 1 }] // Never flip
        };
    }
  }

  /**
   * Professional navigation handling
   * Back buttons and navigation should respect RTL
   */
  static getNavigationStyle() {
    return {
      flexDirection: RTLUtils.getFlexDirection(true),
      textAlign: RTLUtils.getTextAlign(),
    };
  }

  /**
   * Professional form field handling
   * Input fields should align with reading direction
   */
  static getFormFieldStyle(forceDirection?: 'ltr' | 'rtl') {
    if (forceDirection) {
      return {
        textAlign: forceDirection === 'rtl' ? 'right' : 'left',
        writingDirection: forceDirection,
      };
    }

    return {
      textAlign: RTLUtils.getTextAlign(),
      writingDirection: RTLUtils.isRTL() ? 'rtl' : 'ltr',
    };
  }

  /**
   * Professional list item handling
   * List items should flip layout but preserve certain elements
   */
  static getListItemStyle(preserveImageOrder: boolean = true) {
    const isRTL = RTLUtils.isRTL();
    
    return {
      container: {
        flexDirection: RTLUtils.getFlexDirection(true),
      },
      content: {
        textAlign: RTLUtils.getTextAlign(),
        flex: 1,
      },
      image: {
        // Images typically don't flip order in professional apps
        order: preserveImageOrder ? 0 : (isRTL ? 1 : 0),
      },
      action: {
        // Action buttons follow RTL
        alignSelf: isRTL ? 'flex-start' : 'flex-end',
      }
    };
  }

  /**
   * Professional modal/overlay handling
   * Modals should respect RTL for content but maintain certain UI consistency
   */
  static getModalStyle() {
    return {
      content: {
        textAlign: RTLUtils.getTextAlign(),
      },
      header: {
        flexDirection: RTLUtils.getFlexDirection(true),
      },
      // Close button always top-right in most professional apps
      closeButton: {
        position: 'absolute' as const,
        top: 16,
        right: 16, // Always right, regardless of RTL
      }
    };
  }

  /**
   * Professional number and technical data handling
   * Phone numbers, prices, IDs should always be LTR
   */
  static getTechnicalTextStyle() {
    return {
      textAlign: 'left', // Always LTR for technical data
      writingDirection: 'ltr',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace for consistency
    };
  }

  /**
   * Professional time/date handling
   * Time format usually stays LTR even in RTL languages
   */
  static getTimeStyle() {
    return {
      textAlign: 'left', // Times are typically LTR
      writingDirection: 'ltr',
    };
  }

  /**
   * Map and geographic content handling
   * Maps and geographic elements should not flip
   */
  static getMapStyle() {
    return {
      transform: [{ scaleX: 1 }], // Never flip maps
      direction: 'ltr', // Geographic content is always LTR
    };
  }
}

/**
 * Helper hook-like function for components
 */
export const useRTL = () => {
  return {
    isRTL: RTLUtils.isRTL(),
    getTextAlign: RTLUtils.getTextAlign,
    getFlexDirection: RTLUtils.getFlexDirection,
    getSpacing: RTLUtils.getSpacing,
    transformStyle: RTLUtils.transformStyle,
    getIconStyle: RTLUtils.getIconStyle,
    getNavigationStyle: RTLUtils.getNavigationStyle,
    getFormFieldStyle: RTLUtils.getFormFieldStyle,
    getListItemStyle: RTLUtils.getListItemStyle,
    getModalStyle: RTLUtils.getModalStyle,
    getTechnicalTextStyle: RTLUtils.getTechnicalTextStyle,
    getTimeStyle: RTLUtils.getTimeStyle,
    getMapStyle: RTLUtils.getMapStyle,
  };
};

export default RTLUtils;

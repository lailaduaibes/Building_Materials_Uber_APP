/**
 * Platform-specific styling utilities for Android & iOS compatibility
 * Fixes common React Native cross-platform UI issues
 */

import { Platform, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Android-specific fixes
export const PlatformStyles = {
  // Safe area handling for both platforms
  safeArea: {
    ...Platform.select({
      ios: {
        paddingTop: 44, // iOS status bar + notch
      },
      android: {
        paddingTop: StatusBar.currentHeight || 24,
      },
    }),
  },

  // Status bar configuration
  statusBar: {
    ...Platform.select({
      ios: {
        barStyle: 'dark-content' as const,
        backgroundColor: 'transparent',
      },
      android: {
        barStyle: 'dark-content' as const,
        backgroundColor: '#FFFFFF',
      },
    }),
  },

  // Container styles that work on both platforms
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      android: {
        // Android-specific container fixes
        elevation: 0,
      },
    }),
  },

  // Card styles with platform-appropriate shadows
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Button styles that work well on both platforms
  button: {
    primary: {
      backgroundColor: '#000000',
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48, // Android touch target
      ...Platform.select({
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
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 48,
    },
  },

  // Input styles for both platforms
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E7',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  // Text styles that render consistently
  text: {
    primary: {
      fontSize: 16,
      color: '#000000',
      ...Platform.select({
        ios: {
          fontFamily: 'System',
        },
        android: {
          fontFamily: 'Roboto',
        },
      }),
    },
    secondary: {
      fontSize: 14,
      color: '#8E8E93',
      ...Platform.select({
        ios: {
          fontFamily: 'System',
        },
        android: {
          fontFamily: 'Roboto',
        },
      }),
    },
    heading: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#000000',
      ...Platform.select({
        ios: {
          fontFamily: 'System',
        },
        android: {
          fontFamily: 'Roboto',
        },
      }),
    },
  },

  // Touchable opacity settings
  touchable: {
    activeOpacity: 0.7,
    ...Platform.select({
      android: {
        // Android ripple effect
        background: {
          type: 'selectableItemBackground',
        },
      },
    }),
  },

  // Modal styles for both platforms
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Platform.select({
      android: {
        paddingTop: StatusBar.currentHeight || 0,
      },
    }),
  },

  // Screen dimensions
  screen: {
    width,
    height: Platform.select({
      ios: height,
      android: height - (StatusBar.currentHeight || 0),
    }),
  },
};

// Platform-specific component props
export const PlatformProps = {
  // TouchableOpacity props
  touchableOpacity: Platform.select({
    ios: {
      activeOpacity: 0.7,
    },
    android: {
      activeOpacity: 0.7,
      background: undefined, // Let Android handle ripple
    },
  }),

  // TextInput props
  textInput: Platform.select({
    ios: {
      clearButtonMode: 'while-editing' as const,
    },
    android: {
      underlineColorAndroid: 'transparent',
      textAlignVertical: 'center' as const,
    },
  }),

  // ScrollView props
  scrollView: Platform.select({
    ios: {
      keyboardShouldPersistTaps: 'handled' as const,
      showsVerticalScrollIndicator: false,
    },
    android: {
      keyboardShouldPersistTaps: 'handled' as const,
      showsVerticalScrollIndicator: false,
      overScrollMode: 'never' as const,
    },
  }),
};

// Keyboard handling utilities
export const KeyboardUtils = {
  // Get keyboard height for both platforms
  getKeyboardHeight: () => {
    return Platform.select({
      ios: 350, // Approximate iOS keyboard height
      android: 300, // Approximate Android keyboard height
    });
  },

  // Keyboard avoiding view props
  avoidingViewProps: Platform.select({
    ios: {
      behavior: 'padding' as const,
    },
    android: {
      behavior: 'height' as const,
    },
  }),
};

// Animation utilities
export const AnimationUtils = {
  // Standard timing for both platforms
  timing: {
    duration: Platform.select({
      ios: 300,
      android: 250,
    }),
    useNativeDriver: true,
  },

  // Spring animation settings
  spring: Platform.select({
    ios: {
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    },
    android: {
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    },
  }),
};

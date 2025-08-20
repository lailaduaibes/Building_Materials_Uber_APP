/**
 * Android Compatibility Fixes for React Native Customer App
 * Quick fixes for common Android UI issues
 */

import { StatusBar, Platform } from 'react-native';

// Set proper status bar for Android
export const setupAndroidStatusBar = () => {
  if (Platform.OS === 'android') {
    StatusBar.setBarStyle('dark-content', true);
    StatusBar.setBackgroundColor('#FFFFFF', true);
    StatusBar.setTranslucent(false);
  }
};

// Android-specific theme overrides
export const androidThemeOverrides = {
  // Ensure minimum touch targets (48dp on Android)
  touchTarget: {
    minHeight: 48,
    minWidth: 48,
  },
  
  // Android-specific card styling
  card: {
    elevation: 4, // Android shadow
    borderRadius: 8, // Slightly smaller radius for Android
  },
  
  // Android-specific text styling
  text: {
    fontFamily: 'Roboto',
    includeFontPadding: false, // Remove extra padding on Android
  },
  
  // Android-specific input styling
  input: {
    textAlignVertical: 'center',
    underlineColorAndroid: 'transparent',
  },
};

// Apply Android-specific props to components
export const getAndroidProps = (componentType: string) => {
  if (Platform.OS !== 'android') return {};
  
  switch (componentType) {
    case 'TouchableOpacity':
      return {
        activeOpacity: 0.7,
        style: { minHeight: 48, minWidth: 48 },
      };
    
    case 'TextInput':
      return {
        underlineColorAndroid: 'transparent',
        textAlignVertical: 'center',
      };
    
    case 'ScrollView':
      return {
        overScrollMode: 'never',
        showsVerticalScrollIndicator: false,
      };
    
    default:
      return {};
  }
};

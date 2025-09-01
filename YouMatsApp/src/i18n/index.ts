/**
 * Professional i18n Configuration for YouMats Driver App
 * Supports English, Arabic, Hindi, and Urdu with RTL support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// Import translation resources
import en from './locales/en.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';

// Language resources
const resources = {
  en: { translation: en },
  ar: { translation: ar },
  hi: { translation: hi },
  ur: { translation: ur }
};

// Supported languages configuration
export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    rtl: true
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    rtl: true
  }
];

// RTL Languages
export const RTL_LANGUAGES = ['ar', 'ur'];

// Storage key for user's language preference
const LANGUAGE_STORAGE_KEY = '@youmats_user_language';

/**
 * Language detector that checks user preference, then device language
 */
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // 1. Check stored user preference
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage && resources[storedLanguage as keyof typeof resources]) {
        console.log('🌐 Using stored language:', storedLanguage);
        callback(storedLanguage);
        return;
      }

      // 2. Check device language using Expo Localization
      try {
        const locales = Localization.getLocales();
        const deviceLanguage = locales && locales[0] ? locales[0].languageCode : 'en';
        
        // Check if we support the device language
        if (deviceLanguage && resources[deviceLanguage as keyof typeof resources]) {
          console.log('🌐 Using device language:', deviceLanguage);
          callback(deviceLanguage);
          return;
        }
      } catch (localeError) {
        console.warn('🌐 Failed to get device locale:', localeError);
      }

      // 3. Fallback to English
      console.log('🌐 Using fallback language: en');
      callback('en');
    } catch (error) {
      console.warn('🌐 Language detection error:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
      console.log('🌐 Language cached:', lng);
    } catch (error) {
      console.warn('🌐 Failed to cache language:', error);
    }
  }
};

/**
 * Initialize i18n with professional configuration
 */
const initializeI18n = async () => {
  try {
    await i18n
      .use(languageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: 'en',
        debug: __DEV__, // Enable debug in development
        
        // Interpolation options
        interpolation: {
          escapeValue: false, // React already escapes values
        },

        // React i18next options
        react: {
          useSuspense: false, // Disable suspense for React Native
        },

        // Cache options for performance
        load: 'languageOnly', // Load only language, not locale variants
        cleanCode: true, // Clean language codes
        nonExplicitSupportedLngs: true,
      });
    
    console.log('🌐 i18n initialized successfully');
  } catch (error) {
    console.error('🌐 Failed to initialize i18n:', error);
    // Initialize with minimal English fallback
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: { translation: en } },
      interpolation: { escapeValue: false },
      react: { useSuspense: false }
    });
  }
};

// Initialize i18n
initializeI18n();

/**
 * Change language and handle RTL switching
 */
export const changeLanguage = async (languageCode: string): Promise<void> => {
  try {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
    if (!language) {
      console.warn('🌐 Unsupported language:', languageCode);
      return;
    }

    console.log('🌐 Changing language to:', languageCode);

    // Change i18n language
    await i18n.changeLanguage(languageCode);

    // Handle RTL layout
    const isRTL = language.rtl;
    const currentRTL = I18nManager.isRTL;

    if (isRTL !== currentRTL) {
      console.log('🌐 Switching RTL mode:', isRTL);
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRTL);
      
      // Note: App restart is required for RTL changes to take effect
      // This can be handled by the app component
    }

    // Cache the language preference
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    
    console.log('🌐 Language changed successfully to:', languageCode);
  } catch (error) {
    console.error('🌐 Failed to change language:', error);
    throw error;
  }
};

/**
 * Get current language info
 */
export const getCurrentLanguage = () => {
  const currentLang = i18n.language || 'en';
  return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
};

/**
 * Check if current language is RTL
 */
export const isRTL = (): boolean => {
  const currentLang = i18n.language || 'en';
  return RTL_LANGUAGES.includes(currentLang);
};

/**
 * Get language name in its native script
 */
export const getLanguageName = (code: string): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language?.nativeName || code;
};

export default i18n;

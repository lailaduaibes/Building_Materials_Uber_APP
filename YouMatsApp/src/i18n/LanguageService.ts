/**
 * Language Service - Professional language management utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import i18n, { changeLanguage, SUPPORTED_LANGUAGES } from './index';

export class LanguageService {
  private static readonly LANGUAGE_ANALYTICS_KEY = '@youmats_language_analytics';
  
  /**
   * Professional language switcher with user feedback
   */
  static async switchLanguage(languageCode: string): Promise<boolean> {
    try {
      const language = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
      if (!language) return false;

      // Track language usage for analytics
      await this.trackLanguageUsage(languageCode);

      // Change language
      await changeLanguage(languageCode);

      // Professional user feedback
      if (language.rtl !== (i18n.language === 'ar' || i18n.language === 'ur')) {
        Alert.alert(
          i18n.t('common.restartRequired', 'Restart Required'),
          i18n.t('common.restartMessage', 'The app will restart to apply the language change.'),
          [
            {
              text: i18n.t('common.ok', 'OK'),
              onPress: () => {
                // In a production app, you might trigger a restart here
                console.log('📱 App restart would be triggered for RTL change');
              }
            }
          ]
        );
      }

      return true;
    } catch (error) {
      console.error('🌐 Language switch failed:', error);
      return false;
    }
  }

  /**
   * Get language completion percentage for professional UX
   */
  static getLanguageCompleteness(languageCode: string): number {
    try {
      const translations = i18n.getResourceBundle(languageCode, 'translation');
      if (!translations) return 0;

      const englishTranslations = i18n.getResourceBundle('en', 'translation');
      if (!englishTranslations) return 100;

      const countKeys = (obj: any): number => {
        let count = 0;
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            count += countKeys(obj[key]);
          } else {
            count++;
          }
        }
        return count;
      };

      const countNonEmptyKeys = (obj: any): number => {
        let count = 0;
        for (const key in obj) {
          if (typeof obj[key] === 'object') {
            count += countNonEmptyKeys(obj[key]);
          } else if (obj[key] && obj[key].trim() !== '') {
            count++;
          }
        }
        return count;
      };

      const totalKeys = countKeys(englishTranslations);
      const translatedKeys = countNonEmptyKeys(translations);

      return Math.round((translatedKeys / totalKeys) * 100);
    } catch (error) {
      console.warn('🌐 Failed to calculate language completeness:', error);
      return 0;
    }
  }

  /**
   * Professional language analytics
   */
  private static async trackLanguageUsage(languageCode: string): Promise<void> {
    try {
      const analytics = await AsyncStorage.getItem(this.LANGUAGE_ANALYTICS_KEY);
      const data = analytics ? JSON.parse(analytics) : {};
      
      data[languageCode] = (data[languageCode] || 0) + 1;
      data.lastChanged = new Date().toISOString();
      
      await AsyncStorage.setItem(this.LANGUAGE_ANALYTICS_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('🌐 Language analytics tracking failed:', error);
    }
  }

  /**
   * Validate translations completeness (for QA)
   */
  static validateTranslations(): {
    language: string;
    missingKeys: string[];
    emptyKeys: string[];
    completeness: number;
  }[] {
    const results: any[] = [];
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      if (lang.code === 'en') return; // Skip base language
      
      const missingKeys: string[] = [];
      const emptyKeys: string[] = [];
      
      const checkKeys = (enObj: any, langObj: any, prefix = '') => {
        for (const key in enObj) {
          const currentKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof enObj[key] === 'object') {
            if (!langObj[key] || typeof langObj[key] !== 'object') {
              missingKeys.push(currentKey);
            } else {
              checkKeys(enObj[key], langObj[key], currentKey);
            }
          } else {
            if (!(key in langObj)) {
              missingKeys.push(currentKey);
            } else if (!langObj[key] || langObj[key].trim() === '') {
              emptyKeys.push(currentKey);
            }
          }
        }
      };

      try {
        const englishTranslations = i18n.getResourceBundle('en', 'translation');
        const langTranslations = i18n.getResourceBundle(lang.code, 'translation');
        
        if (englishTranslations && langTranslations) {
          checkKeys(englishTranslations, langTranslations);
        }
      } catch (error) {
        console.warn(`🌐 Validation failed for ${lang.code}:`, error);
      }

      results.push({
        language: lang.code,
        missingKeys,
        emptyKeys,
        completeness: this.getLanguageCompleteness(lang.code)
      });
    });
    
    return results;
  }
}

export default LanguageService;

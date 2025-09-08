/**
 * Language Context Provider for YouMats Driver App
 * Provides language switching functionality with RTL support
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Alert } from 'react-native';
import { changeLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, isRTL } from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  currentLanguageInfo: typeof SUPPORTED_LANGUAGES[0];
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  isRTL: boolean;
  isChangingLanguage: boolean;
  changeLanguage: (languageCode: string) => Promise<void>;
  t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [currentLanguageInfo, setCurrentLanguageInfo] = useState(getCurrentLanguage());

  // Update language info when i18n language changes
  useEffect(() => {
    const updateLanguageInfo = () => {
      const newLanguageInfo = getCurrentLanguage();
      console.log('🌐 Language info updated:', newLanguageInfo);
      setCurrentLanguageInfo(newLanguageInfo);
      
      // Force reset loading state when language actually changes
      if (isChangingLanguage) {
        setTimeout(() => {
          setIsChangingLanguage(false);
        }, 500);
      }
    };

    // Listen for language changes
    i18n.on('languageChanged', updateLanguageInfo);

    return () => {
      i18n.off('languageChanged', updateLanguageInfo);
    };
  }, [i18n, isChangingLanguage]);

  const handleChangeLanguage = async (languageCode: string): Promise<void> => {
    if (isChangingLanguage) return;

    try {
      setIsChangingLanguage(true);
      
      const newLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === languageCode);
      if (!newLanguage) {
        throw new Error(`Unsupported language: ${languageCode}`);
      }

      // Since we force LTR for all languages, no restart is needed
      console.log('🌐 Changing language without restart (LTR mode)');
      await changeLanguage(languageCode);
      setIsChangingLanguage(false);
      
    } catch (error) {
      console.error('Failed to change language:', error);
      Alert.alert(
        t('common.error'),
        t('errors.unexpectedError')
      );
      setIsChangingLanguage(false);
    }
    
    // Fallback: Reset loading state after 3 seconds no matter what
    setTimeout(() => {
      setIsChangingLanguage(false);
    }, 3000);
  };

  const contextValue: LanguageContextType = {
    currentLanguage: currentLanguageInfo.code,
    currentLanguageInfo,
    supportedLanguages: SUPPORTED_LANGUAGES,
    isRTL: isRTL(),
    isChangingLanguage,
    changeLanguage: handleChangeLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Custom hook to use language context
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageProvider;

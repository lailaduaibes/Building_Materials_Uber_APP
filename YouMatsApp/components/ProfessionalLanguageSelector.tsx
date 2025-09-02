/**
 * Professional Language Selector Component
 * Enterprise-grade language switching with completion indicators
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, getCurrentLanguage } from '../src/i18n';
import LanguageService from '../src/i18n/LanguageService';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  showCompleteness?: boolean; // Professional feature: show translation completeness
  onLanguageChanged?: (languageCode: string) => void;
}

export const ProfessionalLanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  showCompleteness = true,
  onLanguageChanged
}) => {
  const { t } = useTranslation();
  const [switching, setSwitching] = useState<string | null>(null);
  const currentLanguage = getCurrentLanguage();

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguage.code) {
      onClose();
      return;
    }

    setSwitching(languageCode);
    
    try {
      const success = await LanguageService.switchLanguage(languageCode);
      
      if (success) {
        onLanguageChanged?.(languageCode);
        onClose();
      } else {
        Alert.alert(
          t('common.error', 'Error'),
          t('settings.languageChangeError', 'Failed to change language. Please try again.'),
          [{ text: t('common.ok', 'OK') }]
        );
      }
    } catch (error) {
      console.error('Language change error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('common.unexpectedError', 'An unexpected error occurred.'),
        [{ text: t('common.ok', 'OK') }]
      );
    } finally {
      setSwitching(null);
    }
  };

  const getCompletenessColor = (percentage: number): string => {
    if (percentage >= 90) return '#4CAF50'; // Green
    if (percentage >= 70) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('common.selectLanguage', 'Select Language')}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.languageList}>
          {SUPPORTED_LANGUAGES.map((language: any) => {
            const isSelected = language.code === currentLanguage.code;
            const isSwitching = switching === language.code;
            const completeness = showCompleteness 
              ? LanguageService.getLanguageCompleteness(language.code)
              : 100;

            return (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageItem,
                  isSelected && styles.selectedLanguageItem
                ]}
                onPress={() => handleLanguageSelect(language.code)}
                disabled={isSwitching}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <View style={styles.languageDetails}>
                    <Text style={[
                      styles.languageName,
                      isSelected && styles.selectedText
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageEnglishName,
                      isSelected && styles.selectedSubText
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                </View>

                <View style={styles.languageStatus}>
                  {showCompleteness && language.code !== 'en' && (
                    <View style={styles.completenessContainer}>
                      <Text style={[
                        styles.completenessText,
                        { color: getCompletenessColor(completeness) }
                      ]}>
                        {completeness}%
                      </Text>
                      <View style={styles.completenessBar}>
                        <View
                          style={[
                            styles.completenessProgress,
                            {
                              width: `${completeness}%`,
                              backgroundColor: getCompletenessColor(completeness)
                            }
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {isSwitching ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : isSelected ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}

                  {language.rtl && (
                    <Text style={styles.rtlIndicator}>RTL</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('settings.languageNote', 'Language changes will be saved automatically')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#007AFF',
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedLanguageItem: {
    backgroundColor: '#E3F2FD',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageDetails: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  selectedText: {
    color: '#007AFF',
  },
  selectedSubText: {
    color: '#4A90E2',
  },
  languageStatus: {
    alignItems: 'flex-end',
  },
  completenessContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  completenessText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completenessBar: {
    width: 40,
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 1.5,
    marginTop: 2,
  },
  completenessProgress: {
    height: '100%',
    borderRadius: 1.5,
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  rtlIndicator: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  footerText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default ProfessionalLanguageSelector;

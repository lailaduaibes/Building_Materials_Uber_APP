/**
 * Language Test Screen - Testing Multi-Language Implementation
 * This screen demonstrates the i18n functionality
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLanguage } from '../src/contexts/LanguageContext';
import LanguageSelector from '../src/components/LanguageSelector';
import { Colors } from '../theme/colors';

interface LanguageTestScreenProps {
  onBack: () => void;
}

const LanguageTestScreen: React.FC<LanguageTestScreenProps> = ({ onBack }) => {
  const { t, currentLanguageInfo, isRTL } = useLanguage();

  return (
    <ScrollView style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          style={[styles.backButton, isRTL && styles.backButtonRTL]}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>
            {isRTL ? '→' : '←'} {t('common.back')}
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.title, isRTL && styles.titleRTL]}>
          {t('profile.language')} Test
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>
          Current Language: {currentLanguageInfo.nativeName}
        </Text>
        
        <View style={styles.languageSelectorContainer}>
          <LanguageSelector 
            style={styles.languageSelector}
            showFlag={true}
            showNativeName={true}
          />
        </View>

        <View style={styles.testSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>
            Translation Test:
          </Text>
          
          <View style={styles.testGrid}>
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Welcome:</Text>
              <Text style={styles.testValue}>{t('common.welcome')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Login:</Text>
              <Text style={styles.testValue}>{t('auth.loginButton')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Dashboard:</Text>
              <Text style={styles.testValue}>{t('dashboard.title')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Status Online:</Text>
              <Text style={styles.testValue}>{t('dashboard.status.online')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Orders:</Text>
              <Text style={styles.testValue}>{t('orders.title')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Profile:</Text>
              <Text style={styles.testValue}>{t('profile.title')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Accept:</Text>
              <Text style={styles.testValue}>{t('orders.accept')}</Text>
            </View>
            
            <View style={styles.testItem}>
              <Text style={styles.testLabel}>Success:</Text>
              <Text style={styles.testValue}>{t('common.success')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleRTL]}>
            Language Info:
          </Text>
          <Text style={styles.infoText}>Code: {currentLanguageInfo.code}</Text>
          <Text style={styles.infoText}>Name: {currentLanguageInfo.name}</Text>
          <Text style={styles.infoText}>Native: {currentLanguageInfo.nativeName}</Text>
          <Text style={styles.infoText}>RTL: {isRTL ? 'Yes' : 'No'}</Text>
          <Text style={styles.infoText}>Flag: {currentLanguageInfo.flag}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  containerRTL: {
    // RTL container styles if needed
  },
  header: {
    padding: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonRTL: {
    marginRight: 0,
    marginLeft: 15,
  },
  backButtonText: {
    color: Colors.text.white,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: Colors.text.white,
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  titleRTL: {
    textAlign: 'right',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 15,
  },
  sectionTitleRTL: {
    textAlign: 'right',
  },
  languageSelectorContainer: {
    marginBottom: 30,
  },
  languageSelector: {
    // Additional styling if needed
  },
  testSection: {
    marginBottom: 30,
  },
  testGrid: {
    // Grid layout for test items
  },
  testItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: Colors.background.secondary,
    marginBottom: 8,
    borderRadius: 8,
  },
  testLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
    flex: 1,
  },
  testValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  infoSection: {
    backgroundColor: Colors.background.card,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 5,
  },
});

export default LanguageTestScreen;

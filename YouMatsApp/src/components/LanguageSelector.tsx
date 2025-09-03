/**
 * Professional Language Selector Component
 * Allows users to switch between supported languages with beautiful UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { Colors } from '../../theme/colors';

interface LanguageSelectorProps {
  style?: any;
  buttonStyle?: any;
  textStyle?: any;
  showFlag?: boolean;
  showNativeName?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  style,
  buttonStyle,
  textStyle,
  showFlag = true,
  showNativeName = true
}) => {
  const {
    currentLanguageInfo,
    supportedLanguages,
    isChangingLanguage,
    changeLanguage,
    t,
    isRTL
  } = useLanguage();

  const [modalVisible, setModalVisible] = useState(false);

  // Close modal when language changes
  React.useEffect(() => {
    if (!isChangingLanguage) {
      setModalVisible(false);
    }
  }, [isChangingLanguage]);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode === currentLanguageInfo.code) {
      setModalVisible(false);
      return;
    }

    setModalVisible(false);
    await changeLanguage(languageCode);
  };

  const renderLanguageItem = ({ item }: { item: typeof supportedLanguages[0] }) => {
    const isSelected = item.code === currentLanguageInfo.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.selectedLanguageItem,
          isRTL && styles.languageItemRTL
        ]}
        onPress={() => handleLanguageSelect(item.code)}
        disabled={isChangingLanguage}
      >
        <View style={[styles.languageItemContent, isRTL && styles.languageItemContentRTL]}>
          {showFlag && (
            <Text style={styles.flag}>{item.flag}</Text>
          )}
          <View style={styles.languageNames}>
            <Text style={[
              styles.languageName,
              isSelected && styles.selectedLanguageName,
              isRTL && styles.languageNameRTL
            ]}>
              {showNativeName ? item.nativeName : item.name}
            </Text>
            {showNativeName && item.name !== item.nativeName && (
              <Text style={[
                styles.languageNameSecondary,
                isSelected && styles.selectedLanguageNameSecondary,
                isRTL && styles.languageNameSecondaryRTL
              ]}>
                {item.name}
              </Text>
            )}
          </View>
          {isSelected && (
            <View style={[styles.checkmark, isRTL && styles.checkmarkRTL]}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.selectorButton, buttonStyle, isRTL && styles.selectorButtonRTL]}
        onPress={() => setModalVisible(true)}
        disabled={isChangingLanguage}
      >
        {isChangingLanguage ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <View style={[styles.selectorContent, isRTL && styles.selectorContentRTL]}>
            {showFlag && (
              <Text style={styles.currentFlag}>{currentLanguageInfo.flag}</Text>
            )}
            <Text style={[styles.currentLanguage, textStyle, isRTL && styles.currentLanguageRTL]}>
              {showNativeName ? currentLanguageInfo.nativeName : currentLanguageInfo.name}
            </Text>
            <Text style={[styles.chevron, isRTL && styles.chevronRTL]}>▼</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.modalTitleRTL]}>
                {t('profile.language')}
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, isRTL && styles.closeButtonRTL]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={supportedLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    // Base container styling
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    minHeight: 48,
  },
  selectorButtonRTL: {
    flexDirection: 'row-reverse',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorContentRTL: {
    flexDirection: 'row-reverse',
  },
  currentFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  currentLanguage: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  currentLanguageRTL: {
    textAlign: 'right',
    marginRight: 0,
    marginLeft: 12,
  },
  chevron: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  chevronRTL: {
    marginLeft: 0,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    width: width * 0.85,
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalContentRTL: {
    // RTL specific modal styling if needed
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalTitleRTL: {
    textAlign: 'right',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonRTL: {
    // RTL close button positioning if needed
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  languageItemRTL: {
    // RTL language item styling
  },
  selectedLanguageItem: {
    backgroundColor: Colors.primary + '10',
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageItemContentRTL: {
    flexDirection: 'row-reverse',
  },
  flag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageNames: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  languageNameRTL: {
    textAlign: 'right',
  },
  selectedLanguageName: {
    color: Colors.primary,
  },
  languageNameSecondary: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  languageNameSecondaryRTL: {
    textAlign: 'right',
  },
  selectedLanguageNameSecondary: {
    color: Colors.primary + '80',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  checkmarkText: {
    color: Colors.text.white,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LanguageSelector;

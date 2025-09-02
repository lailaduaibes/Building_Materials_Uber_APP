/**
 * Professional Translation Validation Script
 * Usage: node scripts/validate-translations.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SUPPORTED_LANGUAGES = ['en', 'ar', 'hi', 'ur'];

function loadTranslations() {
  const translations = {};
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      translations[lang] = JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load ${lang}.json:`, error.message);
      translations[lang] = {};
    }
  });
  
  return translations;
}

function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], currentKey));
    } else {
      keys.push(currentKey);
    }
  }
  
  return keys;
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

function validateTranslations() {
  console.log('🔍 Professional Translation Validation\n');
  
  const translations = loadTranslations();
  const englishKeys = getAllKeys(translations.en || {});
  
  if (englishKeys.length === 0) {
    console.error('❌ No English translations found. Cannot validate.');
    return;
  }
  
  console.log(`📊 Total translation keys: ${englishKeys.length}\n`);
  
  const results = {};
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang === 'en') return; // Skip base language
    
    const langTranslations = translations[lang] || {};
    const missingKeys = [];
    const emptyKeys = [];
    const validKeys = [];
    
    englishKeys.forEach(key => {
      const value = getValueByPath(langTranslations, key);
      
      if (value === undefined) {
        missingKeys.push(key);
      } else if (value === '' || (typeof value === 'string' && value.trim() === '')) {
        emptyKeys.push(key);
      } else {
        validKeys.push(key);
      }
    });
    
    const completeness = Math.round((validKeys.length / englishKeys.length) * 100);
    
    results[lang] = {
      completeness,
      validKeys: validKeys.length,
      missingKeys,
      emptyKeys,
      total: englishKeys.length
    };
    
    // Console output with professional formatting
    console.log(`🌐 ${lang.toUpperCase()} Language Report:`);
    console.log(`   ✅ Completeness: ${completeness}%`);
    console.log(`   📝 Translated: ${validKeys.length}/${englishKeys.length}`);
    console.log(`   ❌ Missing: ${missingKeys.length}`);
    console.log(`   ⚠️  Empty: ${emptyKeys.length}`);
    
    if (missingKeys.length > 0) {
      console.log(`   🔍 Missing keys: ${missingKeys.slice(0, 5).join(', ')}${missingKeys.length > 5 ? '...' : ''}`);
    }
    
    if (emptyKeys.length > 0) {
      console.log(`   📄 Empty keys: ${emptyKeys.slice(0, 5).join(', ')}${emptyKeys.length > 5 ? '...' : ''}`);
    }
    
    console.log('');
  });
  
  // Generate professional report
  console.log('📋 Professional Translation Summary:');
  Object.entries(results).forEach(([lang, data]) => {
    const status = data.completeness >= 90 ? '🟢' : data.completeness >= 70 ? '🟡' : '🔴';
    console.log(`   ${status} ${lang.toUpperCase()}: ${data.completeness}% complete`);
  });
  
  // Write detailed report to file
  const reportPath = path.join(__dirname, '../translation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalKeys: englishKeys.length,
    languages: results
  }, null, 2));
  
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  
  // Professional recommendations
  console.log('\n💡 Professional Recommendations:');
  Object.entries(results).forEach(([lang, data]) => {
    if (data.completeness < 70) {
      console.log(`   🚨 ${lang.toUpperCase()}: Low completion rate. Consider professional translation service.`);
    } else if (data.emptyKeys.length > 10) {
      console.log(`   ⚠️  ${lang.toUpperCase()}: Many empty strings detected. Review translation quality.`);
    } else if (data.completeness >= 90) {
      console.log(`   ✨ ${lang.toUpperCase()}: Excellent translation coverage! Ready for production.`);
    }
  });
}

// Run validation
validateTranslations();

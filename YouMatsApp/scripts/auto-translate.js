#!/usr/bin/env node

/**
 * Auto-Translation Script for YouMats Driver App
 * Extracts hardcoded strings from React Native screens and generates translations
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Translation mappings (you can extend these or use AI services)
const translations = {
  // Navigation & Common UI
  "Earnings": { ar: "الأرباح", ur: "کمائی", hi: "कमाई" },
  "My Trips": { ar: "رحلاتي", ur: "میرے سفر", hi: "मेरी यात्रा" },
  "Available": { ar: "متاح", ur: "دستیاب", hi: "उपलब्ध" },
  "Profile": { ar: "الملف الشخصي", ur: "پروفائل", hi: "प्रोफ़ाइल" },
  
  // Earnings Screen
  "Total Earnings": { ar: "إجمالي الأرباح", ur: "کل کمائی", hi: "कुल कमाई" },
  "This Month": { ar: "هذا الشهر", ur: "اس مہینے", hi: "इस महीने" },
  "This Year": { ar: "هذا العام", ur: "اس سال", hi: "इस साल" },
  "Weekly Average": { ar: "المتوسط الأسبوعي", ur: "ہفتہ وار اوسط", hi: "साप्ताहिक औसत" },
  "Top Earning Day": { ar: "أعلى يوم ربح", ur: "سب سے زیادہ کمائی کا دن", hi: "सबसे अधिक कमाई का दिन" },
  
  // Trip History
  "Trip History": { ar: "تاريخ الرحلات", ur: "سفر کی تاریخ", hi: "यात्रा इतिहास" },
  "Recent Trips": { ar: "الرحلات الأخيرة", ur: "حالیہ سفر", hi: "हाल की यात्रा" },
  "Completed": { ar: "مكتمل", ur: "مکمل", hi: "पूर्ण" },
  "Cancelled": { ar: "ملغي", ur: "منسوخ", hi: "रद्द" },
  "In Progress": { ar: "جاري", ur: "جاری", hi: "प्रगति में" },
  
  // Live Trip Tracking
  "Navigate": { ar: "الملاحة", ur: "نیویگیٹ", hi: "नेविगेट" },
  "Call Customer": { ar: "اتصل بالعميل", ur: "کسٹمر کو کال کریں", hi: "ग्राहक को कॉल करें" },
  "Start Trip": { ar: "بدء الرحلة", ur: "سفر شروع کریں", hi: "यात्रा शुरू करें" },
  "Complete Trip": { ar: "إكمال الرحلة", ur: "سفر مکمل کریں", hi: "यात्रा पूरी करें" },
  "Pickup Location": { ar: "موقع الاستلام", ur: "پک اپ کی جگہ", hi: "पिकअप स्थान" },
  "Delivery Location": { ar: "موقع التسليم", ur: "ڈیلیوری کی جگہ", hi: "डिलीवरी स्थान" },
  
  // Order Assignment
  "New Order": { ar: "طلب جديد", ur: "نیا آرڈر", hi: "नया ऑर्डर" },
  "Accept": { ar: "قبول", ur: "قبول", hi: "स्वीकार" },
  "Decline": { ar: "رفض", ur: "مسترد", hi: "अस्वीकार" },
  "Order Details": { ar: "تفاصيل الطلب", ur: "آرڈر کی تفصیلات", hi: "ऑर्डर विवरण" },
  "Customer": { ar: "العميل", ur: "کسٹمر", hi: "ग्राहक" },
  "Distance": { ar: "المسافة", ur: "فاصلہ", hi: "दूरी" },
  "Payment": { ar: "الدفع", ur: "ادائیگی", hi: "भुगतान" },
  
  // Authentication
  "Sign In": { ar: "تسجيل الدخول", ur: "سائن ان", hi: "साइन इन" },
  "Sign Up": { ar: "التسجيل", ur: "سائن اپ", hi: "साइन अप" },
  "Forgot Password": { ar: "نسيت كلمة المرور", ur: "پاس ورڈ بھول گئے", hi: "पासवर्ड भूल गए" },
  "Enter Email": { ar: "أدخل البريد الإلكتروني", ur: "ای میل درج کریں", hi: "ईमेल दर्ज करें" },
  "Enter Password": { ar: "أدخل كلمة المرور", ur: "پاس ورڈ درج کریں", hi: "पासवर्ड दर्ज करें" },
  
  // Registration
  "Driver Registration": { ar: "تسجيل السائق", ur: "ڈرائیور رجسٹریشن", hi: "ड्राइवर पंजीकरण" },
  "Personal Information": { ar: "المعلومات الشخصية", ur: "ذاتی معلومات", hi: "व्यक्तिगत जानकारी" },
  "Vehicle Information": { ar: "معلومات المركبة", ur: "گاڑی کی معلومات", hi: "वाहन की जानकारी" },
  "Documents": { ar: "الوثائق", ur: "دستاویزات", hi: "दस्तावेज़" },
  "First Name": { ar: "الاسم الأول", ur: "پہلا نام", hi: "पहला नाम" },
  "Last Name": { ar: "اسم العائلة", ur: "آخری نام", hi: "अंतिम नाम" },
  "Phone Number": { ar: "رقم الهاتف", ur: "فون نمبر", hi: "फोन नंबर" },
  
  // Common Actions
  "Save": { ar: "حفظ", ur: "محفوظ کریں", hi: "सेव" },
  "Cancel": { ar: "إلغاء", ur: "منسوخ", hi: "रद्द" },
  "Continue": { ar: "متابعة", ur: "جاری رکھیں", hi: "जारी रखें" },
  "Submit": { ar: "إرسال", ur: "جمع کریں", hi: "जमा करें" },
  "Upload": { ar: "رفع", ur: "اپ لوڈ", hi: "अपलोड" },
  "Download": { ar: "تحميل", ur: "ڈاؤن لوڈ", hi: "डाउनलोड" },
  "Share": { ar: "مشاركة", ur: "شیئر", hi: "साझा" },
  "Delete": { ar: "حذف", ur: "ڈیلیٹ", hi: "हटाएं" },
  
  // Status Messages
  "Loading...": { ar: "جاري التحميل...", ur: "لوڈ ہو رہا ہے...", hi: "लोड हो रहा है..." },
  "Success": { ar: "نجح", ur: "کامیابی", hi: "सफलता" },
  "Error": { ar: "خطأ", ur: "خرابی", hi: "त्रुटि" },
  "Warning": { ar: "تحذير", ur: "انتباہ", hi: "चेतावनी" },
  "Info": { ar: "معلومات", ur: "معلومات", hi: "जानकारी" },
  
  // Time & Date
  "Today": { ar: "اليوم", ur: "آج", hi: "आज" },
  "Yesterday": { ar: "أمس", ur: "کل", hi: "कल" },
  "This Week": { ar: "هذا الأسبوع", ur: "اس ہفتے", hi: "इस सप्ताह" },
  "Last Week": { ar: "الأسبوع الماضي", ur: "پچھلے ہفتے", hi: "पिछले सप्ताह" },
  "This Month": { ar: "هذا الشهر", ur: "اس مہینے", hi: "इस महीने" },
  
  // Driver Status
  "Online": { ar: "متصل", ur: "آن لائن", hi: "ऑनलाइन" },
  "Offline": { ar: "غير متصل", ur: "آف لائن", hi: "ऑफलाइन" },
  "Busy": { ar: "مشغول", ur: "مصروف", hi: "व्यस्त" },
  "Available": { ar: "متاح", ur: "دستیاب", hi: "उपलब्ध" },
  
  // Settings
  "Settings": { ar: "الإعدادات", ur: "سیٹنگز", hi: "सेटिंग्स" },
  "Language": { ar: "اللغة", ur: "زبان", hi: "भाषा" },
  "Notifications": { ar: "الإشعارات", ur: "اطلاعات", hi: "सूचनाएं" },
  "Privacy": { ar: "الخصوصية", ur: "پرائیویسی", hi: "गोपनीयता" },
  "Help": { ar: "المساعدة", ur: "مدد", hi: "सहायता" },
  "About": { ar: "حول", ur: "کے بارے میں", hi: "के बारे में" },
  "Logout": { ar: "تسجيل الخروج", ur: "لاگ آؤٹ", hi: "लॉग आउट" }
};

// Function to extract strings from React Native files
function extractStringsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const strings = new Set();
  
  // Regex patterns to match hardcoded strings
  const patterns = [
    // Text components: <Text>string</Text>
    /<Text[^>]*>([^<]+)<\/Text>/g,
    // String literals in JSX: "string"
    /(?:title|placeholder|label|text)=["']([^"']+)["']/g,
    // Alert messages: Alert.alert('title', 'message')
    /Alert\.alert\s*\(\s*["']([^"']+)["']/g,
    // Button titles
    /(?:title|buttonText|label):\s*["']([^"']+)["']/g,
    // Object properties with string values
    /:\s*["']([^"']{3,})["']/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      // Filter out code-like strings, variables, and very short strings
      if (text.length > 2 && 
          !text.includes('{{') && 
          !text.includes('${') &&
          !text.match(/^[a-z_]+$/i) &&
          !text.includes('://') &&
          !text.match(/^\d+$/)) {
        strings.add(text);
      }
    }
  });
  
  return Array.from(strings);
}

// Function to get all screen files
function getAllScreenFiles() {
  const patterns = [
    'screens/**/*.tsx',
    'screens/**/*.ts',
    'components/**/*.tsx',
    'components/**/*.ts'
  ];
  
  let files = [];
  patterns.forEach(pattern => {
    files = files.concat(glob.sync(pattern, { cwd: process.cwd() }));
  });
  
  return files;
}

// Function to generate translation keys
function generateTranslationKey(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

// Function to update translation files
function updateTranslationFiles(extractedStrings) {
  const languages = ['en', 'ar', 'ur', 'hi'];
  
  languages.forEach(lang => {
    const filePath = path.join('src/i18n/locales', `${lang}.json`);
    let translationData = {};
    
    // Load existing translations
    if (fs.existsSync(filePath)) {
      translationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    // Add new translations
    extractedStrings.forEach(text => {
      const key = generateTranslationKey(text);
      const category = categorizeString(text);
      
      if (!translationData[category]) {
        translationData[category] = {};
      }
      
      if (!translationData[category][key]) {
        if (lang === 'en') {
          translationData[category][key] = text;
        } else {
          // Use predefined translations or fallback to English
          translationData[category][key] = translations[text]?.[lang] || text;
        }
      }
    });
    
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(translationData, null, 2), 'utf8');
    console.log(`✅ Updated ${lang}.json with ${extractedStrings.length} strings`);
  });
}

// Function to categorize strings
function categorizeString(text) {
  if (['Login', 'Register', 'Sign In', 'Sign Up', 'Password'].some(word => text.includes(word))) {
    return 'auth';
  }
  if (['Earnings', 'Payment', 'AED', '$'].some(word => text.includes(word))) {
    return 'earnings';
  }
  if (['Trip', 'Order', 'Delivery', 'Pickup'].some(word => text.includes(word))) {
    return 'trips';
  }
  if (['Profile', 'Settings', 'Language'].some(word => text.includes(word))) {
    return 'profile';
  }
  if (['Dashboard', 'Online', 'Offline', 'Available'].some(word => text.includes(word))) {
    return 'dashboard';
  }
  return 'common';
}

// Function to generate replacement suggestions
function generateReplacementSuggestions(filePath, extractedStrings) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  extractedStrings.forEach(text => {
    const key = generateTranslationKey(text);
    const category = categorizeString(text);
    const replacementKey = `${category}.${key}`;
    
    // Replace hardcoded strings with translation calls
    newContent = newContent.replace(
      new RegExp(`["']${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
      `t('${replacementKey}')`
    );
  });
  
  // Create backup and suggestion file
  const backupPath = filePath.replace(/\.(tsx?|jsx?)$/, '.backup.$1');
  const suggestionPath = filePath.replace(/\.(tsx?|jsx?)$/, '.translated.$1');
  
  fs.writeFileSync(backupPath, content, 'utf8');
  fs.writeFileSync(suggestionPath, newContent, 'utf8');
  
  console.log(`📝 Generated translation suggestions for ${filePath}`);
  console.log(`   Backup: ${backupPath}`);
  console.log(`   Suggested changes: ${suggestionPath}`);
}

// Main execution function
function main() {
  console.log('🚀 Starting auto-translation script...\n');
  
  const screenFiles = getAllScreenFiles();
  console.log(`📁 Found ${screenFiles.length} screen files\n`);
  
  let allExtractedStrings = new Set();
  
  screenFiles.forEach(file => {
    console.log(`🔍 Processing: ${file}`);
    const strings = extractStringsFromFile(file);
    console.log(`   Found ${strings.length} strings`);
    
    strings.forEach(str => allExtractedStrings.add(str));
    
    // Generate replacement suggestions for each file
    generateReplacementSuggestions(file, strings);
  });
  
  console.log(`\n📊 Total unique strings found: ${allExtractedStrings.size}`);
  
  // Update translation files
  console.log('\n📝 Updating translation files...');
  updateTranslationFiles(Array.from(allExtractedStrings));
  
  console.log('\n✅ Auto-translation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the generated .translated.* files');
  console.log('2. Add useLanguage hook to screens that need it');
  console.log('3. Replace original files with translated versions');
  console.log('4. Test the app in different languages');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  extractStringsFromFile,
  updateTranslationFiles,
  generateTranslationKey
};

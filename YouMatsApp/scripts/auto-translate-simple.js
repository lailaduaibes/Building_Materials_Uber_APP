#!/usr/bin/env node

/**
 * Auto-Translation Script for YouMats Driver App (No Dependencies Version)
 * Extracts hardcoded strings from React Native screens and generates translations
 */

const fs = require('fs');
const path = require('path');

// Translation mappings for common strings
const translations = {
  // Navigation & Common UI
  "Earnings": { ar: "الأرباح", ur: "کمائی", hi: "कमाई" },
  "My Trips": { ar: "رحلاتي", ur: "میرے سفر", hi: "मेरी यात्रा" },
  "Available": { ar: "متاح", ur: "دستیاب", hi: "उपलब्ध" },
  "Profile": { ar: "الملف الشخصي", ur: "پروفائل", hi: "प्रोफ़ाइल" },
  
  // Dashboard
  "Good Morning": { ar: "صباح الخير", ur: "صبح بخیر", hi: "सुप्रभात" },
  "Good Evening": { ar: "مساء الخير", ur: "شام بخیر", hi: "शुभ संध्या" },
  "Welcome back": { ar: "مرحباً بعودتك", ur: "واپس آئیے", hi: "वापसी पर स्वागत" },
  "Go Online": { ar: "اتصل", ur: "آن لائن جائیں", hi: "ऑनलाइन जाएं" },
  "Go Offline": { ar: "اقطع الاتصال", ur: "آف لائن جائیں", hi: "ऑफलाइन जाएं" },
  "Your Location": { ar: "موقعك", ur: "آپ کا مقام", hi: "आपका स्थान" },
  "Location permission denied": { ar: "تم رفض إذن الموقع", ur: "مقام کی اجازت مسترد", hi: "स्थान अनुमति अस्वीकृत" },
  "Enable location to continue": { ar: "فعل الموقع للمتابعة", ur: "جاری رکھنے کے لیے مقام فعال کریں", hi: "जारी रखने के लिए स्थान सक्षम करें" },
  
  // Earnings Screen
  "Total Earnings": { ar: "إجمالي الأرباح", ur: "کل کمائی", hi: "कुल कमाई" },
  "This Month": { ar: "هذا الشهر", ur: "اس مہینے", hi: "इस महीने" },
  "This Year": { ar: "هذا العام", ur: "اس سال", hi: "इस साल" },
  "Weekly Average": { ar: "المتوسط الأسبوعي", ur: "ہفتہ وار اوسط", hi: "साप्ताहिक औसत" },
  "Top Earning Day": { ar: "أعلى يوم ربح", ur: "سب سے زیادہ کمائی کا دن", hi: "सबसे अधिक कमाई का दिन" },
  "No earnings data": { ar: "لا توجد بيانات أرباح", ur: "کمائی کا ڈیٹا نہیں", hi: "कमाई का डेटा नहीं" },
  
  // Trip History
  "Trip History": { ar: "تاريخ الرحلات", ur: "سفر کی تاریخ", hi: "यात्रा इतिहास" },
  "Recent Trips": { ar: "الرحلات الأخيرة", ur: "حالیہ سفر", hi: "हाल की यात्रा" },
  "Completed": { ar: "مكتمل", ur: "مکمل", hi: "पूर्ण" },
  "Cancelled": { ar: "ملغي", ur: "منسوخ", hi: "रद्द" },
  "In Progress": { ar: "جاري", ur: "جاری", hi: "प्रगति में" },
  "Filter": { ar: "تصفية", ur: "فلٹر", hi: "फ़िल्टर" },
  "Search trips": { ar: "البحث عن الرحلات", ur: "سفر تلاش کریں", hi: "यात्रा खोजें" },
  
  // Live Trip Tracking
  "Navigate": { ar: "الملاحة", ur: "نیویگیٹ", hi: "नेविगेट" },
  "Call Customer": { ar: "اتصل بالعميل", ur: "کسٹمر کو کال کریں", hi: "ग्राहक को कॉल करें" },
  "Start Trip": { ar: "بدء الرحلة", ur: "سفر شروع کریں", hi: "यात्रा शुरू करें" },
  "Complete Trip": { ar: "إكمال الرحلة", ur: "سفر مکمل کریں", hi: "यात्रा पूरी करें" },
  "Pickup Location": { ar: "موقع الاستلام", ur: "پک اپ کی جگہ", hi: "पिकअप स्थान" },
  "Delivery Location": { ar: "موقع التسليم", ur: "ڈیلیوری کی جگہ", hi: "डिलीवरी स्थान" },
  "Arrived at pickup": { ar: "وصل إلى الاستلام", ur: "پک اپ پر پہنچ گئے", hi: "पिकअप पर पहुंच गए" },
  "Arrived at delivery": { ar: "وصل إلى التسليم", ur: "ڈیلیوری پر پہنچ گئے", hi: "डिलीवरी पर पहुंच गए" },
  
  // Order Assignment
  "New Order": { ar: "طلب جديد", ur: "نیا آرڈر", hi: "नया ऑर्डर" },
  "Accept": { ar: "قبول", ur: "قبول", hi: "स्वीकार" },
  "Decline": { ar: "رفض", ur: "مسترد", hi: "अस्वीकार" },
  "Order Details": { ar: "تفاصيل الطلب", ur: "آرڈر کی تفصیلات", hi: "ऑर्डर विवरण" },
  "Customer": { ar: "العميل", ur: "کسٹمر", hi: "ग्राहक" },
  "Distance": { ar: "المسافة", ur: "فاصلہ", hi: "दूरी" },
  "Payment": { ar: "الدفع", ur: "ادائیگی", hi: "भुगतान" },
  "Estimated Time": { ar: "الوقت المقدر", ur: "تخمینی وقت", hi: "अनुमानित समय" },
  "Order Value": { ar: "قيمة الطلب", ur: "آرڈر کی قیمت", hi: "ऑर्डर मूल्य" },
  
  // Authentication
  "Sign In": { ar: "تسجيل الدخول", ur: "سائن ان", hi: "साइन इन" },
  "Sign Up": { ar: "التسجيل", ur: "سائن اپ", hi: "साइन अप" },
  "Forgot Password": { ar: "نسيت كلمة المرور", ur: "پاس ورڈ بھول گئے", hi: "पासवर्ड भूल गए" },
  "Enter Email": { ar: "أدخل البريد الإلكتروني", ur: "ای میل درج کریں", hi: "ईमेल दर्ज करें" },
  "Enter Password": { ar: "أدخل كلمة المرور", ur: "پاس ورڈ درج کریں", hi: "पासवर्ड दर्ज करें" },
  "Email": { ar: "البريد الإلكتروني", ur: "ای میل", hi: "ईमेल" },
  "Password": { ar: "كلمة المرور", ur: "پاس ورڈ", hi: "पासवर्ड" },
  
  // Common Actions
  "Save": { ar: "حفظ", ur: "محفوظ کریں", hi: "सेव" },
  "Cancel": { ar: "إلغاء", ur: "منسوخ", hi: "रद्द" },
  "Continue": { ar: "متابعة", ur: "جاری رکھیں", hi: "जारी रखें" },
  "Submit": { ar: "إرسال", ur: "جمع کریں", hi: "जमा करें" },
  "Upload": { ar: "رفع", ur: "اپ لوڈ", hi: "अपलोड" },
  "Download": { ar: "تحميل", ur: "ڈاؤن لوڈ", hi: "डाउनलोड" },
  "Share": { ar: "مشاركة", ur: "شیئر", hi: "साझा" },
  "Delete": { ar: "حذف", ur: "ڈیلیٹ", hi: "हटाएं" },
  "Edit": { ar: "تحرير", ur: "ترمیم", hi: "संपादित" },
  "View": { ar: "عرض", ur: "دیکھیں", hi: "देखें" },
  
  // Status Messages
  "Loading": { ar: "جاري التحميل", ur: "لوڈ ہو رہا ہے", hi: "लोड हो रहा है" },
  "Success": { ar: "نجح", ur: "کامیابی", hi: "सफलता" },
  "Error": { ar: "خطأ", ur: "خرابی", hi: "त्रुटि" },
  "Warning": { ar: "تحذير", ur: "انتباہ", hi: "चेतावनी" },
  "Info": { ar: "معلومات", ur: "معلومات", hi: "जानकारी" },
  "No data available": { ar: "لا توجد بيانات متاحة", ur: "کوئی ڈیٹا دستیاب نہیں", hi: "कोई डेटा उपलब्ध नहीं" },
  
  // Time & Date
  "Today": { ar: "اليوم", ur: "آج", hi: "आज" },
  "Yesterday": { ar: "أمس", ur: "کل", hi: "कल" },
  "This Week": { ar: "هذا الأسبوع", ur: "اس ہفتے", hi: "इस सप्ताह" },
  "Last Week": { ar: "الأسبوع الماضي", ur: "پچھلے ہفتے", hi: "पिछले सप्ताह" },
  "minutes ago": { ar: "منذ دقائق", ur: "منٹ پہلے", hi: "मिनट पहले" },
  "hours ago": { ar: "منذ ساعات", ur: "گھنٹے پہلے", hi: "घंटे पहले" },
  
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

// Function to recursively find all files in a directory
function findFiles(dir, extension, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, extension, fileList);
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to extract strings from React Native files
function extractStringsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const strings = new Set();
  
  // More comprehensive regex patterns
  const patterns = [
    // Text components: <Text>string</Text>
    /<Text[^>]*>([^<{]+)<\/Text>/g,
    // String props: title="string", placeholder="string", etc.
    /(?:title|placeholder|label|text|buttonText|message|description)=["']([^"']+)["']/g,
    // Alert messages: Alert.alert('title', 'message')
    /Alert\.alert\s*\(\s*["']([^"']+)["']/g,
    // Object properties with string values (for navigation options, etc.)
    /(?:title|headerTitle|tabBarLabel):\s*["']([^"']+)["']/g,
    // Simple string assignments
    /=\s*["']([A-Za-z\s]{3,}[^"']*)["']/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[1].trim();
      
      // Filter out unwanted strings
      if (isValidStringForTranslation(text)) {
        strings.add(text);
      }
    }
  });
  
  return Array.from(strings);
}

// Function to validate if a string should be translated
function isValidStringForTranslation(text) {
  if (text.length < 2) return false;
  if (text.length > 100) return false;
  
  // Skip URLs, emails, variable names, etc.
  if (text.includes('://')) return false;
  if (text.includes('@')) return false;
  if (text.includes('{{')) return false;
  if (text.includes('${')) return false;
  if (text.match(/^[a-z_][a-z0-9_]*$/i)) return false; // Variable names
  if (text.match(/^\d+$/)) return false; // Numbers only
  if (text.match(/^[^a-zA-Z]*$/)) return false; // No letters
  if (text.includes('console.')) return false;
  if (text.includes('require(')) return false;
  if (text.includes('import ')) return false;
  
  return true;
}

// Function to generate translation key
function generateTranslationKey(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
}

// Function to categorize strings
function categorizeString(text) {
  const lowerText = text.toLowerCase();
  
  if (['login', 'register', 'sign in', 'sign up', 'password', 'email', 'forgot'].some(word => lowerText.includes(word))) {
    return 'auth';
  }
  if (['earnings', 'payment', 'aed', 'total', 'weekly', 'monthly'].some(word => lowerText.includes(word))) {
    return 'earnings';
  }
  if (['trip', 'order', 'delivery', 'pickup', 'navigate', 'customer'].some(word => lowerText.includes(word))) {
    return 'trips';
  }
  if (['profile', 'settings', 'language', 'notifications', 'help'].some(word => lowerText.includes(word))) {
    return 'profile';
  }
  if (['dashboard', 'online', 'offline', 'available', 'location', 'morning', 'evening'].some(word => lowerText.includes(word))) {
    return 'dashboard';
  }
  if (['loading', 'success', 'error', 'warning', 'save', 'cancel', 'submit'].some(word => lowerText.includes(word))) {
    return 'common';
  }
  
  return 'common';
}

// Function to update translation files
function updateTranslationFiles(extractedStrings) {
  const languages = ['en', 'ar'];
  const localesDir = path.join('src', 'i18n', 'locales');
  
  // Create locales directory if it doesn't exist
  if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
  }
  
  languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    let translationData = {};
    
    // Load existing translations
    if (fs.existsSync(filePath)) {
      try {
        translationData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.log(`⚠️  Error reading ${filePath}, creating new file`);
        translationData = {};
      }
    }
    
    let newTranslations = 0;
    
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
        newTranslations++;
      }
    });
    
    // Sort the object by categories and keys for better readability
    const sortedData = {};
    Object.keys(translationData).sort().forEach(category => {
      sortedData[category] = {};
      Object.keys(translationData[category]).sort().forEach(key => {
        sortedData[category][key] = translationData[category][key];
      });
    });
    
    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2), 'utf8');
    console.log(`✅ Updated ${lang}.json with ${newTranslations} new strings`);
  });
}

// Function to show sample replacement for a file
function showSampleReplacement(filePath, extractedStrings) {
  console.log(`\n📄 Sample replacements for ${path.basename(filePath)}:`);
  
  const sampleStrings = extractedStrings.slice(0, 3); // Show first 3 as examples
  
  sampleStrings.forEach(text => {
    const key = generateTranslationKey(text);
    const category = categorizeString(text);
    const translationKey = `${category}.${key}`;
    
    console.log(`   "${text}" → t('${translationKey}')`);
  });
  
  if (extractedStrings.length > 3) {
    console.log(`   ... and ${extractedStrings.length - 3} more strings`);
  }
}

// Main execution function
function main() {
  console.log('🚀 Starting auto-translation script...\n');
  
  // Find all screen files
  const screenFiles = [
    ...findFiles('screens', '.tsx'),
    ...findFiles('screens', '.ts'),
    ...findFiles('components', '.tsx'),
    ...findFiles('components', '.ts')
  ];
  
  console.log(`📁 Found ${screenFiles.length} files to process\n`);
  
  let allExtractedStrings = new Set();
  let fileResults = [];
  
  screenFiles.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`🔍 Processing: ${relativePath}`);
    
    try {
      const strings = extractStringsFromFile(file);
      console.log(`   Found ${strings.length} translatable strings`);
      
      strings.forEach(str => allExtractedStrings.add(str));
      fileResults.push({ file: relativePath, strings });
      
      // Show sample replacements for files with many strings
      if (strings.length > 5) {
        showSampleReplacement(file, strings);
      }
    } catch (error) {
      console.log(`   ❌ Error processing file: ${error.message}`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total files processed: ${screenFiles.length}`);
  console.log(`   Total unique strings found: ${allExtractedStrings.size}`);
  
  // Update translation files
  console.log('\n📝 Updating translation files...');
  updateTranslationFiles(Array.from(allExtractedStrings));
  
  // Generate implementation guide
  generateImplementationGuide(fileResults);
  
  console.log('\n✅ Auto-translation complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the updated translation files in src/i18n/locales/');
  console.log('2. Add useLanguage hook to screens that need translation');
  console.log('3. Replace hardcoded strings with t() function calls');
  console.log('4. Check implementation-guide.md for detailed instructions');
}

// Function to generate implementation guide
function generateImplementationGuide(fileResults) {
  const guide = `# Translation Implementation Guide

## Files with translatable content:

${fileResults.map(result => {
  const category = categorizeString(result.strings[0] || 'common');
  return `### ${result.file}
- **Strings found:** ${result.strings.length}
- **Primary category:** ${category}
- **Sample strings:** ${result.strings.slice(0, 3).join(', ')}

**Required changes:**
1. Add useLanguage hook: \`const { t } = useLanguage();\`
2. Replace strings with t() calls
3. Import translation keys from ${category} category

`;
}).join('')}

## Translation Categories Created:

- **auth**: Login, registration, password-related strings
- **earnings**: Payment, earnings, financial data strings  
- **trips**: Order, delivery, trip-related strings
- **profile**: Settings, profile, user account strings
- **dashboard**: Main dashboard, status, location strings
- **common**: General UI elements, actions, status messages

## Implementation Priority:

1. **High Priority:** Login, Dashboard, Trip screens
2. **Medium Priority:** Profile, Settings screens  
3. **Low Priority:** Help, About, secondary screens

## Usage Examples:

\`\`\`typescript
// Before
<Text>Total Earnings</Text>

// After  
<Text>{t('earnings.total_earnings')}</Text>
\`\`\`

\`\`\`typescript
// Before
Alert.alert('Success', 'Trip completed successfully');

// After
Alert.alert(t('common.success'), t('trips.trip_completed_successfully'));
\`\`\`
`;

  fs.writeFileSync('implementation-guide.md', guide, 'utf8');
  console.log('📖 Generated implementation-guide.md');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  extractStringsFromFile,
  updateTranslationFiles,
  generateTranslationKey,
  categorizeString
};

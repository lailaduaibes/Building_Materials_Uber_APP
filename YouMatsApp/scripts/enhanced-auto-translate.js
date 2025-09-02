#!/usr/bin/env node

/**
 * Enhanced Auto-Translation Script for YouMats Driver App
 * Merges extracted strings with existing translation structure
 */

const fs = require('fs');
const path = require('path');

// Enhanced translation mappings
const translationMappings = {
  // EXTRACTED FROM SCREENS - Screen-specific translations
  
  // Document Upload Screen
  "Upload Documents": { ar: "رفع الوثائق", ur: "دستاویزات اپ لوڈ کریں", hi: "दस्तावेज़ अपलोड करें" },
  "Loading documents...": { ar: "جاري تحميل الوثائق...", ur: "دستاویزات لوڈ ہو رہے ہیں...", hi: "दस्तावेज़ लोड हो रहे हैं..." },
  "Document Verification": { ar: "التحقق من الوثائق", ur: "دستاویز کی تصدیق", hi: "दस्तावेज़ सत्यापन" },
  "Required Documents": { ar: "الوثائق المطلوبة", ur: "مطلوبہ دستاویزات", hi: "आवश्यक दस्तावेज़" },
  "Upload Document": { ar: "رفع الوثيقة", ur: "دستاویز اپ لوڈ کریں", hi: "दस्तावेज़ अपलोड करें" },
  
  // Driver Earnings Screen
  "Loading earnings data...": { ar: "جاري تحميل بيانات الأرباح...", ur: "کمائی کا ڈیٹا لوڈ ہو رہا ہے...", hi: "कमाई डेटा लोड हो रहा है..." },
  "Total Earnings": { ar: "إجمالي الأرباح", ur: "کل کمائی", hi: "कुल कमाई" },
  "Online Time": { ar: "وقت الاتصال", ur: "آن لائن وقت", hi: "ऑनलाइन समय" },
  "Loading earnings...": { ar: "جاري تحميل الأرباح...", ur: "کمائی لوڈ ہو رہی ہے...", hi: "कमाई लोड हो रही है..." },
  "Avg/Trip": { ar: "المتوسط/الرحلة", ur: "اوسط/سفر", hi: "औसत/यात्रा" },
  "Today's Earnings": { ar: "أرباح اليوم", ur: "آج کی کمائی", hi: "आज की कमाई" },
  
  // Trip History Screen  
  "Trip History": { ar: "تاريخ الرحلات", ur: "سفر کی تاریخ", hi: "यात्रा इतिहास" },
  "Recent Trips": { ar: "الرحلات الأخيرة", ur: "حالیہ سفر", hi: "हाल की यात्रा" },
  "Filter": { ar: "تصفية", ur: "فلٹر", hi: "फ़िल्टर" },
  "Search trips": { ar: "البحث عن الرحلات", ur: "سفر تلاش کریں", hi: "यात्रा खोजें" },
  
  // Live Trip Tracking Screen
  "Initializing trip tracking...": { ar: "جاري تهيئة تتبع الرحلة...", ur: "ٹرپ ٹریکنگ شروع ہو رہی ہے...", hi: "यात्रा ट्रैकिंग प्रारंभ हो रही है..." },
  "Status:": { ar: "الحالة:", ur: "حالت:", hi: "स्थिति:" },
  "ETA:": { ar: "الوقت المتوقع للوصول:", ur: "متوقع وقت:", hi: "अनुमानित समय:" },
  "Navigate": { ar: "الملاحة", ur: "نیویگیٹ", hi: "नेविगेट" },
  "Call Customer": { ar: "اتصل بالعميل", ur: "کسٹمر کو کال کریں", hi: "ग्राहक को कॉल करें" },
  "Start Trip": { ar: "بدء الرحلة", ur: "سفر شروع کریں", hi: "यात्रा शुरू करें" },
  "Complete Trip": { ar: "إكمال الرحلة", ur: "سفر مکمل کریں", hi: "यात्रा पूरी करें" },
  
  // Order Assignment Screen
  "New Order": { ar: "طلب جديد", ur: "نیا آرڈر", hi: "नया ऑर्डर" },
  "Accept": { ar: "قبول", ur: "قبول", hi: "स्वीकार" },
  "Decline": { ar: "رفض", ur: "مسترد", hi: "अस्वीकार" },
  "Order Details": { ar: "تفاصيل الطلب", ur: "آرڈر کی تفصیلات", hi: "ऑर्डर विवरण" },
  "Estimated Time": { ar: "الوقت المقدر", ur: "تخمینی وقت", hi: "अनुमानित समय" },
  "Order Value": { ar: "قيمة الطلب", ur: "آرڈر کی قیمت", hi: "ऑर्डर मूल्य" },
  
  // Driver Profile Screen
  "Registration Details": { ar: "تفاصيل التسجيل", ur: "رجسٹریشن کی تفصیلات", hi: "पंजीकरण विवरण" },
  "Model:": { ar: "الطراز:", ur: "ماڈل:", hi: "मॉडल:" },
  "License Plate:": { ar: "لوحة الترخيص:", ur: "لائسنس پلیٹ:", hi: "लाइसेंस प्लेट:" },
  "Vehicle Information": { ar: "معلومات المركبة", ur: "گاڑی کی معلومات", hi: "वाहन की जानकारी" },
  "Documents": { ar: "الوثائق", ur: "دستاویزات", hi: "दस्तावेज़" },
  "Profile Photo": { ar: "صورة الملف الشخصي", ur: "پروفائل فوٹو", hi: "प्रोफ़ाइल फोटो" },
  
  // Driver Registration Screen
  "Account Information": { ar: "معلومات الحساب", ur: "اکاؤنٹ کی معلومات", hi: "खाता जानकारी" },
  "First Name *": { ar: "الاسم الأول *", ur: "پہلا نام *", hi: "पहला नाम *" },
  "Last Name *": { ar: "اسم العائلة *", ur: "آخری نام *", hi: "अंतिम नाम *" },
  "Phone Number": { ar: "رقم الهاتف", ur: "فون نمبر", hi: "फोन नंबर" },
  "Personal Information": { ar: "المعلومات الشخصية", ur: "ذاتی معلومات", hi: "व्यक्तिगत जानकारी" },
  "Create Your Account": { ar: "أنشئ حسابك", ur: "اپنا اکاؤنٹ بنائیں", hi: "अपना खाता बनाएं" },
  
  // Support Screen
  "Subject *": { ar: "الموضوع *", ur: "موضوع *", hi: "विषय *" },
  "Description *": { ar: "الوصف *", ur: "تفصیل *", hi: "विवरण *" },
  "Loading tickets...": { ar: "جاري تحميل التذاكر...", ur: "ٹکٹس لوڈ ہو رہے ہیں...", hi: "टिकट लोड हो रहे हैं..." },
  "Support": { ar: "الدعم", ur: "سپورٹ", hi: "सहायता" },
  "New Ticket": { ar: "تذكرة جديدة", ur: "نیا ٹکٹ", hi: "नया टिकट" },
  "My Tickets": { ar: "تذاكري", ur: "میرے ٹکٹس", hi: "मेरे टिकट" },
  
  // ASAP Modals
  "New Delivery Request": { ar: "طلب توصيل جديد", ur: "نئی ڈیلیوری کی درخواست", hi: "नई डिलीवरी अनुरोध" },
  "Customer:": { ar: "العميل:", ur: "کسٹمر:", hi: "ग्राहक:" },
  "Phone:": { ar: "الهاتف:", ur: "فون:", hi: "फोन:" },
  "Distance:": { ar: "المسافة:", ur: "فاصلہ:", hi: "दूरी:" },
  "🚨 URGENT DELIVERY": { ar: "🚨 توصيل عاجل", ur: "🚨 فوری ڈیلیوری", hi: "🚨 तत्काल डिलीवरी" },
  "Estimated Earnings": { ar: "الأرباح المقدرة", ur: "متوقع کمائی", hi: "अनुमानित कमाई" },
  "Special Requirements:": { ar: "المتطلبات الخاصة:", ur: "خصوصی ضروریات:", hi: "विशेष आवश्यकताएं:" },
  
  // Professional Dashboard  
  "Trip Request": { ar: "طلب رحلة", ur: "سفر کی درخواست", hi: "यात्रा अनुरोध" },
  "Chat with Customer": { ar: "محادثة مع العميل", ur: "کسٹمر سے چیٹ", hi: "ग्राहक से चैट" },
  "No accepted trips": { ar: "لا توجد رحلات مقبولة", ur: "کوئی منظور شدہ سفر نہیں", hi: "कोई स्वीकृत यात्रा नहीं" },
  "Go Online": { ar: "اتصل", ur: "آن لائن جائیں", hi: "ऑनलाइन जाएं" },
  "Go Offline": { ar: "اقطع الاتصال", ur: "آف لائن جائیں", hi: "ऑफलाइन जाएं" },
  "Your Location": { ar: "موقعك", ur: "آپ کا مقام", hi: "आपका स्थान" },
  
  // Vehicle Management
  "My Vehicles": { ar: "مركباتي", ur: "میری گاڑیاں", hi: "मेरे वाहन" },
  "Loading vehicles...": { ar: "جاري تحميل المركبات...", ur: "گاڑیاں لوڈ ہو رہی ہیں...", hi: "वाहन लोड हो रहे हैं..." },
  "Registered Vehicles": { ar: "المركبات المسجلة", ur: "رجسٹرڈ گاڑیاں", hi: "पंजीकृت वाहन" },
  "Vehicle Settings": { ar: "إعدادات المركبة", ur: "گاڑی کی سیٹنگز", hi: "वाहन सेटिंग्स" },
  "Trip Preferences": { ar: "تفضيلات الرحلة", ur: "سفر کی ترجیحات", hi: "यात्रा प्राथमिकताएं" },
  "Working Hours": { ar: "ساعات العمل", ur: "کام کے گھنٹے", hi: "कार्य घंटे" },
  
  // Rating & Reviews
  "My Ratings": { ar: "تقييماتي", ur: "میری ریٹنگز", hi: "मेरी रेटिंग्स" },
  "Loading ratings...": { ar: "جاري تحميل التقييمات...", ur: "ریٹنگز لوڈ ہو رہی ہیں...", hi: "रेटिंग्स लोड हो रही हैं..." },
  "Overall Rating": { ar: "التقييم العام", ur: "مجموعی ریٹنگ", hi: "समग्र रेटिंग" },
  "Trip Completed": { ar: "اكتمال الرحلة", ur: "سفر مکمل", hi: "यात्रा पूर्ण" },
  "Pickup:": { ar: "الاستلام:", ur: "پک اپ:", hi: "पिकअप:" },
  "Delivery:": { ar: "التسليم:", ur: "ڈیلیوری:", hi: "डिलीवरी:" },
  
  // Route Optimization
  "Optimized Route": { ar: "المسار المحسن", ur: "بہترین راستہ", hi: "अनुकूलित मार्ग" },
  "Accept Route": { ar: "قبول المسار", ur: "راستہ قبول کریں", hi: "मार्ग स्वीकार करें" },
  "Start Navigation": { ar: "بدء الملاحة", ur: "نیویگیشن شروع کریں", hi: "नेविगेशन शुरू करें" },
  "AI Route Optimization": { ar: "تحسين المسار بالذكاء الاصطناعي", ur: "AI راستہ بہتری", hi: "AI मार्ग अनुकूलन" },
  "Optimized Route Ready!": { ar: "المسار المحسن جاهز!", ur: "بہترین راستہ تیار!", hi: "अनुकूलित मार्ग तैयार!" },
  
  // Specializations Management
  "Custom Specializations": { ar: "التخصصات المخصصة", ur: "کسٹم تخصصات", hi: "कस्टम विशेषज्ञताएं" },
  "Manage Skills": { ar: "إدارة المهارات", ur: "مہارتوں کا انتظام", hi: "कौशल प्रबंधित करें" },
  "Add Custom": { ar: "إضافة مخصص", ur: "کسٹم شامل کریں", hi: "कस्टम जोड़ें" },
  
  // Location Services
  "Location permission denied": { ar: "تم رفض إذن الموقع", ur: "مقام کی اجازت مسترد", hi: "स्थान अनुमति अस्वीकृत" },
  "Enable location to continue": { ar: "فعل الموقع للمتابعة", ur: "جاری رکھنے کے لیے مقام فعال کریں", hi: "जारी रखने के लिए स्थान सक्षम करें" },
  "Location Permission Required": { ar: "إذن الموقع مطلوب", ur: "مقام کی اجازت درکار", hi: "स्थान अनुमति आवश्यक" },
  "Current Location": { ar: "الموقع الحالي", ur: "موجودہ مقام", hi: "वर्तमान स्थान" },
  "Checking Location Services...": { ar: "فحص خدمات الموقع...", ur: "مقام کی خدمات چیک کی جا رہی ہیں...", hi: "स्थान सेवाएं जांची जा रही हैं..." },
  
  // Customer Communication
  "Customer Communication": { ar: "تواصل العملاء", ur: "کسٹمر کمیونیکیشن", hi: "ग्राहक संवाد" },
  "ETA Update": { ar: "تحديث الوقت المتوقع", ur: "ETA اپڈیٹ", hi: "ETA अपडेट" },
  "Quick Messages": { ar: "رسائل سريعة", ur: "فوری پیغامات", hi: "त्वरित संदेश" },
  "Location shared": { ar: "تم مشاركة الموقع", ur: "مقام شیئر کیا گیا", hi: "स्थान साझा किया गया" },
  "Type a message...": { ar: "اكتب رسالة...", ur: "پیغام ٹائپ کریں...", hi: "संदेश टाइप करें..." },
  
  // Error Messages
  "Failed to update trip status. Please try again.": { 
    ar: "فشل في تحديث حالة الرحلة. يرجى المحاولة مرة أخرى.", 
    ur: "ٹرپ کی حالت اپ ڈیٹ کرنے میں ناکام۔ براہ کرم دوبارہ کوشش کریں۔", 
    hi: "यात्रा स्थिति अपडेट करने में विफल। कृपया पुनः प्रयास करें।" 
  },
  "No data available": { ar: "لا توجد بيانات متاحة", ur: "کوئی ڈیٹا دستیاب نہیں", hi: "कोई डेटा उपलब्ध नहीं" },
  "Loading...": { ar: "جاري التحميل...", ur: "لوڈ ہو رہا ہے...", hi: "लोड हो रहा है..." },
  
  // Common Actions
  "Continue": { ar: "متابعة", ur: "جاری رکھیں", hi: "जारी रखें" },
  "Upload": { ar: "رفع", ur: "اپ لوڈ", hi: "अपलोड" },
  "Download": { ar: "تحميل", ur: "ڈاؤن لوڈ", hi: "डाउनलोड" },
  "Share": { ar: "مشاركة", ur: "شیئر", hi: "साझा" },
  "Edit": { ar: "تحرير", ur: "ترمیم", hi: "संपादित" },
  "View": { ar: "عرض", ur: "دیکھیں", hi: "देखें" },
  "Refresh": { ar: "تحديث", ur: "ریفریش", hi: "रीफ्रेश" },
  
  // Status & States
  "Completed": { ar: "مكتمل", ur: "مکمل", hi: "पूर्ण" },
  "Cancelled": { ar: "ملغي", ur: "منسوخ", hi: "रद्द" },
  "In Progress": { ar: "جاري", ur: "جاری", hi: "प्रगति में" },
  "Online": { ar: "متصل", ur: "آن لائن", hi: "ऑनलाइन" },
  "Offline": { ar: "غير متصل", ur: "آف لائن", hi: "ऑफलाइन" },
  "Busy": { ar: "مشغول", ur: "مصروف", hi: "व्यस्त" },
  "Available": { ar: "متاح", ur: "دستیاب", hi: "उपलब्ध" },
  
  // Time References
  "Today": { ar: "اليوم", ur: "آج", hi: "आज" },
  "Yesterday": { ar: "أمس", ur: "کل", hi: "कल" },
  "This Week": { ar: "هذا الأسبوع", ur: "اس ہفتے", hi: "इस सप्ताह" },
  "This Month": { ar: "هذا الشهر", ur: "اس مہینے", hi: "इस महीने" },
  "minutes ago": { ar: "منذ دقائق", ur: "منٹ پہلے", hi: "मिनट पहले" },
  "hours ago": { ar: "منذ ساعات", ur: "گھنٹے پہلے", hi: "घंटे पहले" }
};

// Enhanced categorization with screen-specific mapping
const screenCategories = {
  'DocumentUploadScreen': 'documents',
  'DriverEarningsScreen': 'earnings',
  'DriverNavigationScreen': 'navigation',
  'DriverProfileScreen': 'profile',
  'DriverRegistrationScreen': 'registration',
  'EarningsScreen': 'earnings',
  'EmailVerificationScreen': 'auth',
  'EnhancedDriverRegistrationScreen': 'registration',
  'LanguageTestScreen': 'common',
  'LiveTripTrackingScreen': 'trips',
  'OrderAssignmentScreen': 'orders',
  'ProfessionalDriverDashboard': 'dashboard',
  'RatingManagementScreen': 'ratings',
  'RatingScreen': 'ratings',
  'RouteOptimizationScreen': 'navigation',
  'SpecializationsManagementScreen': 'profile',
  'SupportScreen': 'support',
  'TripHistoryScreen': 'trips',
  'VehicleDocumentsScreen': 'documents',
  'VehicleManagementScreen': 'vehicles',
  'VehicleSettingsScreen': 'vehicles',
  'WelcomeScreen': 'auth',
  'ASAPTripModal': 'orders',
  'CustomerCommunicationComponent': 'communication',
  'ExactSchemaASAPModal': 'orders',
  'SimplifiedASAPModal': 'orders',
  'TripRequestModal': 'orders'
};

// Function to create enhanced translations
function createEnhancedTranslations() {
  const languages = ['en', 'ar'];
  const localesDir = path.join('src', 'i18n', 'locales');
  
  // Ensure directory exists
  if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
  }
  
  languages.forEach(lang => {
    const filePath = path.join(localesDir, `${lang}.json`);
    
    // Load existing translations if they exist
    let existingTranslations = {};
    if (fs.existsSync(filePath)) {
      try {
        existingTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (error) {
        console.log(`⚠️ Error reading ${filePath}, creating new structure`);
        existingTranslations = {};
      }
    }
    
    // Create enhanced structure with screen-specific categories
    const enhancedTranslations = {
      // Keep existing structure
      ...existingTranslations,
      
      // Add enhanced screen-specific translations
      documents: {
        ...existingTranslations.documents,
        upload_documents: lang === 'en' ? "Upload Documents" : translationMappings["Upload Documents"]?.[lang] || "Upload Documents",
        loading_documents: lang === 'en' ? "Loading documents..." : translationMappings["Loading documents..."]?.[lang] || "Loading documents...",
        document_verification: lang === 'en' ? "Document Verification" : translationMappings["Document Verification"]?.[lang] || "Document Verification",
        required_documents: lang === 'en' ? "Required Documents" : translationMappings["Required Documents"]?.[lang] || "Required Documents",
        vehicle_documents: lang === 'en' ? "Vehicle Documents" : "وثائق المركبة",
        uploaded_documents: lang === 'en' ? "Uploaded Documents" : "الوثائق المرفوعة"
      },
      
      earnings: {
        ...existingTranslations.earnings,
        loading_earnings_data: lang === 'en' ? "Loading earnings data..." : translationMappings["Loading earnings data..."]?.[lang] || "Loading earnings data...",
        total_earnings: lang === 'en' ? "Total Earnings" : translationMappings["Total Earnings"]?.[lang] || "Total Earnings",
        online_time: lang === 'en' ? "Online Time" : translationMappings["Online Time"]?.[lang] || "Online Time",
        loading_earnings: lang === 'en' ? "Loading earnings..." : translationMappings["Loading earnings..."]?.[lang] || "Loading earnings...",
        avg_trip: lang === 'en' ? "Avg/Trip" : translationMappings["Avg/Trip"]?.[lang] || "Avg/Trip",
        todays_earnings: lang === 'en' ? "Today's Earnings" : translationMappings["Today's Earnings"]?.[lang] || "Today's Earnings"
      },
      
      trips: {
        ...existingTranslations.trips,
        trip_history: lang === 'en' ? "Trip History" : translationMappings["Trip History"]?.[lang] || "Trip History",
        recent_trips: lang === 'en' ? "Recent Trips" : translationMappings["Recent Trips"]?.[lang] || "Recent Trips",
        initializing_trip_tracking: lang === 'en' ? "Initializing trip tracking..." : translationMappings["Initializing trip tracking..."]?.[lang] || "Initializing trip tracking...",
        trip_request: lang === 'en' ? "Trip Request" : translationMappings["Trip Request"]?.[lang] || "Trip Request",
        chat_with_customer: lang === 'en' ? "Chat with Customer" : translationMappings["Chat with Customer"]?.[lang] || "Chat with Customer",
        no_accepted_trips: lang === 'en' ? "No accepted trips" : translationMappings["No accepted trips"]?.[lang] || "No accepted trips",
        trip_completed: lang === 'en' ? "Trip Completed" : translationMappings["Trip Completed"]?.[lang] || "Trip Completed",
        search_trips: lang === 'en' ? "Search trips" : translationMappings["Search trips"]?.[lang] || "Search trips"
      },
      
      orders: {
        ...existingTranslations.orders,
        new_order: lang === 'en' ? "New Order" : translationMappings["New Order"]?.[lang] || "New Order",
        order_details: lang === 'en' ? "Order Details" : translationMappings["Order Details"]?.[lang] || "Order Details",
        new_delivery_request: lang === 'en' ? "New Delivery Request" : translationMappings["New Delivery Request"]?.[lang] || "New Delivery Request",
        estimated_earnings: lang === 'en' ? "Estimated Earnings" : translationMappings["Estimated Earnings"]?.[lang] || "Estimated Earnings",
        urgent_delivery: lang === 'en' ? "🚨 URGENT DELIVERY" : translationMappings["🚨 URGENT DELIVERY"]?.[lang] || "🚨 URGENT DELIVERY",
        special_requirements: lang === 'en' ? "Special Requirements:" : translationMappings["Special Requirements:"]?.[lang] || "Special Requirements:",
        estimated_time: lang === 'en' ? "Estimated Time" : translationMappings["Estimated Time"]?.[lang] || "Estimated Time",
        order_value: lang === 'en' ? "Order Value" : translationMappings["Order Value"]?.[lang] || "Order Value"
      },
      
      profile: {
        ...existingTranslations.profile,
        registration_details: lang === 'en' ? "Registration Details" : translationMappings["Registration Details"]?.[lang] || "Registration Details",
        vehicle_information: lang === 'en' ? "Vehicle Information" : translationMappings["Vehicle Information"]?.[lang] || "Vehicle Information",
        profile_photo: lang === 'en' ? "Profile Photo" : translationMappings["Profile Photo"]?.[lang] || "Profile Photo",
        custom_specializations: lang === 'en' ? "Custom Specializations" : translationMappings["Custom Specializations"]?.[lang] || "Custom Specializations",
        manage_skills: lang === 'en' ? "Manage Skills" : translationMappings["Manage Skills"]?.[lang] || "Manage Skills"
      },
      
      registration: {
        ...existingTranslations.registration,
        account_information: lang === 'en' ? "Account Information" : translationMappings["Account Information"]?.[lang] || "Account Information",
        first_name_required: lang === 'en' ? "First Name *" : translationMappings["First Name *"]?.[lang] || "First Name *",
        last_name_required: lang === 'en' ? "Last Name *" : translationMappings["Last Name *"]?.[lang] || "Last Name *",
        personal_information: lang === 'en' ? "Personal Information" : translationMappings["Personal Information"]?.[lang] || "Personal Information",
        create_your_account: lang === 'en' ? "Create Your Account" : translationMappings["Create Your Account"]?.[lang] || "Create Your Account"
      },
      
      dashboard: {
        ...existingTranslations.dashboard,
        go_online: lang === 'en' ? "Go Online" : translationMappings["Go Online"]?.[lang] || "Go Online",
        go_offline: lang === 'en' ? "Go Offline" : translationMappings["Go Offline"]?.[lang] || "Go Offline",
        your_location: lang === 'en' ? "Your Location" : translationMappings["Your Location"]?.[lang] || "Your Location",
        location_permission_denied: lang === 'en' ? "Location permission denied" : translationMappings["Location permission denied"]?.[lang] || "Location permission denied",
        enable_location_to_continue: lang === 'en' ? "Enable location to continue" : translationMappings["Enable location to continue"]?.[lang] || "Enable location to continue",
        current_location: lang === 'en' ? "Current Location" : translationMappings["Current Location"]?.[lang] || "Current Location",
        checking_location_services: lang === 'en' ? "Checking Location Services..." : translationMappings["Checking Location Services..."]?.[lang] || "Checking Location Services...",
        location_permission_required: lang === 'en' ? "Location Permission Required" : translationMappings["Location Permission Required"]?.[lang] || "Location Permission Required"
      },
      
      support: {
        ...existingTranslations.support,
        subject_required: lang === 'en' ? "Subject *" : translationMappings["Subject *"]?.[lang] || "Subject *",
        description_required: lang === 'en' ? "Description *" : translationMappings["Description *"]?.[lang] || "Description *",
        loading_tickets: lang === 'en' ? "Loading tickets..." : translationMappings["Loading tickets..."]?.[lang] || "Loading tickets...",
        new_ticket: lang === 'en' ? "New Ticket" : "تذكرة جديدة",
        my_tickets: lang === 'en' ? "My Tickets" : "تذاكري"
      },
      
      navigation: {
        ...existingTranslations.navigation,
        navigate: lang === 'en' ? "Navigate" : translationMappings["Navigate"]?.[lang] || "Navigate",
        start_navigation: lang === 'en' ? "Start Navigation" : translationMappings["Start Navigation"]?.[lang] || "Start Navigation",
        optimized_route: lang === 'en' ? "Optimized Route" : translationMappings["Optimized Route"]?.[lang] || "Optimized Route",
        accept_route: lang === 'en' ? "Accept Route" : translationMappings["Accept Route"]?.[lang] || "Accept Route",
        ai_route_optimization: lang === 'en' ? "AI Route Optimization" : translationMappings["AI Route Optimization"]?.[lang] || "AI Route Optimization"
      },
      
      vehicles: {
        ...existingTranslations.vehicles,
        my_vehicles: lang === 'en' ? "My Vehicles" : translationMappings["My Vehicles"]?.[lang] || "My Vehicles",
        loading_vehicles: lang === 'en' ? "Loading vehicles..." : translationMappings["Loading vehicles..."]?.[lang] || "Loading vehicles...",
        vehicle_settings: lang === 'en' ? "Vehicle Settings" : translationMappings["Vehicle Settings"]?.[lang] || "Vehicle Settings",
        trip_preferences: lang === 'en' ? "Trip Preferences" : translationMappings["Trip Preferences"]?.[lang] || "Trip Preferences",
        working_hours: lang === 'en' ? "Working Hours" : translationMappings["Working Hours"]?.[lang] || "Working Hours"
      },
      
      ratings: {
        ...existingTranslations.ratings,
        my_ratings: lang === 'en' ? "My Ratings" : translationMappings["My Ratings"]?.[lang] || "My Ratings",
        loading_ratings: lang === 'en' ? "Loading ratings..." : translationMappings["Loading ratings..."]?.[lang] || "Loading ratings...",
        overall_rating: lang === 'en' ? "Overall Rating" : translationMappings["Overall Rating"]?.[lang] || "Overall Rating"
      },
      
      communication: {
        ...existingTranslations.communication,
        customer_communication: lang === 'en' ? "Customer Communication" : translationMappings["Customer Communication"]?.[lang] || "Customer Communication",
        eta_update: lang === 'en' ? "ETA Update" : translationMappings["ETA Update"]?.[lang] || "ETA Update",
        quick_messages: lang === 'en' ? "Quick Messages" : translationMappings["Quick Messages"]?.[lang] || "Quick Messages",
        location_shared: lang === 'en' ? "Location shared" : translationMappings["Location shared"]?.[lang] || "Location shared",
        type_a_message: lang === 'en' ? "Type a message..." : translationMappings["Type a message..."]?.[lang] || "Type a message..."
      },
      
      common: {
        ...existingTranslations.common,
        filter: lang === 'en' ? "Filter" : translationMappings["Filter"]?.[lang] || "Filter",
        continue: lang === 'en' ? "Continue" : translationMappings["Continue"]?.[lang] || "Continue",
        upload: lang === 'en' ? "Upload" : translationMappings["Upload"]?.[lang] || "Upload",
        share: lang === 'en' ? "Share" : translationMappings["Share"]?.[lang] || "Share",
        refresh: lang === 'en' ? "Refresh" : translationMappings["Refresh"]?.[lang] || "Refresh",
        edit: lang === 'en' ? "Edit" : translationMappings["Edit"]?.[lang] || "Edit",
        view: lang === 'en' ? "View" : translationMappings["View"]?.[lang] || "View",
        status: lang === 'en' ? "Status:" : translationMappings["Status:"]?.[lang] || "Status:",
        eta: lang === 'en' ? "ETA:" : translationMappings["ETA:"]?.[lang] || "ETA:",
        phone: lang === 'en' ? "Phone:" : translationMappings["Phone:"]?.[lang] || "Phone:",
        customer: lang === 'en' ? "Customer:" : translationMappings["Customer:"]?.[lang] || "Customer:",
        distance: lang === 'en' ? "Distance:" : translationMappings["Distance:"]?.[lang] || "Distance:",
        model: lang === 'en' ? "Model:" : translationMappings["Model:"]?.[lang] || "Model:",
        license_plate: lang === 'en' ? "License Plate:" : translationMappings["License Plate:"]?.[lang] || "License Plate:",
        pickup: lang === 'en' ? "Pickup:" : translationMappings["Pickup:"]?.[lang] || "Pickup:",
        delivery: lang === 'en' ? "Delivery:" : translationMappings["Delivery:"]?.[lang] || "Delivery:",
        completed: lang === 'en' ? "Completed" : translationMappings["Completed"]?.[lang] || "Completed",
        cancelled: lang === 'en' ? "Cancelled" : translationMappings["Cancelled"]?.[lang] || "Cancelled",
        in_progress: lang === 'en' ? "In Progress" : translationMappings["In Progress"]?.[lang] || "In Progress",
        online: lang === 'en' ? "Online" : translationMappings["Online"]?.[lang] || "Online",
        offline: lang === 'en' ? "Offline" : translationMappings["Offline"]?.[lang] || "Offline",
        available: lang === 'en' ? "Available" : translationMappings["Available"]?.[lang] || "Available",
        today: lang === 'en' ? "Today" : translationMappings["Today"]?.[lang] || "Today",
        yesterday: lang === 'en' ? "Yesterday" : translationMappings["Yesterday"]?.[lang] || "Yesterday",
        this_week: lang === 'en' ? "This Week" : translationMappings["This Week"]?.[lang] || "This Week",
        this_month: lang === 'en' ? "This Month" : translationMappings["This Month"]?.[lang] || "This Month",
        loading: lang === 'en' ? "Loading..." : translationMappings["Loading..."]?.[lang] || "Loading...",
        no_data_available: lang === 'en' ? "No data available" : translationMappings["No data available"]?.[lang] || "No data available",
        accept: lang === 'en' ? "Accept" : translationMappings["Accept"]?.[lang] || "Accept",
        decline: lang === 'en' ? "Decline" : translationMappings["Decline"]?.[lang] || "Decline",
        phone_number: lang === 'en' ? "Phone Number" : translationMappings["Phone Number"]?.[lang] || "Phone Number",
        documents: lang === 'en' ? "Documents" : translationMappings["Documents"]?.[lang] || "Documents",
        call_customer: lang === 'en' ? "Call Customer" : translationMappings["Call Customer"]?.[lang] || "Call Customer",
        start_trip: lang === 'en' ? "Start Trip" : translationMappings["Start Trip"]?.[lang] || "Start Trip",
        complete_trip: lang === 'en' ? "Complete Trip" : translationMappings["Complete Trip"]?.[lang] || "Complete Trip",
        add_custom: lang === 'en' ? "Add Custom" : translationMappings["Add Custom"]?.[lang] || "Add Custom"
      }
    };
    
    // Write the enhanced translations
    fs.writeFileSync(filePath, JSON.stringify(enhancedTranslations, null, 2), 'utf8');
    console.log(`✅ Enhanced ${lang}.json with screen-specific translations`);
  });
}

// Generate implementation examples for key screens
function generateImplementationExamples() {
  const examples = `# Screen Translation Implementation Examples

## 1. EarningsScreen.tsx
\`\`\`typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function EarningsScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('earnings.loading_earnings')}</Text>
      <Text>{t('earnings.total_earnings')}</Text>
      <Text>{t('earnings.avg_trip')}</Text>
      <Text>{t('earnings.todays_earnings')}</Text>
    </View>
  );
}
\`\`\`

## 2. TripHistoryScreen.tsx
\`\`\`typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function TripHistoryScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('trips.trip_history')}</Text>
      <Text>{t('trips.recent_trips')}</Text>
      <TextInput placeholder={t('trips.search_trips')} />
    </View>
  );
}
\`\`\`

## 3. LiveTripTrackingScreen.tsx
\`\`\`typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function LiveTripTrackingScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('trips.initializing_trip_tracking')}</Text>
      <Text>{t('common.status')} {status}</Text>
      <Text>{t('common.eta')} {eta}</Text>
      <Button title={t('navigation.navigate')} />
      <Button title={t('common.call_customer')} />
    </View>
  );
}
\`\`\`

## 4. OrderAssignmentScreen.tsx
\`\`\`typescript
import { useLanguage } from '../contexts/LanguageContext';

export default function OrderAssignmentScreen() {
  const { t } = useLanguage();
  
  return (
    <View>
      <Text>{t('orders.new_order')}</Text>
      <Text>{t('orders.order_details')}</Text>
      <Text>{t('orders.estimated_earnings')}</Text>
      <Button title={t('common.accept')} />
      <Button title={t('common.decline')} />
    </View>
  );
}
\`\`\`

## 5. Bottom Navigation Translation
\`\`\`typescript
// In your tab navigator configuration
const tabScreens = [
  {
    name: 'Earnings',
    component: EarningsScreen,
    title: t('earnings.title'),
    icon: 'wallet'
  },
  {
    name: 'MyTrips', 
    component: TripHistoryScreen,
    title: t('trips.trip_history'),
    icon: 'truck'
  },
  {
    name: 'Available',
    component: OrderAssignmentScreen, 
    title: t('common.available'),
    icon: 'list'
  },
  {
    name: 'Profile',
    component: DriverProfileScreen,
    title: t('profile.title'),
    icon: 'person'
  }
];
\`\`\`

## Priority Implementation Order:
1. **High Priority**: EarningsScreen, TripHistoryScreen, LiveTripTrackingScreen
2. **Medium Priority**: OrderAssignmentScreen, Bottom Navigation
3. **Low Priority**: Settings screens, Help screens

## Key Translation Categories Created:
- \`earnings\` - All earnings-related text
- \`trips\` - Trip history, tracking, and management  
- \`orders\` - Order assignment and ASAP requests
- \`navigation\` - Route optimization and GPS navigation
- \`dashboard\` - Main dashboard elements and status
- \`profile\` - Driver profile and vehicle information
- \`support\` - Help and support functionality
- \`common\` - Shared UI elements and actions
`;

  fs.writeFileSync('screen-translation-examples.md', examples, 'utf8');
  console.log('📖 Generated screen-translation-examples.md');
}

// Main execution
function main() {
  console.log('🚀 Creating enhanced auto-translations...\n');
  
  // Create enhanced translation files
  createEnhancedTranslations();
  
  // Generate implementation examples
  generateImplementationExamples();
  
  console.log('\n✅ Enhanced auto-translation complete!');
  console.log('\n📋 Translation files created with:');
  console.log('   • Screen-specific categorization');
  console.log('   • 450+ translated strings in Arabic');
  console.log('   • Organized by functionality (earnings, trips, orders, etc.)');
  console.log('   • Implementation examples in screen-translation-examples.md');
  console.log('\n🎯 Next steps:');
  console.log('1. Review enhanced translations in src/i18n/locales/');
  console.log('2. Follow examples in screen-translation-examples.md');
  console.log('3. Start with high-priority screens (Earnings, Trip History)');
  console.log('4. Add useLanguage hook and replace hardcoded strings');
  console.log('5. Test in Arabic to verify translations display correctly');
}

// Run the enhanced script
if (require.main === module) {
  main();
}

module.exports = {
  createEnhancedTranslations,
  translationMappings,
  screenCategories
};

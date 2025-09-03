// Fix Arabic translations by ensuring the correct earnings keys exist
const fs = require('fs');
const path = require('path');

// Read the current Arabic file
const arPath = path.join(__dirname, 'src', 'i18n', 'locales', 'ar.json');
const arContent = fs.readFileSync(arPath, 'utf8');
const arData = JSON.parse(arContent);

// Check current earnings structure
console.log('=== CURRENT EARNINGS STRUCTURE ===');
console.log('Main earnings keys:', Object.keys(arData.earnings || {}));
console.log('Dashboard earnings keys:', Object.keys(arData.dashboard?.earnings || {}));

// Add missing keys to the main earnings section
if (arData.earnings) {
  // Ensure all required keys exist
  const requiredKeys = {
    'today': 'اليوم',
    'week': 'الأسبوع', 
    'month': 'الشهر',
    'cash_out': 'سحب نقدي',
    'tax_docs': 'الوثائق الضريبية',
    'trip_details': 'تفاصيل الرحلة',
    'recent_payouts': 'المدفوعات الأخيرة',
    'total_earnings': 'إجمالي الأرباح',
    'online_time': 'متصل',
    'avg_trip': 'متوسط/رحلة',
    'loading_earnings': 'جاري تحميل الأرباح...',
    'title': 'الأرباح',
    'cash_out_coming_soon': 'ميزة السحب النقدي الفوري قريباً',
    'tax_documents': 'الوثائق الضريبية',
    'download_tax_docs': 'تحميل الوثائق الضريبية',
    'view_trip_breakdown': 'عرض تفصيل الرحلات',
    'contact_support': 'اتصل بالدعم لأسئلة الأرباح',
    'payout_details': 'تفاصيل المدفوعات',
    'view_complete_history': 'عرض التاريخ الكامل للمدفوعات'
  };

  // Add missing keys
  for (const [key, value] of Object.entries(requiredKeys)) {
    if (!arData.earnings[key]) {
      arData.earnings[key] = value;
      console.log(`✅ Added missing key: earnings.${key}`);
    }
  }
}

// Remove any duplicate earnings sections in dashboard
if (arData.dashboard && arData.dashboard.earnings) {
  delete arData.dashboard.earnings;
  console.log('✅ Removed dashboard.earnings duplicate');
}

// Write the fixed file
fs.writeFileSync(arPath, JSON.stringify(arData, null, 2), 'utf8');
console.log('✅ Fixed Arabic translation file');

// Test the result
const testData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
console.log('\n=== VERIFICATION ===');
console.log('earnings.today:', testData.earnings.today);
console.log('earnings.week:', testData.earnings.week);
console.log('earnings.month:', testData.earnings.month);
console.log('earnings.cash_out:', testData.earnings.cash_out);

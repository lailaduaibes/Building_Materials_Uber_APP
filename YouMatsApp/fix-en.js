// Fix English translations 
const fs = require('fs');
const path = require('path');

// Read the English file
const enPath = path.join(__dirname, 'src', 'i18n', 'locales', 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Add missing keys to the main earnings section
if (enData.earnings) {
  const requiredKeys = {
    'today': 'Today',
    'week': 'Week', 
    'month': 'Month',
    'cash_out': 'Cash Out',
    'tax_docs': 'Tax Docs',
    'trip_details': 'Trip Details',
    'recent_payouts': 'Recent Payouts',
    'cash_out_coming_soon': 'Instant cash out feature coming soon',
    'tax_documents': 'Tax Documents',
    'download_tax_docs': 'Download tax documents',
    'view_trip_breakdown': 'View detailed trip breakdown',
    'contact_support': 'Contact support for earnings questions',
    'payout_details': 'Payout Details',
    'view_complete_history': 'View complete payout history'
  };

  // Add missing keys
  for (const [key, value] of Object.entries(requiredKeys)) {
    if (!enData.earnings[key]) {
      enData.earnings[key] = value;
      console.log(`✅ Added missing EN key: earnings.${key}`);
    }
  }
}

// Write the fixed file
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), 'utf8');
console.log('✅ Fixed English translation file');

// Test the result
const testData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
console.log('\n=== EN VERIFICATION ===');
console.log('earnings.today:', testData.earnings.today);
console.log('earnings.week:', testData.earnings.week);
console.log('earnings.cash_out:', testData.earnings.cash_out);

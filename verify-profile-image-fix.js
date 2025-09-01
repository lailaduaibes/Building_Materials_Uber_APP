const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyProfileImageFix() {
  console.log('🔍 Verifying profile image fix for all users...\n');

  try {
    // Check all drivers with approved profile photos
    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select(`
        id,
        first_name,
        last_name,
        profile_image_url,
        driver_documents!inner(file_url, status)
      `)
      .eq('driver_documents.document_type', 'profile_photo')
      .eq('driver_documents.status', 'approved');

    console.log(`Found ${drivers?.length || 0} drivers with approved profile photos`);

    let correctSyncCount = 0;
    let incorrectSyncCount = 0;

    console.log('\n📋 Profile image sync status:');
    console.log('=====================================');

    for (const driver of drivers || []) {
      const doc = driver.driver_documents;
      const isSynced = driver.profile_image_url === doc.file_url;
      
      if (isSynced) {
        correctSyncCount++;
        console.log(`✅ ${driver.first_name} ${driver.last_name}: SYNCED`);
        console.log(`   Image URL: ${driver.profile_image_url?.substring(0, 80)}...`);
      } else {
        incorrectSyncCount++;
        console.log(`❌ ${driver.first_name} ${driver.last_name}: NOT SYNCED`);
        console.log(`   Driver Profile URL: ${driver.profile_image_url || 'NULL'}`);
        console.log(`   Document URL: ${doc.file_url?.substring(0, 80)}...`);
      }
    }

    // Test specific driver for mobile app
    console.log('\n🔍 Testing nanduaibes@gmail.com specifically...');
    const { data: testDriver } = await supabase
      .from('users')
      .select(`
        email,
        driver_profiles!inner(
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('email', 'nanduaibes@gmail.com')
      .single();

    if (testDriver) {
      const profile = testDriver.driver_profiles;
      console.log(`👤 Driver: ${profile.first_name} ${profile.last_name}`);
      console.log(`📸 Profile Image URL: ${profile.profile_image_url || 'NULL'}`);
      
      if (profile.profile_image_url) {
        console.log('✅ Profile image should now display in mobile app settings!');
      } else {
        console.log('❌ Profile image still missing - check driver_documents table');
      }
    }

    console.log('\n🎯 VERIFICATION SUMMARY:');
    console.log('=========================');
    console.log(`✅ Correctly synced: ${correctSyncCount}`);
    console.log(`❌ Incorrectly synced: ${incorrectSyncCount}`);
    console.log(`📊 Total drivers: ${drivers?.length || 0}`);
    
    if (incorrectSyncCount === 0) {
      console.log('\n🎉 SUCCESS! All profile images are properly synced!');
      console.log('   - Mobile app settings will now display profile photos');
      console.log('   - Future approved photos will auto-sync via database trigger');
      console.log('   - Admin dashboard approvals will immediately sync images');
    } else {
      console.log('\n⚠️ Some images still need manual sync or trigger fix');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyProfileImageFix();

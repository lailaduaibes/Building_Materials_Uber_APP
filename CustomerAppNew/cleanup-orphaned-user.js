// Manual cleanup script for orphaned users
// This script helps fix the "duplicate key" error by cleaning up orphaned user records

const { createClient } = require('@supabase/supabase-js');

// Configure Supabase
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA3NzAsImV4cCI6MjA1MDI4Njc3MH0.hxjZ7PJaWrVCdkjnDJNrOdFDfshJE-8BjGMBJQT2E5k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupOrphanedUser(email) {
  try {
    console.log(`\n🧹 Cleaning up orphaned user for email: ${email}`);
    
    // Check if user exists in custom table
    const { data: customUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .eq('email', email);
    
    if (checkError) {
      console.log('❌ Error checking custom users:', checkError.message);
      return;
    }
    
    if (!customUsers || customUsers.length === 0) {
      console.log('✅ No user found in custom table - email is clean');
      return;
    }
    
    if (customUsers.length > 1) {
      console.log('⚠️ Multiple users found! Manual review needed:');
      customUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Created: ${user.created_at}`);
      });
      return;
    }
    
    const orphanedUser = customUsers[0];
    console.log(`📋 Found user in custom table:`);
    console.log(`   ID: ${orphanedUser.id}`);
    console.log(`   Name: ${orphanedUser.first_name} ${orphanedUser.last_name}`);
    console.log(`   Created: ${orphanedUser.created_at}`);
    
    // Delete the orphaned user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', orphanedUser.id);
    
    if (deleteError) {
      console.log('❌ Failed to delete orphaned user:', deleteError.message);
      return;
    }
    
    console.log('✅ Orphaned user record deleted successfully!');
    console.log('📧 Email is now free for registration');
    
  } catch (error) {
    console.error('💥 Error during cleanup:', error);
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node cleanup-orphaned-user.js <email>');
    console.log('Example: node cleanup-orphaned-user.js user@example.com');
    console.log('');
    console.log('This script removes orphaned user records from the custom users table');
    console.log('when the corresponding Supabase Auth user has been deleted.');
    return;
  }
  
  console.log('🚀 Orphaned User Cleanup Tool');
  console.log('=============================');
  console.log('');
  console.log('This happens when:');
  console.log('1. User was deleted from Supabase Auth (admin panel)');
  console.log('2. But the record remains in custom users table');
  console.log('3. New registration fails with "duplicate key" error');
  console.log('');
  
  await cleanupOrphanedUser(email);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupOrphanedUser };

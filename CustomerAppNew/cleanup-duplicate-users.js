// Cleanup script for duplicate users - run this if you get duplicate key errors
// This script helps clean up any inconsistencies between Supabase Auth and custom users table

const { createClient } = require('@supabase/supabase-js');

// Configure Supabase
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA3NzAsImV4cCI6MjA1MDI4Njc3MH0.hxjZ7PJaWrVCdkjnDJNrOdFDfshJE-8BjGMBJQT2E5k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserConsistency(email) {
  try {
    console.log(`\n🔍 Checking consistency for email: ${email}`);
    
    // Check Supabase Auth users
    console.log('📊 Checking Supabase Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Cannot access auth users (need service key for admin functions)');
    } else {
      const authUser = authUsers.users.find(u => u.email === email);
      console.log('Auth user:', authUser ? `Found (ID: ${authUser.id})` : 'Not found');
    }
    
    // Check custom users table
    console.log('📊 Checking custom users table...');
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email);
    
    if (customError) {
      console.log('❌ Error checking custom users:', customError.message);
    } else {
      console.log(`Custom users found: ${customUsers.length}`);
      customUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.first_name} ${user.last_name}`);
      });
    }
    
    return { customUsers: customUsers || [] };
    
  } catch (error) {
    console.error('Error checking consistency:', error);
  }
}

async function cleanupDuplicateUser(email) {
  try {
    console.log(`\n🧹 Cleaning up duplicate users for: ${email}`);
    
    // First check what exists
    const result = await checkUserConsistency(email);
    
    if (result.customUsers.length > 1) {
      console.log('⚠️ Multiple users found in custom table - manual cleanup needed');
      console.log('Please review which user should be kept and delete the others manually');
      return;
    }
    
    if (result.customUsers.length === 1) {
      console.log('✅ Only one user in custom table - no cleanup needed');
      return;
    }
    
    console.log('ℹ️ No users found in custom table');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Main function
async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: node cleanup-duplicate-users.js <email>');
    console.log('Example: node cleanup-duplicate-users.js user@example.com');
    return;
  }
  
  console.log('🚀 User Consistency Checker');
  console.log('==========================');
  
  await checkUserConsistency(email);
  
  console.log('\n📝 Recommendations:');
  console.log('1. If you see "duplicate key value" errors, try registering with a different email');
  console.log('2. If you need to use the same email, contact support to clean up the data');
  console.log('3. For testing, use unique email addresses like: test+1@example.com, test+2@example.com');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkUserConsistency, cleanupDuplicateUser };

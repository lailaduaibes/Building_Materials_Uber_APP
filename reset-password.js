// Reset password script for development
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPassword() {
  try {
    const email = 'lailaghassan2001@gmail.com';
    const newPassword = 'Hatelove@1412';
    
    // Hash the new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('New password hash:', hashedPassword);
    
    // Update the user's password and ensure they're active
    const { data, error } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        is_active: true,
        email_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error('Error updating user:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Password reset successfully for:', email);
      console.log('User status:', {
        id: data[0].id,
        email: data[0].email,
        is_active: data[0].is_active,
        email_verified: data[0].email_verified,
        first_name: data[0].first_name,
        last_name: data[0].last_name
      });
    } else {
      console.log('❌ No user found with email:', email);
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

resetPassword();

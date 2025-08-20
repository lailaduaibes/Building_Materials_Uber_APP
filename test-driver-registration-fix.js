const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqfclflxjuixcmfkfcek.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZmNsZmx4anVpeGNtZmtmY2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzk2MDQsImV4cCI6MjA0NzYxNTYwNH0.AHlrLdpRGPy0kkFvs-xElAHdjhOxpJJNg6HBTLrSV1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

// Method to ensure user exists in public.users table (copied from working customer app)
async function ensureUserInCustomTable(supabaseUser, registrationData) {
  try {
    console.log('🔍 Checking if user exists in custom users table...');
    
    // Check if user already exists by ID or email
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .or(`id.eq.${supabaseUser.id},email.eq.${supabaseUser.email}`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking user existence:', checkError);
      return;
    }

    if (existingUser) {
      console.log('✅ User found in custom users table');
      
      // If user exists with same email but different ID, this is likely an orphaned record
      if (existingUser.id !== supabaseUser.id && existingUser.email === supabaseUser.email) {
        console.log('🧹 Orphaned user detected - cleaning up old record and creating new one');
        
        // Delete the orphaned user record
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', existingUser.id);
        
        if (deleteError) {
          console.error('⚠️ Failed to delete orphaned user:', deleteError.message);
          return;
        }
        
        console.log('✅ Orphaned user record deleted');
        // Continue to create new user record
      } else {
        // User exists with correct ID
        return;
      }
    }

    console.log('🔧 Creating missing user in custom users table...');
    
    // Create user in custom users table
    const customUserData = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      password_hash: 'supabase_auth',
      first_name: registrationData?.firstName || supabaseUser.user_metadata?.first_name || 'User',
      last_name: registrationData?.lastName || supabaseUser.user_metadata?.last_name || '',
      phone: registrationData?.phone || supabaseUser.user_metadata?.phone || '',
      role: 'driver',
      user_type: 'driver',
      is_active: true
    };

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([customUserData])
      .select()
      .single();

    if (createError) {
      // Check if it's a duplicate key error
      if (createError.message.includes('duplicate key value')) {
        console.log('⚠️ User already exists in custom table (race condition)');
      } else {
        console.error('⚠️ Warning: Failed to create user in custom users table:', createError.message);
        throw new Error(`Failed to create user profile: ${createError.message}`);
      }
    } else {
      console.log('✅ User created in custom users table:', createdUser.id);
    }

  } catch (error) {
    console.error('Error ensuring user in custom table:', error);
    throw error;
  }
}

async function testDriverRegistrationWithFix() {
  const testEmail = `testdriver${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('\n🧪 Testing Driver Registration with ensureUserInCustomTable Fix');
  console.log('=====================================================');
  
  try {
    // Step 1: Create user account using Supabase Auth
    console.log('\n📝 Step 1: Creating Supabase Auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'Driver',
          role: 'driver',
          user_type: 'driver'
        }
      }
    });

    if (authError) {
      console.error('❌ Auth registration failed:', authError.message);
      return;
    }

    if (!authData.user) {
      console.error('❌ No user data returned from auth');
      return;
    }

    console.log('✅ Supabase Auth user created:', authData.user.id);
    console.log('📧 Email:', authData.user.email);
    console.log('📧 Email confirmed:', !!authData.user.email_confirmed_at);

    // Step 2: Use the ensureUserInCustomTable method
    console.log('\n📝 Step 2: Creating public.users entry with ensureUserInCustomTable...');
    const registrationData = {
      firstName: 'Test',
      lastName: 'Driver', 
      email: testEmail,
      phone: '+1234567890'
    };

    await ensureUserInCustomTable(authData.user, registrationData);

    // Step 3: Verify user exists in public.users
    console.log('\n📝 Step 3: Verifying user exists in public.users...');
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (publicUserError) {
      console.error('❌ Failed to find user in public.users:', publicUserError.message);
    } else {
      console.log('✅ User found in public.users table:');
      console.log('   ID:', publicUser.id);
      console.log('   Email:', publicUser.email);
      console.log('   Role:', publicUser.role);
      console.log('   User Type:', publicUser.user_type);
      console.log('   Active:', publicUser.is_active);
    }

    // Step 4: Test authentication (login)
    console.log('\n📝 Step 4: Testing authentication...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', loginData.user.id);
      console.log('   Session exists:', !!loginData.session);
      
      // Test the initializeDriver method logic
      console.log('\n📝 Step 5: Testing initializeDriver logic...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, user_type, is_active')
        .eq('id', loginData.user.id)
        .single();

      if (userError) {
        console.error('❌ Failed to get user data for role check:', userError.message);
      } else {
        console.log('✅ User role data retrieved:');
        console.log('   Role:', userData.role);
        console.log('   User Type:', userData.user_type);
        console.log('   Active:', userData.is_active);

        if (userData.role === 'driver' && userData.user_type === 'driver') {
          console.log('🎉 SUCCESS: User has correct driver role and would pass authentication!');
        } else {
          console.log('❌ FAILED: User does not have proper driver role');
        }
      }
    }

    // Cleanup - sign out
    await supabase.auth.signOut();

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testDriverRegistrationWithFix();

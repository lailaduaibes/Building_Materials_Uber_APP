const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqcylsqwtvwddxcsmkpg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xY3lsc3F3dHZ3ZGR4Y3Nta3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3MDY2MzMsImV4cCI6MjA0MDI4MjYzM30.9cFLxCqcRAYtNfQ9WnrMQ8ew0zTjjPGRzazCKcdDjdc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserSync() {
  console.log('🔍 Debug: User synchronization between Auth and Database\n');
  
  try {
    // 1. Get current session user
    console.log('1. Getting current auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session Error:', sessionError.message);
      return;
    }
    
    if (!session?.user) {
      console.log('ℹ️  No active session found');
      
      // Try to check all auth users (this might not work with anon key)
      console.log('\n2. Attempting to list auth users...');
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.log('⚠️  Cannot list auth users with anon key:', authError.message);
      } else {
        console.log('✅ Auth Users Found:', authUsers.users.length);
        authUsers.users.forEach(user => {
          console.log(`  - ${user.email} (ID: ${user.id})`);
        });
      }
    } else {
      console.log('✅ Session found!');
      console.log('  📧 Email:', session.user.email);
      console.log('  🆔 Auth ID:', session.user.id);
      console.log('  📊 Metadata:', JSON.stringify(session.user.user_metadata, null, 2));
      
      // 3. Check if user exists in database
      console.log('\n3. Checking database for this user...');
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (dbError) {
        console.error('❌ Database Error:', dbError);
        console.log('  Error Code:', dbError.code);
        console.log('  Error Details:', dbError.details);
      } else if (dbUser) {
        console.log('✅ User found in database:');
        console.log('  📧 DB Email:', dbUser.email);
        console.log('  👤 Name:', dbUser.first_name, dbUser.last_name);
        console.log('  📞 Phone:', dbUser.phone);
        console.log('  🎭 Role:', dbUser.role);
        console.log('  📅 Created:', dbUser.created_at);
      } else {
        console.log('⚠️  User NOT found in database - this is the issue!');
        
        // 4. Create missing user in database
        console.log('\n4. Creating missing user in database...');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            first_name: session.user.user_metadata?.first_name || 'Unknown',
            last_name: session.user.user_metadata?.last_name || 'User', 
            phone: session.user.user_metadata?.phone || null,
            role: session.user.user_metadata?.role || 'customer',
            user_type: 'customer',
            password_hash: 'supabase_managed', // Placeholder since Supabase manages auth
          })
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Failed to create user in database:', createError);
        } else {
          console.log('✅ User created successfully in database!');
          console.log('New user data:', newUser);
        }
      }
    }
    
    // 5. List all database users for reference
    console.log('\n5. All users in database:');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, created_at')
      .limit(10);
    
    if (allUsersError) {
      console.error('❌ Error fetching all users:', allUsersError);
    } else {
      console.log(`✅ Found ${allUsers.length} users in database:`);
      allUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} - ${user.first_name} ${user.last_name} (${user.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugUserSync();

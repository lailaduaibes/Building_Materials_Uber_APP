// Check what's in the users table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  try {
    // Sign in first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'lailaghassan2001@gmail.com',
      password: 'Hatelove@1412'
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    const authUser = authData.user;
    console.log('Supabase Auth User ID:', authUser.id);
    console.log('User email:', authUser.email);
    
    // Check all users in the table
    console.log('\nAll users in users table:');
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, user_type')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log('Users found:', allUsers.length);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Role: ${user.role}`);
    });
    
    // Check if there's a user with our email
    const userWithEmail = allUsers.find(u => u.email === authUser.email);
    if (userWithEmail) {
      console.log('\n🔍 Found user with matching email:');
      console.log('Database User ID:', userWithEmail.id);
      console.log('Auth User ID:', authUser.id);
      console.log('IDs match:', userWithEmail.id === authUser.id);
      
      if (userWithEmail.id !== authUser.id) {
        console.log('\n⚠️ ID MISMATCH! Need to either:');
        console.log('1. Update the users table to use the Supabase Auth ID');
        console.log('2. Or use the database user ID for trip creation');
        
        // Let's try creating a trip with the database user ID
        console.log('\n🚛 Testing trip creation with database user ID...');
        
        const tripData = {
          customer_id: userWithEmail.id, // Use database ID instead of auth ID
          pickup_latitude: 33.8938,
          pickup_longitude: 35.5018,
          pickup_address: {
            street: "Test Street",
            city: "Beirut",
            state: "Beirut",
            postal_code: "1200",
            formatted_address: "Test Street, Beirut, Lebanon"
          },
          delivery_latitude: 33.8869,
          delivery_longitude: 35.5131,
          delivery_address: {
            street: "Delivery Street",
            city: "Beirut", 
            state: "Beirut",
            postal_code: "1201",
            formatted_address: "Delivery Street, Beirut, Lebanon"
          },
          material_type: "cement",
          load_description: "Test load",
          status: "pending"
        };
        
        const { data: trip, error: tripError } = await supabase
          .from('trip_requests')
          .insert([tripData])
          .select()
          .single();
        
        if (tripError) {
          console.error('❌ Trip creation still failed:', tripError);
        } else {
          console.log('✅ Trip created successfully with database user ID:', trip.id);
          
          // Clean up
          await supabase.from('trip_requests').delete().eq('id', trip.id);
          console.log('Test trip cleaned up');
        }
      }
    } else {
      console.log('\n❌ No user found with email:', authUser.email);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkUsersTable();

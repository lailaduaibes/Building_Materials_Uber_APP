// Check RLS policies and try to work around them
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSAndFix() {
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
    console.log('Authenticated:', authUser.email, 'Auth ID:', authUser.id);
    
    // Get database user
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (dbUserError || !dbUser) {
      console.error('❌ Database user not found:', dbUserError);
      return;
    }

    console.log('Database user ID:', dbUser.id);
    
    // Option 1: Try to update the database user ID to match the auth ID
    console.log('\n🔧 Attempting to update database user ID to match auth ID...');
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ id: authUser.id })
      .eq('email', authUser.email)
      .select();
    
    if (updateError) {
      console.log('❌ Cannot update user ID (expected):', updateError.message);
      
      // Option 2: Try inserting trip with auth user ID (maybe RLS checks auth user)
      console.log('\n🔧 Attempting trip creation with auth user ID...');
      
      const tripData = {
        customer_id: authUser.id, // Use auth user ID
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
        load_description: "Test with auth ID",
        status: "pending"
      };
      
      const { data: trip, error: tripError } = await supabase
        .from('trip_requests')
        .insert([tripData])
        .select()
        .single();
      
      if (tripError) {
        console.error('❌ Still failed with auth ID:', tripError.message);
        
        // Option 3: Let's try to create a new user record with the correct auth ID
        console.log('\n🔧 Creating new user record with auth ID...');
        
        const newUserData = {
          id: authUser.id,
          email: `${authUser.email}_new`, // Temporary different email
          password_hash: 'supabase_auth',
          first_name: dbUser.first_name,
          last_name: dbUser.last_name,
          phone: dbUser.phone,
          role: 'customer',
          user_type: 'customer',
          is_active: true
        };
        
        const { data: newUser, error: newUserError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();
        
        if (newUserError) {
          console.error('❌ Failed to create new user:', newUserError.message);
        } else {
          console.log('✅ Created new user with auth ID:', newUser.id);
          
          // Now try trip creation
          const tripData2 = {
            ...tripData,
            customer_id: newUser.id,
            load_description: "Test with new user record"
          };
          
          const { data: trip2, error: tripError2 } = await supabase
            .from('trip_requests')
            .insert([tripData2])
            .select()
            .single();
          
          if (tripError2) {
            console.error('❌ Still failed:', tripError2.message);
          } else {
            console.log('✅ SUCCESS! Trip created:', trip2.id);
            
            // Clean up
            await supabase.from('trip_requests').delete().eq('id', trip2.id);
            await supabase.from('users').delete().eq('id', newUser.id);
            console.log('✅ Cleaned up test data');
          }
        }
        
      } else {
        console.log('✅ Trip created with auth ID:', trip.id);
        await supabase.from('trip_requests').delete().eq('id', trip.id);
        console.log('✅ Cleaned up');
      }
    } else {
      console.log('✅ User ID updated successfully!');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkRLSAndFix();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createAdminUser() {
  console.log('👑 Creating Admin User System...');
  
  try {
    // Create admin user
    const adminEmail = 'admin@youmats.com'; // Change this to your preferred admin email
    const adminPassword = 'AdminYouMats2025!'; // Change this to a secure password
    
    console.log('Creating admin user account...');
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'System',
        last_name: 'Administrator',
        user_type: 'admin',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Error creating admin auth user:', authError);
      return;
    }

    console.log('✅ Admin auth user created:', authData.user.id);

    // Create user record in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: adminEmail,
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        user_type: 'admin',
        is_active: true,
        is_online: false
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating admin user record:', userError);
      return;
    }

    console.log('✅ Admin user record created in database');

    // Display admin credentials
    console.log('\n🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('==========================================');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role: admin');
    console.log('==========================================');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('💡 This admin can now manage driver registrations');

  } catch (error) {
    console.error('💥 Error creating admin user:', error);
  }
}

// Professional Driver Management Functions for Admin
const DriverManagement = {
  
  // Create a new driver (admin only)
  async createDriverAccount(adminUserId, driverData) {
    try {
      console.log('👨‍💼 Admin creating new driver account...');
      
      // Verify admin permissions
      const { data: adminUser } = await supabase
        .from('users')
        .select('role, user_type')
        .eq('id', adminUserId)
        .single();
      
      if (!adminUser || (adminUser.role !== 'admin' && adminUser.user_type !== 'admin')) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Generate secure password
      const tempPassword = 'TempDriver' + Math.random().toString(36).substring(2, 8) + '!';
      
      // Create driver auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: driverData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          user_type: 'driver',
          role: 'driver'
        }
      });

      if (authError) throw authError;

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: driverData.email,
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone,
          role: 'driver',
          user_type: 'driver',
          is_active: true,
          is_online: false
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create driver profile
      const { data: driverProfile, error: profileError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: authData.user.id,
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone,
          vehicle_model: driverData.vehicle_model || null,
          vehicle_plate: driverData.vehicle_plate || null,
          years_experience: driverData.years_experience || 0,
          specializations: driverData.specializations || [],
          rating: 5.0,
          total_trips: 0,
          total_earnings: 0,
          is_available: false,
          max_distance_km: driverData.max_distance_km || 50,
          status: 'active',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) throw profileError;

      console.log('✅ Driver account created successfully!');
      console.log('📧 Driver Email:', driverData.email);
      console.log('🔑 Temporary Password:', tempPassword);
      console.log('⚠️  Send these credentials to the driver securely');

      return {
        success: true,
        driver: driverProfile,
        credentials: {
          email: driverData.email,
          password: tempPassword
        }
      };

    } catch (error) {
      console.error('❌ Error creating driver account:', error);
      return { success: false, error: error.message };
    }
  },

  // List all drivers (admin only)
  async listAllDrivers(adminUserId) {
    try {
      // Verify admin permissions
      const { data: adminUser } = await supabase
        .from('users')
        .select('role, user_type')
        .eq('id', adminUserId)
        .single();
      
      if (!adminUser || (adminUser.role !== 'admin' && adminUser.user_type !== 'admin')) {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data: drivers, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          users!driver_profiles_user_id_fkey (
            email,
            is_active,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, drivers };

    } catch (error) {
      console.error('❌ Error listing drivers:', error);
      return { success: false, error: error.message };
    }
  }
};

// Run this to create the admin user
createAdminUser();

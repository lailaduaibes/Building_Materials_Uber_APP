// Check driver documents and registration details
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDriverDocuments() {
  console.log('📋 CHECKING DRIVER DOCUMENTS & APPLICATION DETAILS');
  console.log('==================================================\n');

  try {
    // Check if driver_documents table exists
    console.log('1️⃣ Checking driver_documents table...');
    const { data: documents, error: docsError } = await serviceSupabase
      .from('driver_documents')
      .select('*')
      .limit(5);

    if (docsError) {
      console.log('❌ driver_documents table not found:', docsError.message);
      console.log('   Need to check how documents are stored');
    } else {
      console.log(`✅ Found ${documents.length} document records`);
      documents.forEach((doc, index) => {
        console.log(`${index + 1}. Driver: ${doc.driver_id}`);
        console.log(`   Type: ${doc.document_type || 'N/A'}`);
        console.log(`   File: ${doc.file_name || 'N/A'}`);
        console.log(`   Status: ${doc.status || 'N/A'}`);
        console.log(`   URL: ${doc.file_url || 'N/A'}`);
        console.log('   ---');
      });
    }

    // Check driver_profiles for detailed registration info
    console.log('\n2️⃣ Checking driver profile registration details...');
    const { data: drivers, error: driversError } = await serviceSupabase
      .from('driver_profiles')
      .select('*')
      .limit(3);

    if (driversError) {
      console.log('❌ Error fetching drivers:', driversError);
      return;
    }

    console.log(`✅ Found ${drivers.length} driver profiles with details:`);
    drivers.forEach((driver, index) => {
      console.log(`\n${index + 1}. ${driver.first_name} ${driver.last_name}`);
      console.log(`   Status: ${driver.approval_status} (${driver.is_approved ? 'Approved' : 'Pending'})`);
      console.log(`   Phone: ${driver.phone || 'N/A'}`);
      console.log(`   Experience: ${driver.years_experience || 0} years`);
      console.log(`   License: ${driver.license_number || 'N/A'}`);
      console.log(`   Vehicle Model: ${driver.vehicle_model || 'N/A'}`);
      console.log(`   Vehicle Plate: ${driver.vehicle_plate || 'N/A'}`);
      console.log(`   Vehicle Year: ${driver.vehicle_year || 'N/A'}`);
      console.log(`   Max Payload: ${driver.vehicle_max_payload || 'N/A'}t`);
      console.log(`   Max Volume: ${driver.vehicle_max_volume || 'N/A'}m³`);
      console.log(`   Truck Types: ${driver.preferred_truck_types || 'N/A'}`);
      console.log(`   Max Distance: ${driver.max_distance_km || 'N/A'}km`);
      console.log(`   Rating: ${driver.rating || 'N/A'}/5`);
      console.log(`   Total Trips: ${driver.total_trips || 0}`);
      console.log(`   Specializations: ${driver.specializations || 'N/A'}`);
      console.log(`   Registered: ${new Date(driver.created_at).toLocaleDateString()}`);
      if (driver.approved_at) {
        console.log(`   Approved: ${new Date(driver.approved_at).toLocaleDateString()}`);
      }
      if (driver.rejection_reason) {
        console.log(`   Rejection Reason: ${driver.rejection_reason}`);
      }
      console.log('   ---');
    });

    // Check what fields are available in driver_profiles table
    console.log('\n3️⃣ Available driver profile fields for admin dashboard:');
    if (drivers.length > 0) {
      const fields = Object.keys(drivers[0]);
      console.log('📊 Fields available for display:');
      fields.forEach(field => {
        console.log(`   • ${field}`);
      });
    }

    console.log('\n📋 ADMIN DASHBOARD ENHANCEMENT NEEDED:');
    console.log('=====================================');
    console.log('✅ Driver basic info available');
    console.log('✅ Vehicle information available');
    console.log('✅ Registration details available');
    console.log('❓ Document attachments - need to check storage');
    console.log('❓ Document verification status - need implementation');

    console.log('\n🔧 REQUIRED ENHANCEMENTS:');
    console.log('=========================');
    console.log('1. Add detailed driver view modal');
    console.log('2. Show vehicle specifications');
    console.log('3. Display registration timeline');
    console.log('4. Show document attachments (if available)');
    console.log('5. Add document verification interface');
    console.log('6. Include driver experience details');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDriverDocuments();

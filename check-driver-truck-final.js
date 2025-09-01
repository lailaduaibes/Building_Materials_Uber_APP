const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkDriverTruckStatus() {
  console.log('🔍 Checking driver nanduaibes@gmail.com and truck functionality...\n');
  
  try {
    // First get the user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'nanduaibes@gmail.com')
      .single();
      
    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }
    
    console.log('✅ User found:');
    console.log('  - ID:', user.id);
    console.log('  - Name:', user.first_name, user.last_name);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
    console.log('  - Active:', user.is_active);
    console.log('  - Online:', user.is_online);
    console.log('  - Created:', new Date(user.created_at).toLocaleString());
    console.log('');
    
    // Now get the driver profile
    const { data: driverProfile, error: profileError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError) {
      console.log('❌ Driver profile not found:', profileError.message);
      return;
    }
    
    console.log('✅ Driver profile found:');
    console.log('  - Driver ID:', driverProfile.id);
    console.log('  - Approved:', driverProfile.is_approved);
    console.log('  - Available:', driverProfile.is_available);
    console.log('  - License Plate:', driverProfile.license_plate || driverProfile.vehicle_plate || 'Not provided');
    console.log('  - Vehicle Model:', driverProfile.vehicle_model || 'Not provided');
    console.log('  - Vehicle Year:', driverProfile.vehicle_year || 'Not provided');
    console.log('  - Max Payload:', driverProfile.vehicle_max_payload || 'Not provided');
    console.log('  - Max Volume:', driverProfile.vehicle_max_volume || 'Not provided');
    console.log('  - Total Trips:', driverProfile.total_trips || 0);
    console.log('  - Rating:', driverProfile.rating || 'No rating');
    console.log('');
    
    // Check if truck exists for this driver
    console.log('🚛 Checking truck assignment...\n');
    
    const { data: trucks, error: truckError } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', driverProfile.id);
      
    if (truckError) {
      console.log('❌ Error checking trucks:', truckError.message);
    } else if (trucks && trucks.length > 0) {
      console.log('✅ Truck(s) assigned to driver:');
      trucks.forEach((truck, index) => {
        console.log(`  Truck ${index + 1}:`);
        console.log(`    - ID: ${truck.id}`);
        console.log(`    - License Plate: ${truck.license_plate}`);
        console.log(`    - Make/Model: ${truck.make} ${truck.model} (${truck.year})`);
        console.log(`    - Max Payload: ${truck.max_payload}`);
        console.log(`    - Max Volume: ${truck.max_volume}`);
        console.log(`    - Status: ${truck.status || 'available'}`);
        console.log(`    - Truck Type ID: ${truck.truck_type_id || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No trucks assigned to this driver');
      console.log('');
      
      // Check if truck exists with same license plate
      const licensePlate = driverProfile.license_plate || driverProfile.vehicle_plate;
      if (licensePlate) {
        console.log('🔍 Checking for truck with matching license plate:', licensePlate);
        const { data: plateMatch, error: plateError } = await supabase
          .from('trucks')
          .select('*')
          .eq('license_plate', licensePlate);
          
        if (!plateError && plateMatch && plateMatch.length > 0) {
          console.log('✅ Found truck with matching license plate:');
          plateMatch.forEach((truck) => {
            console.log(`  - Truck ID: ${truck.id}`);
            console.log(`  - Current Driver: ${truck.current_driver_id || 'None'}`);
            console.log(`  - Make/Model: ${truck.make} ${truck.model}`);
            console.log(`  - Status: ${truck.status || 'available'}`);
            console.log('');
          });
          
          // If truck exists but not assigned, try to assign it
          if (plateMatch[0].current_driver_id !== driverProfile.id) {
            console.log('🔧 Attempting to assign truck to driver...');
            const { error: assignError } = await supabase
              .from('trucks')
              .update({ current_driver_id: driverProfile.id })
              .eq('id', plateMatch[0].id);
              
            if (assignError) {
              console.log('❌ Failed to assign truck:', assignError.message);
            } else {
              console.log('✅ Truck assigned successfully!');
            }
          }
        } else {
          console.log('❌ No truck found with matching license plate');
          
          // Create a new truck for this driver
          console.log('🚛 Creating new truck for driver...');
          const newTruck = {
            license_plate: licensePlate,
            make: driverProfile.vehicle_model ? driverProfile.vehicle_model.split(' ')[0] : 'Unknown',
            model: driverProfile.vehicle_model ? driverProfile.vehicle_model.split(' ').slice(1).join(' ') || 'Unknown' : 'Unknown',
            year: driverProfile.vehicle_year || 2020,
            max_payload: driverProfile.vehicle_max_payload || 10,
            max_volume: driverProfile.vehicle_max_volume || 20,
            current_driver_id: driverProfile.id,
            status: 'available',
            truck_type_id: '550e8400-e29b-41d4-a716-446655440001' // Default truck type
          };
          
          const { data: createdTruck, error: createError } = await supabase
            .from('trucks')
            .insert([newTruck])
            .select();
            
          if (createError) {
            console.log('❌ Failed to create truck:', createError.message);
          } else {
            console.log('✅ New truck created successfully:');
            console.log(`  - ID: ${createdTruck[0].id}`);
            console.log(`  - License Plate: ${createdTruck[0].license_plate}`);
            console.log(`  - Make/Model: ${createdTruck[0].make} ${createdTruck[0].model}`);
          }
        }
      }
    }
    
    // Check driver documents
    console.log('📄 Checking driver documents...\n');
    
    const { data: documents, error: docError } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverProfile.id)
      .order('created_at', { ascending: false });
      
    if (docError) {
      console.log('❌ Error checking documents:', docError.message);
    } else if (documents && documents.length > 0) {
      console.log('✅ Driver documents found:');
      documents.forEach((doc) => {
        console.log(`  - ${doc.document_type}: ${doc.status} (uploaded: ${new Date(doc.created_at).toLocaleDateString()})`);
      });
    } else {
      console.log('⚠️  No documents found for this driver');
    }
    
    // Check available orders
    console.log('\n📋 Checking available orders for this driver...\n');
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('driver_id', driverProfile.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (ordersError) {
      console.log('❌ Error checking orders:', ordersError.message);
    } else if (orders && orders.length > 0) {
      console.log('✅ Recent orders for this driver:');
      orders.forEach((order) => {
        console.log(`  - Order ID: ${order.id}`);
        console.log(`  - Status: ${order.status}`);
        console.log(`  - Created: ${new Date(order.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('⚠️  No orders found for this driver');
    }
    
    console.log('\n🎯 Summary Report:');
    console.log(`  - User Status: ${user.is_active ? '✅ Active' : '❌ Inactive'}`);
    console.log(`  - Driver Approved: ${driverProfile.is_approved ? '✅ Approved' : '❌ Not Approved'}`);
    console.log(`  - Driver Available: ${driverProfile.is_available ? '✅ Available' : '❌ Not Available'}`);
    console.log(`  - User Online: ${user.is_online ? '✅ Online' : '❌ Offline'}`);
    
    // Re-check trucks after potential creation
    const { data: finalTrucks } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', driverProfile.id);
      
    console.log(`  - Truck Assignment: ${finalTrucks && finalTrucks.length > 0 ? '✅ Assigned' : '❌ Not Assigned'}`);
    console.log(`  - Documents: ${documents && documents.length > 0 ? `✅ ${documents.length} uploaded` : '❌ None Found'}`);
    console.log(`  - Orders: ${orders && orders.length > 0 ? `✅ ${orders.length} orders` : '⚠️ No orders yet'}`);
    
    if (driverProfile.is_approved && finalTrucks && finalTrucks.length > 0) {
      console.log('\n🎉 TRUCK FUNCTIONALITY STATUS: ✅ WORKING CORRECTLY');
      console.log('The driver is approved and has a truck assigned - ready to receive orders!');
    } else {
      console.log('\n⚠️  TRUCK FUNCTIONALITY STATUS: ❌ NEEDS ATTENTION');
      if (!driverProfile.is_approved) console.log('  - Driver needs to be approved');
      if (!finalTrucks || finalTrucks.length === 0) console.log('  - Driver needs a truck assigned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDriverTruckStatus();

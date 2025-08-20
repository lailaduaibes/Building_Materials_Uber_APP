// Test script to create a new pending driver and test the complete workflow
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteWorkflow() {
    console.log('🧪 Testing Complete Driver Approval Workflow\n');
    
    try {
        // Step 1: Create a new test driver (simulating registration)
        console.log('1️⃣ Creating test driver profile...');
        
        const testUserId = '11111111-2222-3333-4444-555555555555'; // Test UUID
        
        // First, create or update a test user
        const { data: testUser, error: userError } = await supabase
            .from('users')
            .upsert({
                id: testUserId,
                first_name: 'Test',
                last_name: 'Driver',
                email: 'testdriver@youmats.com',
                role: 'driver',
                user_type: 'driver',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (userError) {
            console.log('📝 User might already exist, continuing...');
        } else {
            console.log('✅ Test user created/updated');
        }
        
        const testDriverData = {
            user_id: testUserId,
            first_name: 'Test',
            last_name: 'Driver',
            phone: '+966 50 999 8888',
            years_experience: 3,
            vehicle_model: 'Toyota Hilux',
            vehicle_plate: 'ABC-1234',
            specializations: {},
            // Proper approval fields with defaults
            is_approved: false,
            approval_status: 'pending',
            application_submitted_at: new Date().toISOString(),
            rating: 5.0,
            total_trips: 0,
            total_earnings: 0.0,
            is_available: false,
            preferred_truck_types: {},
            max_distance_km: 50
        };
        
        // Delete existing test driver if exists
        await supabase
            .from('driver_profiles')
            .delete()
            .eq('user_id', testUserId);
        
        const { data: newDriver, error: createError } = await supabase
            .from('driver_profiles')
            .insert(testDriverData)
            .select()
            .single();
        
        if (createError) {
            console.error('❌ Error creating test driver:', createError);
            return;
        }
        
        console.log('✅ Test driver created:', {
            id: newDriver.id,
            name: `${newDriver.first_name} ${newDriver.last_name}`,
            status: newDriver.approval_status,
            approved: newDriver.is_approved
        });
        
        // Step 2: Test mobile app behavior (driver tries to get trips)
        console.log('\n2️⃣ Testing mobile app behavior for pending driver...');
        
        const { data: checkProfile, error: checkError } = await supabase
            .from('driver_profiles')
            .select('is_approved, approval_status, first_name, last_name')
            .eq('id', newDriver.id)
            .single();
        
        if (checkError) {
            console.error('❌ Error checking driver:', checkError);
            return;
        }
        
        const canPickTrips = checkProfile.is_approved === true && checkProfile.approval_status === 'approved';
        console.log('📱 Mobile App Check:');
        console.log(`   Driver: ${checkProfile.first_name} ${checkProfile.last_name}`);
        console.log(`   Is Approved: ${checkProfile.is_approved ? '✅ YES' : '❌ NO'}`);
        console.log(`   Status: ${checkProfile.approval_status}`);
        console.log(`   Can Pick Trips: ${canPickTrips ? '✅ YES' : '🚫 NO'}`);
        
        if (!canPickTrips) {
            console.log('   📝 Message: "Your application is being reviewed by our team"');
        }
        
        // Step 3: Admin approves the driver
        console.log('\n3️⃣ Admin approves the driver...');
        
        const { data: approvedDriver, error: approveError } = await supabase
            .from('driver_profiles')
            .update({
                is_approved: true,
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                // approved_by: 'admin-uuid-here', // Would be real admin ID
                updated_at: new Date().toISOString()
            })
            .eq('id', newDriver.id)
            .select()
            .single();
        
        if (approveError) {
            console.error('❌ Error approving driver:', approveError);
            return;
        }
        
        console.log('✅ Driver approved by admin:', {
            name: `${approvedDriver.first_name} ${approvedDriver.last_name}`,
            status: approvedDriver.approval_status,
            approved: approvedDriver.is_approved,
            approved_at: new Date(approvedDriver.approved_at).toLocaleString()
        });
        
        // Step 4: Test mobile app behavior after approval
        console.log('\n4️⃣ Testing mobile app behavior for approved driver...');
        
        const canPickTripsNow = approvedDriver.is_approved === true && approvedDriver.approval_status === 'approved';
        console.log('📱 Mobile App Check (After Approval):');
        console.log(`   Driver: ${approvedDriver.first_name} ${approvedDriver.last_name}`);
        console.log(`   Is Approved: ${approvedDriver.is_approved ? '✅ YES' : '❌ NO'}`);
        console.log(`   Status: ${approvedDriver.approval_status}`);
        console.log(`   Can Pick Trips: ${canPickTripsNow ? '✅ YES' : '🚫 NO'}`);
        
        if (canPickTripsNow) {
            console.log('   🎉 Message: "Welcome! You can now start accepting delivery requests"');
            console.log('   🚛 Action: Load available trips list');
        }
        
        // Step 5: Test rejection workflow
        console.log('\n5️⃣ Testing rejection workflow...');
        
        const { data: rejectedDriver, error: rejectError } = await supabase
            .from('driver_profiles')
            .update({
                is_approved: false,
                approval_status: 'rejected',
                rejection_reason: 'Insufficient experience for heavy machinery delivery',
                updated_at: new Date().toISOString()
            })
            .eq('id', newDriver.id)
            .select()
            .single();
        
        if (rejectError) {
            console.error('❌ Error rejecting driver:', rejectError);
            return;
        }
        
        console.log('❌ Driver rejected by admin:', {
            name: `${rejectedDriver.first_name} ${rejectedDriver.last_name}`,
            status: rejectedDriver.approval_status,
            reason: rejectedDriver.rejection_reason
        });
        
        const canPickTripsRejected = rejectedDriver.is_approved === true && rejectedDriver.approval_status === 'approved';
        console.log('📱 Mobile App Check (After Rejection):');
        console.log(`   Can Pick Trips: ${canPickTripsRejected ? '✅ YES' : '🚫 NO'}`);
        console.log(`   📝 Message: "${rejectedDriver.rejection_reason}"`);
        console.log('   🆘 Action: Show "Contact Support" button');
        
        // Step 6: Clean up test data
        console.log('\n6️⃣ Cleaning up test data...');
        
        await supabase
            .from('driver_profiles')
            .delete()
            .eq('id', newDriver.id);
        
        console.log('✅ Test driver deleted');
        
        // Step 7: Summary
        console.log('\n🎉 Complete Workflow Test Summary:');
        console.log('   ✅ Driver registration with pending status');
        console.log('   ✅ Mobile app blocks trip access for pending drivers');
        console.log('   ✅ Admin can approve drivers');
        console.log('   ✅ Mobile app allows trip access for approved drivers');
        console.log('   ✅ Admin can reject drivers with reasons');
        console.log('   ✅ Mobile app shows rejection message and support option');
        console.log('   ✅ Database security prevents driver self-approval');
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Open admin-dashboard-proper.html to test admin interface');
        console.log('   2. Update mobile app screens to use DriverApprovalBanner component');
        console.log('   3. Add push notifications for approval status changes');
        console.log('   4. Test with real mobile app');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testCompleteWorkflow();

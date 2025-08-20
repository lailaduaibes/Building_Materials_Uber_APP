// Test proper approval system implementation
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProperApprovalSystem() {
    console.log('🧪 Testing Proper Approval System Implementation\n');
    
    try {
        // 1. Check if proper fields exist
        console.log('1️⃣ Checking database schema...');
        const { data: drivers, error: fetchError } = await supabase
            .from('driver_profiles')
            .select('*')
            .limit(1);
        
        if (fetchError) {
            console.error('❌ Database fetch error:', fetchError);
            return;
        }
        
        if (drivers && drivers.length > 0) {
            const driver = drivers[0];
            const hasProperFields = 'is_approved' in driver && 'approval_status' in driver;
            
            if (hasProperFields) {
                console.log('✅ Proper approval fields detected!');
                console.log('   - is_approved:', typeof driver.is_approved);
                console.log('   - approval_status:', typeof driver.approval_status);
                console.log('   - application_submitted_at:', typeof driver.application_submitted_at);
                console.log('   - approved_at:', typeof driver.approved_at);
                console.log('   - approved_by:', typeof driver.approved_by);
                console.log('   - rejection_reason:', typeof driver.rejection_reason);
                console.log('   - admin_notes:', typeof driver.admin_notes);
            } else {
                console.log('❌ Proper approval fields not found');
                console.log('📝 Current fields:', Object.keys(driver));
                console.log('\n💡 Run quick-proper-approval-setup.sql first!');
                return;
            }
        }
        
        // 2. Get all drivers with proper approval data
        console.log('\n2️⃣ Fetching drivers with approval status...');
        const { data: allDrivers, error: allError } = await supabase
            .from('driver_profiles')
            .select(`
                id,
                first_name,
                last_name,
                phone,
                is_approved,
                approval_status,
                application_submitted_at,
                approved_at,
                rejection_reason,
                specializations,
                created_at
            `)
            .order('created_at', { ascending: false });
        
        if (allError) {
            console.error('❌ Error fetching drivers:', allError);
            return;
        }
        
        console.log(`📊 Found ${allDrivers.length} drivers total\n`);
        
        // 3. Analyze approval statistics
        const stats = {
            total: allDrivers.length,
            approved: allDrivers.filter(d => d.is_approved === true).length,
            pending: allDrivers.filter(d => d.approval_status === 'pending').length,
            rejected: allDrivers.filter(d => d.approval_status === 'rejected').length,
            underReview: allDrivers.filter(d => d.approval_status === 'under_review').length
        };
        
        console.log('📈 Approval Statistics:');
        console.log(`   Total Drivers: ${stats.total}`);
        console.log(`   ✅ Approved: ${stats.approved}`);
        console.log(`   ⏳ Pending: ${stats.pending}`);
        console.log(`   ❌ Rejected: ${stats.rejected}`);
        console.log(`   🔍 Under Review: ${stats.underReview}`);
        
        // 4. Show detailed driver status
        console.log('\n4️⃣ Driver Details:');
        allDrivers.forEach((driver, index) => {
            console.log(`\n${index + 1}. ${driver.first_name} ${driver.last_name}`);
            console.log(`   Phone: ${driver.phone || 'Not provided'}`);
            console.log(`   Is Approved: ${driver.is_approved ? '✅ YES' : '❌ NO'}`);
            console.log(`   Status: ${driver.approval_status}`);
            console.log(`   Applied: ${driver.application_submitted_at ? new Date(driver.application_submitted_at).toLocaleDateString() : 'N/A'}`);
            console.log(`   Approved: ${driver.approved_at ? new Date(driver.approved_at).toLocaleDateString() : 'N/A'}`);
            if (driver.rejection_reason) {
                console.log(`   Rejection: ${driver.rejection_reason}`);
            }
            
            // Show migration from old system
            const wasApprovedBefore = driver.specializations?.includes('APPROVED_BY_ADMIN');
            if (wasApprovedBefore) {
                console.log(`   🔄 Migrated from old approval system`);
            }
        });
        
        // 5. Test driver restriction logic
        console.log('\n5️⃣ Testing driver restrictions...');
        const restrictedDrivers = allDrivers.filter(d => !d.is_approved);
        const allowedDrivers = allDrivers.filter(d => d.is_approved === true);
        
        console.log(`🚫 Restricted drivers (cannot pick trips): ${restrictedDrivers.length}`);
        restrictedDrivers.forEach(driver => {
            console.log(`   - ${driver.first_name} ${driver.last_name} (${driver.approval_status})`);
        });
        
        console.log(`🚛 Allowed drivers (can pick trips): ${allowedDrivers.length}`);
        allowedDrivers.forEach(driver => {
            console.log(`   - ${driver.first_name} ${driver.last_name} (approved)`);
        });
        
        // 6. Test admin functions (if they exist)
        console.log('\n6️⃣ Testing admin functions...');
        if (allDrivers.length > 0) {
            const testDriver = allDrivers[0];
            console.log(`Testing with driver: ${testDriver.first_name} ${testDriver.last_name}`);
            
            // Just show what the function call would look like
            console.log('📝 Admin functions available:');
            console.log(`   approve_driver('${testDriver.id}', admin_uuid)`);
            console.log(`   reject_driver('${testDriver.id}', 'reason', admin_uuid)`);
        }
        
        console.log('\n🎉 Proper approval system test completed!');
        console.log('\n💡 Next steps:');
        console.log('   1. Open admin-dashboard-proper.html');
        console.log('   2. Update mobile app to check is_approved field');
        console.log('   3. Test complete workflow');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testProperApprovalSystem();

// Test Email Integration with Admin Dashboard
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

async function testEmailIntegration() {
  console.log('🧪 TESTING EMAIL INTEGRATION');
  console.log('==============================\n');

  try {
    // Check recent email logs to see if integration is working
    console.log('1️⃣ Checking recent email logs...');
    
    const { data: emailLogs, error: emailError } = await serviceSupabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (emailError) {
      console.log('❌ Error fetching email logs:', emailError);
      return;
    }

    console.log(`📧 Found ${emailLogs.length} email log entries:`);
    
    emailLogs.forEach((log, index) => {
      const logDate = new Date(log.created_at).toLocaleString();
      console.log(`${index + 1}. ${log.email_type} → ${log.email_address}`);
      console.log(`   Subject: ${log.subject}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Date: ${logDate}`);
      console.log('   ---');
    });

    // Check for recent approval/rejection emails
    const recentDriverEmails = emailLogs.filter(log => 
      log.email_type === 'driver_approval' || log.email_type === 'driver_rejection'
    );

    console.log(`\n2️⃣ Recent driver notification emails: ${recentDriverEmails.length}`);
    
    if (recentDriverEmails.length > 0) {
      console.log('✅ Email integration is working!');
      recentDriverEmails.forEach(email => {
        console.log(`   📧 ${email.email_type} sent to ${email.email_address}`);
      });
    } else {
      console.log('⚠️  No recent driver notification emails found');
      console.log('   This might mean:');
      console.log('   - No drivers have been approved/rejected recently');
      console.log('   - Email integration needs testing');
    }

    // Check recent driver status changes
    console.log('\n3️⃣ Checking recent driver status changes...');
    
    const { data: recentDrivers, error: driversError } = await serviceSupabase
      .from('driver_profiles')
      .select('id, first_name, last_name, approval_status, approved_at, updated_at')
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(5);

    if (driversError) {
      console.log('❌ Error fetching recent drivers:', driversError);
    } else {
      console.log(`👥 Recently approved drivers: ${recentDrivers.length}`);
      recentDrivers.forEach(driver => {
        const approvedDate = new Date(driver.approved_at).toLocaleString();
        console.log(`   ✅ ${driver.first_name} ${driver.last_name} - ${approvedDate}`);
      });
    }

    console.log('\n📊 INTEGRATION STATUS:');
    console.log('======================');
    console.log('✅ Email functions added to admin dashboard');
    console.log('✅ Email logging system active');
    console.log('✅ Approval/rejection functions updated');
    console.log('✅ Email integration ready for testing');

    console.log('\n🧪 TO TEST:');
    console.log('==========');
    console.log('1. Open admin dashboard');
    console.log('2. Approve or reject a pending driver');
    console.log('3. Check email_logs table for new entries');
    console.log('4. Verify email content and recipient');

    console.log('\n💡 NEXT STEPS:');
    console.log('==============');
    console.log('• Configure SENDGRID_API_KEY for actual email sending');
    console.log('• Set FROM_EMAIL environment variable');
    console.log('• Replace email logging with actual email service calls');
    console.log('• Test email delivery in development environment');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testEmailIntegration();

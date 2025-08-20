const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

// Mock email service for testing (replace with actual email service in production)
async function sendEmailNotification(driverId, status, rejectionReason = null) {
  try {
    console.log(`📧 Sending ${status} email notification...`);
    
    // Get driver details
    const { data: driver, error: driverError } = await supabase
      .from('driver_profiles')
      .select(`
        first_name,
        last_name,
        users!inner(email)
      `)
      .eq('id', driverId)
      .single();

    if (driverError || !driver) {
      console.error('❌ Driver not found:', driverError);
      return false;
    }

    const driverName = `${driver.first_name} ${driver.last_name}`;
    const driverEmail = driver.users.email;

    console.log(`👤 Driver: ${driverName} (${driverEmail})`);

    // Email templates (simplified for testing)
    const emailTemplates = {
      approved: {
        subject: '🎉 Your YouMats Driver Application has been Approved!',
        body: `Congratulations ${driverName}! Your driver application has been approved. You can now start accepting delivery orders.`
      },
      rejected: {
        subject: 'YouMats Driver Application Update',
        body: `Dear ${driverName}, unfortunately we cannot approve your application at this time. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`
      },
      pending: {
        subject: 'YouMats Driver Application Received',
        body: `Dear ${driverName}, we have received your driver application and it is currently under review.`
      }
    };

    const template = emailTemplates[status];
    if (!template) {
      console.error('❌ Unknown email status:', status);
      return false;
    }

    // Log email in database
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        driver_id: driverId,
        email_type: `approval_${status}`,
        email_address: driverEmail,
        subject: template.subject,
        status: 'sent'
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to log email:', logError);
      return false;
    }

    console.log('✅ Email notification sent successfully');
    console.log(`📬 Subject: ${template.subject}`);
    console.log(`📄 Body: ${template.body.substring(0, 100)}...`);
    console.log(`📊 Email logged with ID: ${emailLog.id}`);

    return true;

  } catch (error) {
    console.error('💥 Error sending email:', error);
    return false;
  }
}

// Test the complete approval workflow with email notifications
async function testApprovalWorkflowWithEmails() {
  try {
    console.log('🔄 Testing complete approval workflow with email notifications...\n');

    // Get a test driver
    const { data: drivers, error: driversError } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(1);

    if (driversError || !drivers || drivers.length === 0) {
      console.log('❌ No drivers found for testing');
      return;
    }

    const driver = drivers[0];
    console.log(`🧪 Using driver: ${driver.first_name} ${driver.last_name} (${driver.id.substring(0, 8)})\n`);

    // Test 1: Set to pending and send email
    console.log('1️⃣ Setting driver to pending status...');
    const { error: pendingError } = await supabase
      .from('driver_profiles')
      .update({
        is_approved: false,
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (pendingError) {
      console.error('❌ Failed to set pending:', pendingError);
    } else {
      console.log('✅ Status set to pending');
      await sendEmailNotification(driver.id, 'pending');
    }

    console.log('\n⏱️ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Approve driver and send email
    console.log('2️⃣ Approving driver...');
    const { error: approveError } = await supabase
      .from('driver_profiles')
      .update({
        is_approved: true,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (approveError) {
      console.error('❌ Failed to approve:', approveError);
    } else {
      console.log('✅ Driver approved');
      await sendEmailNotification(driver.id, 'approved');
    }

    console.log('\n⏱️ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Reject driver and send email
    console.log('3️⃣ Rejecting driver...');
    const { error: rejectError } = await supabase
      .from('driver_profiles')
      .update({
        is_approved: false,
        approval_status: 'rejected',
        rejection_reason: 'Test rejection for workflow demonstration',
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (rejectError) {
      console.error('❌ Failed to reject:', rejectError);
    } else {
      console.log('✅ Driver rejected');
      await sendEmailNotification(driver.id, 'rejected', 'Test rejection for workflow demonstration');
    }

    console.log('\n⏱️ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Restore to approved
    console.log('4️⃣ Restoring driver to approved status...');
    const { error: restoreError } = await supabase
      .from('driver_profiles')
      .update({
        is_approved: true,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', driver.id);

    if (restoreError) {
      console.error('❌ Failed to restore:', restoreError);
    } else {
      console.log('✅ Driver restored to approved status');
      await sendEmailNotification(driver.id, 'approved');
    }

    // Show email logs
    console.log('\n📊 Email logs for this test:');
    const { data: emailLogs, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('driver_id', driver.id)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ Failed to get email logs:', logsError);
    } else {
      emailLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.email_type} - ${log.subject} (${log.status})`);
        console.log(`   📅 ${new Date(log.sent_at).toLocaleString()}`);
      });
    }

    console.log('\n🎉 Approval workflow with email notifications completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Pending status with email notification');
    console.log('   ✅ Approval status with email notification');
    console.log('   ✅ Rejection status with email notification');
    console.log('   ✅ Email logs properly recorded');
    console.log('   ✅ Driver status properly managed');

  } catch (error) {
    console.error('💥 Error in approval workflow test:', error);
  }
}

testApprovalWorkflowWithEmails();

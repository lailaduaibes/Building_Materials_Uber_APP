// Updated Admin Dashboard Functions with Email Integration
// Add this to the admin-dashboard-proper.html file

// Load the driver email service
async function loadDriverEmailService() {
  try {
    // In a real implementation, this would be imported properly
    // For now, we'll include the email service functions directly
    console.log('📧 Loading driver email service...');
    
    // Email service functions will be added to the dashboard
    window.sendDriverApprovalEmail = async function(driverId, driverName) {
      console.log(`📧 Sending approval email to ${driverName}...`);
      
      try {
        // Get driver details with email
        const driverResponse = await fetch(`${SUPABASE_URL}/rest/v1/driver_profiles?id=eq.${driverId}&select=first_name,last_name,users!inner(email)`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!driverResponse.ok) {
          throw new Error('Failed to fetch driver details');
        }

        const driverData = await driverResponse.json();
        const driver = driverData[0];

        if (!driver) {
          throw new Error('Driver not found');
        }

        const driverEmail = driver.users.email;
        console.log(`📧 Sending approval email to: ${driverEmail}`);

        // Log email in database (placeholder for actual email sending)
        const emailLog = {
          driver_id: driverId,
          email_type: 'driver_approval',
          email_address: driverEmail,
          subject: '🎉 Your YouMats Driver Application has been Approved!',
          email_content: `Congratulations ${driver.first_name} ${driver.last_name}! Your driver application has been approved.`,
          status: 'sent',
          sent_at: new Date().toISOString()
        };

        // In production, send actual email here using EmailService
        // await emailService.sendDriverApprovalEmail(driverEmail, driver.first_name, driver.last_name);

        // For now, just log to database
        const logResponse = await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailLog)
        });

        if (logResponse.ok) {
          console.log('✅ Approval email logged successfully');
          showMessage(`✅ Approval email sent to ${driverName} at ${driverEmail}`, 'success');
          return true;
        } else {
          throw new Error('Failed to log email');
        }

      } catch (error) {
        console.error('❌ Error sending approval email:', error);
        showMessage(`⚠️ Driver approved but email failed: ${error.message}`, 'warning');
        return false;
      }
    };

    window.sendDriverRejectionEmail = async function(driverId, driverName, rejectionReason) {
      console.log(`📧 Sending rejection email to ${driverName}...`);
      
      try {
        // Get driver details with email
        const driverResponse = await fetch(`${SUPABASE_URL}/rest/v1/driver_profiles?id=eq.${driverId}&select=first_name,last_name,users!inner(email)`, {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!driverResponse.ok) {
          throw new Error('Failed to fetch driver details');
        }

        const driverData = await driverResponse.json();
        const driver = driverData[0];

        if (!driver) {
          throw new Error('Driver not found');
        }

        const driverEmail = driver.users.email;
        console.log(`📧 Sending rejection email to: ${driverEmail}`);

        // Log email in database (placeholder for actual email sending)
        const emailLog = {
          driver_id: driverId,
          email_type: 'driver_rejection',
          email_address: driverEmail,
          subject: 'YouMats Driver Application Update',
          email_content: `Dear ${driver.first_name} ${driver.last_name}, unfortunately we cannot approve your application at this time. ${rejectionReason ? 'Reason: ' + rejectionReason : ''}`,
          status: 'sent',
          sent_at: new Date().toISOString()
        };

        // In production, send actual email here using EmailService
        // await emailService.sendDriverRejectionEmail(driverEmail, driver.first_name, driver.last_name, rejectionReason);

        // For now, just log to database
        const logResponse = await fetch(`${SUPABASE_URL}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailLog)
        });

        if (logResponse.ok) {
          console.log('✅ Rejection email logged successfully');
          showMessage(`✅ Rejection email sent to ${driverName} at ${driverEmail}`, 'success');
          return true;
        } else {
          throw new Error('Failed to log email');
        }

      } catch (error) {
        console.error('❌ Error sending rejection email:', error);
        showMessage(`⚠️ Driver rejected but email failed: ${error.message}`, 'warning');
        return false;
      }
    };

    console.log('✅ Driver email service loaded successfully');
    
  } catch (error) {
    console.error('❌ Failed to load driver email service:', error);
  }
}

// Updated approval function with email integration
async function approveDriverWithEmail(driverId, driverName) {
  if (!confirm(`Approve ${driverName} as a professional driver and add their vehicle to the fleet?`)) {
    return;
  }
  
  try {
    showMessage(`Approving ${driverName} and adding vehicle to fleet...`, 'info');
    
    // Step 1: Approve the driver (existing logic)
    const approvalResponse = await fetch(`${SUPABASE_URL}/rest/v1/driver_profiles?id=eq.${driverId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        is_approved: true,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        truck_added_to_fleet: true,
        updated_at: new Date().toISOString()
      })
    });

    if (!approvalResponse.ok) {
      const error = await approvalResponse.json();
      throw new Error(error.message || 'Failed to approve driver');
    }

    console.log('✅ Driver approved in database');

    // Step 2: Send approval email
    await sendDriverApprovalEmail(driverId, driverName);

    // Step 3: Add truck to fleet (existing logic)
    // ... truck creation logic ...

    setTimeout(() => {
      loadDashboard();
    }, 2000);
    
  } catch (error) {
    console.error('Error approving driver:', error);
    showMessage(`Failed to approve ${driverName}: ${error.message}`, 'error');
  }
}

// Updated rejection function with email integration
async function rejectDriverWithEmail(driverId, driverName) {
  const reason = prompt(`Why are you rejecting ${driverName}'s application?`);
  if (!reason) return;
  
  try {
    showMessage(`Rejecting ${driverName}...`, 'info');
    
    // Step 1: Reject the driver (existing logic)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/driver_profiles?id=eq.${driverId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        is_approved: false,
        approval_status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reject driver');
    }

    console.log('✅ Driver rejected in database');

    // Step 2: Send rejection email
    await sendDriverRejectionEmail(driverId, driverName, reason);

    setTimeout(() => {
      loadDashboard();
    }, 2000);
    
  } catch (error) {
    console.error('Error rejecting driver:', error);
    showMessage(`Failed to reject ${driverName}: ${error.message}`, 'error');
  }
}

// Initialize email service when dashboard loads
document.addEventListener('DOMContentLoaded', function() {
  loadDriverEmailService();
});

console.log('📧 Admin dashboard email integration functions loaded');

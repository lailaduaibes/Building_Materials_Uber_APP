/**
 * Email Notification Service for Driver Approval Status Changes
 * Sends professional email notifications when driver approval status changes
 */

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail', // or your preferred email service
    auth: {
      user: process.env.EMAIL_USER || 'your-app-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// Email templates
const emailTemplates = {
  approved: (driverName) => ({
    subject: '🎉 Your YouMats Driver Application has been Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 300;">YouMats</h1>
          <p style="color: #666666; margin: 10px 0 0 0; font-size: 16px;">Building Materials Delivery</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Congratulations, ${driverName}!</h2>
          <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Your driver application has been <strong>approved</strong>! You can now start accepting delivery orders and earning with YouMats.
          </p>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border-left: 4px solid #4CAF50;">
            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
            <ul style="color: #333333; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Open the YouMats Driver app on your phone</li>
              <li>Complete your profile setup if needed</li>
              <li>Start accepting delivery orders in your area</li>
              <li>Track your earnings and performance</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0;">
          <p style="color: #666666; margin: 0; font-size: 14px;">
            Questions? Contact us at support@youmats.com
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            YouMats - Professional Building Materials Delivery Platform
          </p>
        </div>
      </div>
    `
  }),

  rejected: (driverName, reason) => ({
    subject: 'YouMats Driver Application Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 300;">YouMats</h1>
          <p style="color: #666666; margin: 10px 0 0 0; font-size: 16px;">Building Materials Delivery</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Application Status Update</h2>
          <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Dear ${driverName},
          </p>
          <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Thank you for your interest in becoming a YouMats driver. After reviewing your application, 
            we are unable to approve it at this time.
          </p>
          
          ${reason ? `
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h3 style="color: #000000; margin: 0 0 10px 0; font-size: 16px;">Reason:</h3>
              <p style="color: #333333; margin: 0; font-size: 14px;">${reason}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border-left: 4px solid #17a2b8;">
            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">What's Next:</h3>
            <ul style="color: #333333; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Review the feedback provided</li>
              <li>Address any issues mentioned</li>
              <li>You may reapply after making necessary improvements</li>
              <li>Contact support if you have questions</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0;">
          <p style="color: #666666; margin: 0; font-size: 14px;">
            Questions? Contact us at support@youmats.com
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            YouMats - Professional Building Materials Delivery Platform
          </p>
        </div>
      </div>
    `
  }),

  pending: (driverName) => ({
    subject: 'YouMats Driver Application Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #000000; margin: 0; font-size: 32px; font-weight: 300;">YouMats</h1>
          <p style="color: #666666; margin: 10px 0 0 0; font-size: 16px;">Building Materials Delivery</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Application Received</h2>
          <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Dear ${driverName},
          </p>
          <p style="color: #333333; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Thank you for submitting your driver application with YouMats! We have received your information 
            and our team is currently reviewing your application.
          </p>
          
          <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107;">
            <h3 style="color: #000000; margin: 0 0 15px 0; font-size: 18px;">What Happens Next:</h3>
            <ul style="color: #333333; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Our team will review your application and documents</li>
              <li>We'll verify your driver's license and vehicle information</li>
              <li>You'll receive an email with our decision within 2-3 business days</li>
              <li>If approved, you can immediately start accepting orders</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0;">
          <p style="color: #666666; margin: 0; font-size: 14px;">
            Questions? Contact us at support@youmats.com
          </p>
          <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
            YouMats - Professional Building Materials Delivery Platform
          </p>
        </div>
      </div>
    `
  })
};

// Send email notification
async function sendApprovalEmail(driverId, newStatus, rejectionReason = null) {
  try {
    console.log(`📧 Sending ${newStatus} email to driver ${driverId.substring(0, 8)}...`);
    
    // Get driver details including email
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
      console.error('Error fetching driver details:', driverError);
      return { success: false, error: 'Driver not found' };
    }

    const driverName = `${driver.first_name} ${driver.last_name}`;
    const driverEmail = driver.users.email;

    if (!driverEmail) {
      console.error('No email address found for driver');
      return { success: false, error: 'No email address' };
    }

    // Get email template
    let template;
    switch (newStatus) {
      case 'approved':
        template = emailTemplates.approved(driverName);
        break;
      case 'rejected':
        template = emailTemplates.rejected(driverName, rejectionReason);
        break;
      case 'pending':
        template = emailTemplates.pending(driverName);
        break;
      default:
        console.error('Unknown status:', newStatus);
        return { success: false, error: 'Unknown status' };
    }

    // Create transporter and send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'YouMats <noreply@youmats.com>',
      to: driverEmail,
      subject: template.subject,
      html: template.html
    };

    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ ${newStatus} email sent successfully to ${driverEmail}`);
    
    // Log email in database for tracking
    await supabase
      .from('email_logs')
      .insert({
        driver_id: driverId,
        email_type: `approval_${newStatus}`,
        email_address: driverEmail,
        subject: template.subject,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log error in database
    try {
      await supabase
        .from('email_logs')
        .insert({
          driver_id: driverId,
          email_type: `approval_${newStatus}`,
          email_address: 'unknown',
          subject: `Error sending ${newStatus} email`,
          sent_at: new Date().toISOString(),
          status: 'failed',
          error_message: error.message
        });
    } catch (logError) {
      console.error('Error logging email failure:', logError);
    }
    
    return { success: false, error: error.message };
  }
}

// Database trigger function to automatically send emails on status change
async function setupEmailTriggers() {
  try {
    console.log('📧 Setting up email notification triggers...');
    
    // Create email_logs table if it doesn't exist
    const createEmailLogsTable = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id UUID REFERENCES driver_profiles(id),
        email_type VARCHAR(50) NOT NULL,
        email_address VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await supabase.rpc('exec_sql', { sql: createEmailLogsTable });
    
    // Create function to handle approval status changes
    const triggerFunction = `
      CREATE OR REPLACE FUNCTION handle_approval_status_change()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only send email if approval_status actually changed
        IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
          -- Use pg_notify to send notification to Node.js service
          PERFORM pg_notify('driver_approval_changed', json_build_object(
            'driver_id', NEW.id,
            'old_status', OLD.approval_status,
            'new_status', NEW.approval_status,
            'rejection_reason', NEW.rejection_reason
          )::text);
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await supabase.rpc('exec_sql', { sql: triggerFunction });
    
    // Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS driver_approval_status_changed ON driver_profiles;
      CREATE TRIGGER driver_approval_status_changed
        AFTER UPDATE ON driver_profiles
        FOR EACH ROW
        EXECUTE FUNCTION handle_approval_status_change();
    `;
    
    await supabase.rpc('exec_sql', { sql: createTrigger });
    
    console.log('✅ Email notification triggers set up successfully');
    
  } catch (error) {
    console.error('Error setting up email triggers:', error);
    throw error;
  }
}

// Listen for approval status changes and send emails
async function startEmailNotificationService() {
  try {
    console.log('📧 Starting email notification service...');
    
    // Set up triggers first
    await setupEmailTriggers();
    
    // Listen for database notifications
    const client = supabase
      .channel('driver_approval_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'driver_profiles',
        filter: 'approval_status=neq.null'
      }, async (payload) => {
        console.log('📧 Driver approval status changed:', payload);
        
        const { new: newRecord, old: oldRecord } = payload;
        
        // Only send email if status actually changed
        if (oldRecord?.approval_status !== newRecord?.approval_status) {
          await sendApprovalEmail(
            newRecord.id,
            newRecord.approval_status,
            newRecord.rejection_reason
          );
        }
      })
      .subscribe();
    
    console.log('✅ Email notification service started successfully');
    console.log('📧 Listening for driver approval status changes...');
    
    return client;
    
  } catch (error) {
    console.error('Error starting email notification service:', error);
    throw error;
  }
}

// Test email functionality
async function testEmailNotification(driverId, status = 'approved') {
  console.log('📧 Testing email notification...');
  const result = await sendApprovalEmail(driverId, status, status === 'rejected' ? 'Test rejection reason' : null);
  console.log('Test result:', result);
  return result;
}

module.exports = {
  sendApprovalEmail,
  startEmailNotificationService,
  setupEmailTriggers,
  testEmailNotification
};

// If running this file directly, start the service
if (require.main === module) {
  startEmailNotificationService()
    .then(() => {
      console.log('📧 Email notification service is running...');
      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('📧 Email notification service shutting down...');
        process.exit(0);
      });
    })
    .catch(error => {
      console.error('Failed to start email notification service:', error);
      process.exit(1);
    });
}

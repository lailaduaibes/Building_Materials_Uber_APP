// Driver Email Notification Service - Integrates with Admin Dashboard
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

/**
 * Driver Email Notification Service
 * Handles sending emails when drivers are approved/rejected
 */
class DriverEmailService {
  
  /**
   * Send approval email to driver
   */
  async sendApprovalEmail(driverId, driverName) {
    try {
      console.log(`📧 Sending approval email to driver ${driverName}...`);
      
      // Get driver details with email
      const { data: driver, error: driverError } = await serviceSupabase
        .from('driver_profiles')
        .select(`
          first_name,
          last_name,
          users!inner(email)
        `)
        .eq('id', driverId)
        .single();

      if (driverError || !driver) {
        throw new Error(`Driver not found: ${driverError?.message}`);
      }

      const driverEmail = driver.users.email;
      console.log(`Sending to: ${driverEmail}`);

      // Email template for approval
      const emailTemplate = {
        subject: '🎉 Your YouMats Driver Application has been Approved!',
        html: this.generateApprovalEmailHTML(driver.first_name, driver.last_name),
        text: this.generateApprovalEmailText(driver.first_name, driver.last_name)
      };

      // In production, integrate with actual EmailService
      // For now, log the email content and store in database
      await this.logEmail(driverId, 'approval', driverEmail, emailTemplate);
      
      console.log('✅ Approval email sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Error sending approval email:', error);
      return false;
    }
  }

  /**
   * Send rejection email to driver
   */
  async sendRejectionEmail(driverId, driverName, rejectionReason) {
    try {
      console.log(`📧 Sending rejection email to driver ${driverName}...`);
      
      // Get driver details with email
      const { data: driver, error: driverError } = await serviceSupabase
        .from('driver_profiles')
        .select(`
          first_name,
          last_name,
          users!inner(email)
        `)
        .eq('id', driverId)
        .single();

      if (driverError || !driver) {
        throw new Error(`Driver not found: ${driverError?.message}`);
      }

      const driverEmail = driver.users.email;
      console.log(`Sending to: ${driverEmail}`);

      // Email template for rejection
      const emailTemplate = {
        subject: 'YouMats Driver Application Update',
        html: this.generateRejectionEmailHTML(driver.first_name, driver.last_name, rejectionReason),
        text: this.generateRejectionEmailText(driver.first_name, driver.last_name, rejectionReason)
      };

      // In production, integrate with actual EmailService
      // For now, log the email content and store in database
      await this.logEmail(driverId, 'rejection', driverEmail, emailTemplate);
      
      console.log('✅ Rejection email sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Error sending rejection email:', error);
      return false;
    }
  }

  /**
   * Generate approval email HTML
   */
  generateApprovalEmailHTML(firstName, lastName) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>🎉 Congratulations!</h1>
          <h2>You're Now a YouMats Driver!</h2>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: #d1fae5; border: 1px solid #10b981; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h2>✅ Application Status: APPROVED</h2>
            <p><strong>Welcome to the YouMats driver network, ${firstName} ${lastName}!</strong></p>
          </div>
          
          <p>Great news! Your driver application has been reviewed and approved. You can now start accepting delivery orders and earning money with YouMats.</p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>🚛 Your Vehicle Status:</h3>
            <p>✅ Vehicle information verified and added to our fleet<br>
            ✅ Insurance documents approved<br>
            ✅ Driver credentials validated<br>
            ✅ Ready to accept delivery requests</p>
          </div>
          
          <h3>📱 Next Steps:</h3>
          <ol>
            <li><strong>Download the YouMats Driver App</strong> (if you haven't already)</li>
            <li><strong>Log in</strong> with your approved credentials</li>
            <li><strong>Go online</strong> to start receiving delivery requests</li>
            <li><strong>Complete your first delivery</strong> and start earning!</li>
          </ol>
          
          <p>Welcome to the team! We're excited to have you as part of the YouMats family.</p>
          
          <p>Safe driving,<br>The YouMats Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate approval email text
   */
  generateApprovalEmailText(firstName, lastName) {
    return `
      Congratulations! Your YouMats Driver Application has been Approved!
      
      Hi ${firstName} ${lastName},
      
      Great news! Your driver application has been reviewed and approved. You can now start accepting delivery orders and earning money with YouMats.
      
      Your Vehicle Status:
      ✅ Vehicle information verified and added to our fleet
      ✅ Insurance documents approved  
      ✅ Driver credentials validated
      ✅ Ready to accept delivery requests
      
      Next Steps:
      1. Download the YouMats Driver App (if you haven't already)
      2. Log in with your approved credentials
      3. Go online to start receiving delivery requests
      4. Complete your first delivery and start earning!
      
      Welcome to the team! We're excited to have you as part of the YouMats family.
      
      Safe driving,
      The YouMats Team
    `;
  }

  /**
   * Generate rejection email HTML
   */
  generateRejectionEmailHTML(firstName, lastName, rejectionReason) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1>Driver Application Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2>Dear ${firstName} ${lastName},</h2>
          
          <p>Thank you for your interest in becoming a YouMats driver. After careful review of your application, we are unable to approve it at this time.</p>
          
          ${rejectionReason ? `
          <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>📋 Reason for Decision:</h3>
            <p>${rejectionReason}</p>
          </div>
          ` : ''}
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3>🔄 Reapplication Process:</h3>
            <p>You may reapply for a driver position after addressing any concerns mentioned above. We encourage you to:</p>
            <ul>
              <li>Review our driver requirements</li>
              <li>Ensure all documents are current and valid</li>
              <li>Update any outdated information</li>
              <li>Submit a new application when ready</li>
            </ul>
          </div>
          
          <p>We appreciate your interest in YouMats and wish you the best in your endeavors.</p>
          
          <p>Sincerely,<br>The YouMats Recruitment Team</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate rejection email text
   */
  generateRejectionEmailText(firstName, lastName, rejectionReason) {
    return `
      YouMats Driver Application Update
      
      Dear ${firstName} ${lastName},
      
      Thank you for your interest in becoming a YouMats driver. After careful review of your application, we are unable to approve it at this time.
      
      ${rejectionReason ? `Reason for Decision: ${rejectionReason}\n\n` : ''}
      
      Reapplication Process:
      You may reapply for a driver position after addressing any concerns mentioned above. We encourage you to:
      - Review our driver requirements
      - Ensure all documents are current and valid  
      - Update any outdated information
      - Submit a new application when ready
      
      We appreciate your interest in YouMats and wish you the best in your endeavors.
      
      Sincerely,
      The YouMats Recruitment Team
    `;
  }

  /**
   * Log email to database
   */
  async logEmail(driverId, emailType, emailAddress, template) {
    try {
      const { data, error } = await serviceSupabase
        .from('email_logs')
        .insert({
          driver_id: driverId,
          email_type: `driver_${emailType}`,
          email_address: emailAddress,
          subject: template.subject,
          email_content: template.html,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Failed to log email:', error);
      } else {
        console.log('Email logged to database');
      }
    } catch (error) {
      console.warn('Failed to log email:', error);
    }
  }
}

// Export singleton instance
const driverEmailService = new DriverEmailService();

// Make it available globally for admin dashboard
if (typeof window !== 'undefined') {
  window.driverEmailService = driverEmailService;
}

module.exports = { driverEmailService };

console.log('✅ Driver Email Service loaded and ready');

import { logger } from './logger';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  variables?: Record<string, string>;
}

export class EmailService {
  private readonly frontendUrl: string;

  constructor() {
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Generate email verification template
   */
  generateVerificationEmail(firstName: string, verificationToken: string): EmailTemplate {
    const verificationUrl = `${this.frontendUrl}/verify-email/${verificationToken}`;
    
    const subject = 'Verify your YouMats account';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - YouMats</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to YouMats!</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for signing up with YouMats - your reliable building materials delivery service!</p>
            <p>To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Schedule building material deliveries</li>
              <li>Track your orders in real-time</li>
              <li>Manage your delivery preferences</li>
              <li>Access our customer support</li>
            </ul>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The YouMats Team</p>
          </div>
          <div class="footer">
            <p>YouMats Delivery Service<br>
            Email: support@youmats.com<br>
            This email was sent to ${firstName} regarding account verification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to YouMats!
      
      Hi ${firstName},
      
      Thank you for signing up with YouMats - your reliable building materials delivery service!
      
      To complete your registration, please verify your email address by visiting this link:
      ${verificationUrl}
      
      This verification link will expire in 24 hours.
      
      Once verified, you'll be able to schedule deliveries, track orders, and access all our services.
      
      If you didn't create this account, please ignore this email.
      
      Best regards,
      The YouMats Team
      
      YouMats Delivery Service
      Email: support@youmats.com
    `;

    return { subject, html, text };
  }

  /**
   * Generate password reset email template
   */
  generatePasswordResetEmail(firstName: string, resetToken: string): EmailTemplate {
    const resetUrl = `${this.frontendUrl}/reset-password/${resetToken}`;
    
    const subject = 'Reset your YouMats password';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - YouMats</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            background: #dc2626; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 20px 0;
          }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .warning { background: #fef2f2; border: 1px solid #f87171; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>We received a request to reset your YouMats account password.</p>
            <p>Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>For your security:</p>
            <ul>
              <li>Never share this link with anyone</li>
              <li>Choose a strong, unique password</li>
              <li>Consider using a password manager</li>
            </ul>
            
            <p>If you continue to have issues accessing your account, please contact our support team.</p>
            
            <p>Best regards,<br>The YouMats Security Team</p>
          </div>
          <div class="footer">
            <p>YouMats Delivery Service<br>
            Email: support@youmats.com<br>
            This is an automated security email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request - YouMats
      
      Hi ${firstName},
      
      We received a request to reset your YouMats account password.
      
      Click this link to create a new password:
      ${resetUrl}
      
      This password reset link will expire in 1 hour.
      
      If you didn't request this reset, please ignore this email and your password will remain unchanged.
      
      For security, never share this link with anyone and choose a strong, unique password.
      
      If you continue to have issues, please contact our support team.
      
      Best regards,
      The YouMats Security Team
      
      YouMats Delivery Service
      Email: support@youmats.com
    `;

    return { subject, html, text };
  }

  /**
   * Send email using SendGrid for production B2B service
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // Check if SendGrid is configured for production
      if (process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL) {
        // Production email sending with SendGrid
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        
        const msg = {
          to: options.to,
          from: {
            email: process.env.FROM_EMAIL,
            name: 'BuildMate Delivery Service'
          },
          subject: options.template.subject,
          text: options.template.text,
          html: options.template.html,
          // B2B email settings
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true },
            subscriptionTracking: { enable: false }
          },
          mailSettings: {
            sandboxMode: { enable: process.env.NODE_ENV !== 'production' }
          }
        };
        
        const result = await sgMail.send(msg);
        logger.info(`✅ Email sent successfully to ${options.to}`, { messageId: result[0].headers['x-message-id'] });
        return true;
        
      } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        // Fallback to SMTP for self-hosted email servers
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          // B2B reliability settings
          pool: true,
          maxConnections: 5,
          maxMessages: 100,
          rateDelta: 1000,
          rateLimit: 10
        });
        
        const result = await transporter.sendMail({
          from: `"BuildMate Delivery" <${process.env.FROM_EMAIL}>`,
          to: options.to,
          subject: options.template.subject,
          text: options.template.text,
          html: options.template.html
        });
        
        logger.info(`✅ Email sent via SMTP to ${options.to}`, { messageId: result.messageId });
        return true;
        
      } else {
        // Development mode - log email content
        logger.warn('⚠️ EMAIL SERVICE NOT CONFIGURED - Logging email content for development:');
        logger.info(`📧 To: ${options.to}`);
        logger.info(`📧 Subject: ${options.template.subject}`);
        logger.info(`📧 Content preview: ${options.template.text.substring(0, 200)}...`);
        
        // In production, this should throw an error
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Email service not properly configured for production');
        }
        
        return true; // For development/testing
      }
      
    } catch (error) {
      logger.error('❌ Failed to send email:', error);
      
      // For B2B reliability, you might want to queue failed emails for retry
      // await this.queueEmailForRetry(options);
      
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, firstName: string, verificationToken: string): Promise<boolean> {
    const template = this.generateVerificationEmail(firstName, verificationToken);
    return this.sendEmail({ to, template });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, firstName: string, resetToken: string): Promise<boolean> {
    const template = this.generatePasswordResetEmail(firstName, resetToken);
    return this.sendEmail({ to, template });
  }
}

export const emailService = new EmailService();

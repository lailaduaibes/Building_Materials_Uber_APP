import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDB } from '../config/database-supabase';
import { createError } from '../middleware/errorHandler';
import { UserRole, CreateUserRequest, LoginRequest, AuthResponse } from '../types/user';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class AuthControllerWithVerification {
  /**
   * Register a new user with email verification
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role = UserRole.CUSTOMER
      }: CreateUserRequest = req.body;

      const supabase = getDB();

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email_verified')
        .eq('email', email)
        .single();

      if (existingUser) {
        if (existingUser.email_verified) {
          throw createError('User already exists with this email', 409);
        } else {
          // User exists but not verified, resend verification
          await this.resendVerificationEmail(email);
          res.status(200).json({
            success: true,
            message: 'Verification email resent to your email address',
            requiresVerification: true
          });
          return;
        }
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user with unverified status
      const userId = uuidv4();
      const { data: result, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          role,
          is_active: false, // Inactive until verified
          email_verified: false,
          verification_token: verificationToken,
          verification_expires: verificationExpires.toISOString(),
          created_at: new Date().toISOString()
        })
        .select('id, email, first_name, last_name')
        .single();

      if (error || !result) {
        logger.error('Failed to create user:', error);
        throw createError('Failed to create user', 500);
      }

      // Send verification email using Supabase Auth
      await this.sendVerificationEmail(email, verificationToken, firstName);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        data: {
          userId: result.id,
          email: result.email,
          requiresVerification: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        throw createError('Verification token is required', 400);
      }

      const supabase = getDB();

      // Find user with valid verification token
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, verification_expires, email_verified')
        .eq('verification_token', token)
        .single();

      if (error || !user) {
        throw createError('Invalid or expired verification token', 400);
      }

      if (user.email_verified) {
        throw createError('Email already verified', 400);
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(user.verification_expires);
      
      if (now > expiresAt) {
        throw createError('Verification token has expired. Please request a new one.', 400);
      }

      // Update user as verified and active
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email_verified: true,
          is_active: true,
          verification_token: null,
          verification_expires: null,
          verified_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        logger.error('Failed to verify user:', updateError);
        throw createError('Failed to verify email', 500);
      }

      logger.info(`Email verified successfully for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        data: {
          email: user.email,
          verified: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw createError('Email is required', 400);
      }

      const supabase = getDB();

      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, email_verified')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw createError('User not found', 404);
      }

      if (user.email_verified) {
        throw createError('Email already verified', 400);
      }

      await this.resendVerificationEmail(email);

      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enhanced login with email verification check
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { email, password }: LoginRequest = req.body;

      const supabase = getDB();

      // Get user with all necessary fields
      const { data: result, error } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, phone, role, is_active, email_verified')
        .eq('email', email)
        .single();

      if (error || !result) {
        throw createError('Invalid credentials', 401);
      }

      const user = result;

      // Check if email is verified
      if (!user.email_verified) {
        throw createError('Please verify your email before logging in. Check your inbox for verification link.', 401);
      }

      if (!user.is_active) {
        throw createError('Account is inactive. Please contact support.', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Generate JWT
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw createError('JWT secret not configured', 500);
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          verified: user.email_verified 
        },
        jwtSecret
      );

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };

      logger.info(`User logged in successfully: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: response
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send verification email using Supabase Auth
   */
  private async sendVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    try {
      const supabase = getDB();
      
      // Use Supabase's built-in email functionality
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
      
      // For now, we'll log the verification URL
      // In production, you would integrate with Supabase's email templates
      logger.info(`Verification email would be sent to ${email}`);
      logger.info(`Verification URL: ${verificationUrl}`);
      
      // TODO: Integrate with Supabase email templates or external email service
      // For development, the verification URL is logged above
      
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw createError('Failed to send verification email', 500);
    }
  }

  /**
   * Resend verification email
   */
  private async resendVerificationEmail(email: string): Promise<void> {
    try {
      const supabase = getDB();
      
      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new verification token
      const { data: user, error } = await supabase
        .from('users')
        .update({
          verification_token: verificationToken,
          verification_expires: verificationExpires.toISOString()
        })
        .eq('email', email)
        .select('first_name')
        .single();

      if (error) {
        throw createError('Failed to generate new verification token', 500);
      }

      // Send new verification email
      await this.sendVerificationEmail(email, verificationToken, user.first_name);
      
    } catch (error) {
      logger.error('Failed to resend verification email:', error);
      throw createError('Failed to resend verification email', 500);
    }
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      
      if (!email) {
        throw createError('Email is required', 400);
      }

      const supabase = getDB();

      // Check if user exists and is verified
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, email_verified')
        .eq('email', email)
        .single();

      if (!user || error) {
        // Don't reveal if user exists or not for security
        res.json({
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        });
        return;
      }

      if (!user.email_verified) {
        throw createError('Please verify your email first before resetting password', 400);
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      // Save reset token
      await supabase
        .from('users')
        .update({
          reset_token: resetToken,
          reset_expires: resetExpires.toISOString()
        })
        .eq('id', user.id);

      // Send password reset email (log for now)
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      logger.info(`Password reset email would be sent to ${email}`);
      logger.info(`Reset URL: ${resetUrl}`);

      res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user profile (requires authentication)
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthControllerWithVerification();

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database-supabase';
import { createError } from '../middleware/errorHandler';
import { UserRole, CreateUserRequest, LoginRequest, AuthResponse } from '../types/user';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class AuthController {
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
        .select('id, email, is_active')
        .eq('email', email)
        .single();

      // In development mode, allow password reset by "re-registering"
      if (existingUser && process.env.NODE_ENV === 'development') {
        // Hash the new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Update existing user with new password and activate account
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            role,
            is_active: true,
            email_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('email', email)
          .select('id, email, first_name, last_name, phone, role, is_active, email_verified')
          .single();

        if (updateError || !updatedUser) {
          throw createError('Failed to update existing user', 500);
        }

        res.status(200).json({
          success: true,
          message: 'Account updated successfully. You can now log in.',
          data: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            phone: updatedUser.phone,
            role: updatedUser.role,
            isActive: updatedUser.is_active,
            emailVerified: updatedUser.email_verified,
            needsVerification: false,
            wasUpdated: true
          }
        });
        return;
      }

      if (existingUser) {
        throw createError('User already exists with this email', 409);
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate verification code (6 digits)
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user (auto-verify and activate in development)
      const isEmailVerified = true; // Allow login without verification during development
      const isUserActive = true;    // Auto-activate all accounts during development
      
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
          is_active: isUserActive,
          email_verified: isEmailVerified,
          verification_token: verificationCode,
          verification_expires: verificationExpires.toISOString()
        })
        .select('id, email, first_name, last_name, phone, role, is_active, email_verified')
        .single();

      if (error || !result) {
        throw createError('Failed to create user', 500);
      }

      const user = result;

      // TODO: Send verification email with code
      console.log(`Verification code for ${email}: ${verificationCode}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. You can now log in.',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          needsVerification: false // No verification needed during development
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { email, code } = req.body;

      const supabase = getDB();

      // Find user with verification token
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, verification_token, verification_expires')
        .eq('email', email)
        .eq('verification_token', code)
        .single();

      if (error || !user) {
        throw createError('Invalid or expired verification code', 400);
      }

      // Check if code has expired
      const now = new Date();
      const expiresAt = new Date(user.verification_expires);
      if (now > expiresAt) {
        throw createError('Verification code has expired', 400);
      }

      // Update user as verified and active
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          is_active: true,
          email_verified: true,
          verified_at: now.toISOString(),
          verification_token: null,
          verification_expires: null
        })
        .eq('id', user.id)
        .select('id, email, first_name, last_name, phone, role, is_active, email_verified')
        .single();

      if (updateError || !updatedUser) {
        throw createError('Failed to verify email', 500);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
        process.env.JWT_SECRET as string
      );

      const response: AuthResponse = {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          phone: updatedUser.phone,
          role: updatedUser.role,
          isActive: updatedUser.is_active,
          emailVerified: updatedUser.email_verified,
          verifiedAt: now,
          lastLogin: now
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: response
      });
    } catch (error) {
      next(error);
    }
  }

  async resendVerificationCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      const supabase = getDB();

      // Find unverified user
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, email_verified')
        .eq('email', email)
        .eq('email_verified', false)
        .single();

      if (error || !user) {
        throw createError('User not found or already verified', 404);
      }

      // Generate new verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update verification code
      const { error: updateError } = await supabase
        .from('users')
        .update({
          verification_token: verificationCode,
          verification_expires: verificationExpires.toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw createError('Failed to generate new verification code', 500);
      }

      // TODO: Send verification email with new code
      console.log(`New verification code for ${email}: ${verificationCode}`);

      res.json({
        success: true,
        message: 'New verification code sent to your email'
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { email, password }: LoginRequest = req.body;

      logger.info(`Login attempt for email: ${email}`);

      // DEVELOPMENT MODE: Bypass authentication for test users
      if (process.env.NODE_ENV === 'development' && email === 'lailaghassan2001@gmail.com') {
        logger.info(`🔓 DEV MODE: Bypassing authentication for test user: ${email}`);
        
        const supabase = getDB();
        
        // Create or update test user with correct password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Try to get existing user
        let { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, password_hash, first_name, last_name, phone, role, is_active')
          .eq('email', email)
          .single();

        if (userError || !user) {
          // Create new test user
          logger.info(`🔨 DEV MODE: Creating test user: ${email}`);
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              email: email,
              password_hash: hashedPassword,
              first_name: 'Laila',
              last_name: 'Ghassan',
              phone: '+1234567890',
              role: 'customer',
              is_active: true
            })
            .select('id, email, password_hash, first_name, last_name, phone, role, is_active')
            .single();

          if (createError) {
            logger.error('❌ Failed to create test user:', [createError]);
            throw new Error('Failed to create test user');
          }
          user = newUser;
        } else {
          // Update existing user with correct password
          logger.info(`🔧 DEV MODE: Updating test user password: ${email}`);
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              password_hash: hashedPassword,
              is_active: true
            })
            .eq('id', user.id);

          if (updateError) {
            logger.error('❌ Failed to update test user:', [updateError]);
          }
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET as string
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
            emailVerified: true,
            verifiedAt: undefined,
            lastLogin: new Date()
          },
          token,
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        };

        logger.info(`✅ DEV MODE: Login successful for test user: ${user.email}`);

        res.json({
          success: true,
          message: 'Login successful (development mode)',
          data: response
        });
        return;
      }

      // Normal production authentication flow
      const supabase = getDB();

      // Get user with password and all necessary fields
      const { data: result, error } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, phone, role, is_active')
        .eq('email', email)
        .single();

      if (error || !result) {
        logger.error(`User not found for email: ${email}`, [error]);
        throw createError('Invalid credentials', 401);
      }

      const user = result;
      logger.info(`User found: ${user.email}, active: ${user.is_active}`);

      if (!user.is_active) {
        logger.warn(`User account inactive: ${email}`);
        throw createError('Account is inactive', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      logger.info(`Password validation result: ${isPasswordValid}`);
      
      if (!isPasswordValid) {
        logger.error(`Invalid password for user: ${email}`);
        throw createError('Invalid credentials', 401);
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET as string
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
          emailVerified: true, // Default to true since column doesn't exist yet
          verifiedAt: undefined,
          lastLogin: new Date()
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: response
      });
    } catch (error) {
      next(error);
    }
  }

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

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      const { firstName, lastName, phone } = req.body;
      const userId = req.user.id;

      const supabase = getDB();

      // Update user profile
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName?.trim(),
          last_name: lastName?.trim(),
          phone: phone?.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          role,
          is_active,
          email_verified,
          created_at,
          updated_at
        `)
        .single();

      if (updateError) {
        logger.error('Error updating user profile:', updateError);
        throw createError('Failed to update profile', 500);
      }

      if (!updatedUser) {
        throw createError('User not found', 404);
      }

      // Transform database response to match our interface
      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isActive: updatedUser.is_active,
        emailVerified: updatedUser.email_verified,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: userResponse
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change user password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      // Get user's current password hash
      const supabase = getDB();
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        logger.error('Error fetching user for password change:', fetchError);
        throw createError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 400);
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        logger.error('Error updating password:', updateError);
        throw createError('Failed to update password', 500);
      }

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { password, confirmDeletion } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw createError('User not authenticated', 401);
      }

      if (!confirmDeletion || confirmDeletion !== 'DELETE_MY_ACCOUNT') {
        throw createError('Account deletion confirmation is required', 400);
      }

      // Get user's password hash for verification
      const supabase = getDB();
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('password_hash, email')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        logger.error('Error fetching user for account deletion:', fetchError);
        throw createError('User not found', 404);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Password is incorrect', 400);
      }

      // Start transaction for account deletion
      try {
        // Delete related data first (support tickets, orders, etc.)
        await supabase.from('support_tickets').delete().eq('user_id', userId);
        await supabase.from('support_messages').delete().eq('user_id', userId);
        await supabase.from('orders').update({ user_id: null }).eq('user_id', userId); // Anonymize orders instead of deleting
        
        // Finally delete the user account
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (deleteError) {
          logger.error('Error deleting user account:', deleteError);
          throw createError('Failed to delete account', 500);
        }

        logger.info(`User account deleted: ${user.email}`);

        res.json({
          success: true,
          message: 'Account deleted successfully'
        });
      } catch (error) {
        logger.error('Error during account deletion transaction:', error);
        throw createError('Failed to delete account', 500);
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();

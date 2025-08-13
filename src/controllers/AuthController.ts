import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database-mock';
import { createError } from '../middleware/errorHandler';
import { UserRole, CreateUserRequest, LoginRequest, AuthResponse } from '../types/user';
import { AuthRequest } from '../middleware/auth';

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

      const db = getDB();

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw createError('User already exists with this email', 409);
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      const result = await db.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING id, email, first_name, last_name, phone, role, is_active`,
        [userId, email, hashedPassword, firstName, lastName, phone, role, true]
      );

      const user = result.rows[0];

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
          isActive: user.is_active
        },
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: response
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

      const db = getDB();

      // Get user with password
      const result = await db.query(
        'SELECT id, email, password_hash, first_name, last_name, phone, role, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw createError('Invalid credentials', 401);
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw createError('Account is inactive', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
      }

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
          isActive: user.is_active
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
}

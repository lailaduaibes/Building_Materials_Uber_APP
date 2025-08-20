import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getDB } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';

export class UserController {
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const db = getDB();
      let query = 'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users';
      const params: any[] = [];
      
      if (role) {
        query += ' WHERE role = $1';
        params.push(role);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), offset);
      
      const result = await db.query(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM users';
      const countParams: any[] = [];
      if (role) {
        countQuery += ' WHERE role = $1';
        countParams.push(role);
      }
      
      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);
      
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: result.rows.map((user: any) => ({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const db = getDB();
      
      // Users can only access their own profile unless they're admin
      if (req.user?.role !== UserRole.ADMIN && req.user?.id !== id) {
        throw createError('Access denied', 403);
      }
      
      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = result.rows[0];
      
      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const { firstName, lastName, phone, isActive } = req.body;
      const db = getDB();
      
      // Users can only update their own profile unless they're admin
      if (req.user?.role !== UserRole.ADMIN && req.user?.id !== id) {
        throw createError('Access denied', 403);
      }
      
      // Check if user exists
      const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [id]);
      if (userCheck.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;
      
      if (firstName !== undefined) {
        updates.push(`first_name = $${paramCount}`);
        params.push(firstName);
        paramCount++;
      }
      
      if (lastName !== undefined) {
        updates.push(`last_name = $${paramCount}`);
        params.push(lastName);
        paramCount++;
      }
      
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount}`);
        params.push(phone);
        paramCount++;
      }
      
      // Only admin can change isActive status
      if (isActive !== undefined && req.user?.role === UserRole.ADMIN) {
        updates.push(`is_active = $${paramCount}`);
        params.push(isActive);
        paramCount++;
      }
      
      if (updates.length === 0) {
        throw createError('No valid fields to update', 400);
      }
      
      updates.push(`updated_at = NOW()`);
      params.push(id);
      
      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, first_name, last_name, phone, role, is_active`,
        params
      );
      
      const user = result.rows[0];
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

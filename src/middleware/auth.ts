import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/database-mock';
import { createError } from './errorHandler';
import { UserRole } from '../types/user';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw createError('No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user from database
    const db = getDB();
    const result = await db.query(
      'SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw createError('User not found', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw createError('Account is inactive', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(createError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403));
      return;
    }

    next();
  };
};

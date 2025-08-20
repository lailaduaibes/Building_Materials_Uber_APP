import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { DriverStatus, CreateDriverRequest } from '../types/driver';
import { UserRole } from '../types/user';

export class DriverController {
  async createDriver(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const {
        userId,
        driverLicense,
        workingHoursStart,
        workingHoursEnd,
        specialSkills,
        emergencyContact,
        hireDate
      }: CreateDriverRequest = req.body;

      const db = getDB();
      
      // Check if user exists and is not already a driver
      const userCheck = await db.query(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );
      
      if (userCheck.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      if (userCheck.rows[0].role !== UserRole.DRIVER) {
        throw createError('User must have driver role', 400);
      }
      
      // Check if driver already exists for this user
      const existingDriver = await db.query(
        'SELECT id FROM drivers WHERE user_id = $1',
        [userId]
      );
      
      if (existingDriver.rows.length > 0) {
        throw createError('Driver profile already exists for this user', 409);
      }
      
      const driverId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO drivers (
          id, user_id, driver_license, status, working_hours_start, working_hours_end,
          rating, total_deliveries, is_available_for_assignment, special_skills,
          emergency_contact, hire_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          driverId,
          userId,
          JSON.stringify(driverLicense),
          DriverStatus.AVAILABLE,
          workingHoursStart || null,
          workingHoursEnd || null,
          5.0, // Default rating
          0, // Default total deliveries
          true, // Default available for assignment
          specialSkills ? JSON.stringify(specialSkills) : null,
          JSON.stringify(emergencyContact),
          hireDate
        ]
      );
      
      const driver = result.rows[0];
      
      res.status(201).json({
        success: true,
        message: 'Driver created successfully',
        data: {
          id: driver.id,
          userId: driver.user_id,
          driverLicense: JSON.parse(driver.driver_license),
          status: driver.status,
          workingHoursStart: driver.working_hours_start,
          workingHoursEnd: driver.working_hours_end,
          rating: driver.rating,
          totalDeliveries: driver.total_deliveries,
          isAvailableForAssignment: driver.is_available_for_assignment,
          specialSkills: driver.special_skills ? JSON.parse(driver.special_skills) : null,
          emergencyContact: JSON.parse(driver.emergency_contact),
          hireDate: driver.hire_date,
          createdAt: driver.created_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async getDrivers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, available, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const db = getDB();
      let query = `
        SELECT d.*, 
               u.first_name, u.last_name, u.email, u.phone,
               v.license_plate, v.type as vehicle_type,
               o.id as current_order_id
        FROM drivers d
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
        LEFT JOIN orders o ON d.current_order_id = o.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (status) {
        conditions.push(`d.status = $${params.length + 1}`);
        params.push(status);
      }
      
      if (available !== undefined) {
        conditions.push(`d.is_available_for_assignment = $${params.length + 1}`);
        params.push(available === 'true');
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), offset);
      
      const result = await db.query(query, params);
      
      res.json({
        success: true,
        message: 'Drivers retrieved successfully',
        data: {
          drivers: result.rows.map((driver: any) => ({
            id: driver.id,
            user: {
              firstName: driver.first_name,
              lastName: driver.last_name,
              email: driver.email,
              phone: driver.phone
            },
            status: driver.status,
            rating: driver.rating,
            totalDeliveries: driver.total_deliveries,
            isAvailableForAssignment: driver.is_available_for_assignment,
            currentVehicle: driver.license_plate ? {
              licensePlate: driver.license_plate,
              type: driver.vehicle_type
            } : null,
            hasCurrentOrder: !!driver.current_order_id,
            location: driver.location ? JSON.parse(driver.location) : null,
            workingHours: {
              start: driver.working_hours_start,
              end: driver.working_hours_end
            },
            specialSkills: driver.special_skills ? JSON.parse(driver.special_skills) : null,
            hireDate: driver.hire_date
          }))
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async getDriverById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const db = getDB();
      
      const result = await db.query(
        `SELECT d.*, 
               u.first_name, u.last_name, u.email, u.phone,
               v.license_plate, v.type as vehicle_type, v.brand, v.model,
               o.id as current_order_id, o.status as order_status
        FROM drivers d
        LEFT JOIN users u ON d.user_id = u.id
        LEFT JOIN vehicles v ON d.current_vehicle_id = v.id
        LEFT JOIN orders o ON d.current_order_id = o.id
        WHERE d.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        throw createError('Driver not found', 404);
      }
      
      const driver = result.rows[0];
      
      res.json({
        success: true,
        message: 'Driver retrieved successfully',
        data: {
          id: driver.id,
          userId: driver.user_id,
          user: {
            firstName: driver.first_name,
            lastName: driver.last_name,
            email: driver.email,
            phone: driver.phone
          },
          driverLicense: JSON.parse(driver.driver_license),
          status: driver.status,
          rating: driver.rating,
          totalDeliveries: driver.total_deliveries,
          isAvailableForAssignment: driver.is_available_for_assignment,
          currentVehicle: driver.license_plate ? {
            licensePlate: driver.license_plate,
            type: driver.vehicle_type,
            brand: driver.brand,
            model: driver.model
          } : null,
          currentOrder: driver.current_order_id ? {
            id: driver.current_order_id,
            status: driver.order_status
          } : null,
          location: driver.location ? JSON.parse(driver.location) : null,
          workingHours: {
            start: driver.working_hours_start,
            end: driver.working_hours_end
          },
          specialSkills: driver.special_skills ? JSON.parse(driver.special_skills) : null,
          emergencyContact: JSON.parse(driver.emergency_contact),
          hireDate: driver.hire_date,
          createdAt: driver.created_at,
          updatedAt: driver.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async updateDriver(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const {
        status,
        currentVehicleId,
        currentOrderId,
        location,
        workingHoursStart,
        workingHoursEnd,
        isAvailableForAssignment,
        specialSkills,
        emergencyContact
      } = req.body;
      
      const db = getDB();
      
      // Check if driver exists
      const driverCheck = await db.query('SELECT user_id FROM drivers WHERE id = $1', [id]);
      if (driverCheck.rows.length === 0) {
        throw createError('Driver not found', 404);
      }
      
      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;
      
      if (status !== undefined) {
        updates.push(`status = $${paramCount}`);
        params.push(status);
        paramCount++;
      }
      
      if (currentVehicleId !== undefined) {
        updates.push(`current_vehicle_id = $${paramCount}`);
        params.push(currentVehicleId);
        paramCount++;
      }
      
      if (currentOrderId !== undefined) {
        updates.push(`current_order_id = $${paramCount}`);
        params.push(currentOrderId);
        paramCount++;
      }
      
      if (location !== undefined) {
        updates.push(`location = $${paramCount}`);
        params.push(JSON.stringify({
          ...location,
          lastUpdated: new Date()
        }));
        paramCount++;
      }
      
      if (workingHoursStart !== undefined) {
        updates.push(`working_hours_start = $${paramCount}`);
        params.push(workingHoursStart);
        paramCount++;
      }
      
      if (workingHoursEnd !== undefined) {
        updates.push(`working_hours_end = $${paramCount}`);
        params.push(workingHoursEnd);
        paramCount++;
      }
      
      if (isAvailableForAssignment !== undefined) {
        updates.push(`is_available_for_assignment = $${paramCount}`);
        params.push(isAvailableForAssignment);
        paramCount++;
      }
      
      if (specialSkills !== undefined) {
        updates.push(`special_skills = $${paramCount}`);
        params.push(JSON.stringify(specialSkills));
        paramCount++;
      }
      
      if (emergencyContact !== undefined) {
        updates.push(`emergency_contact = $${paramCount}`);
        params.push(JSON.stringify(emergencyContact));
        paramCount++;
      }
      
      if (updates.length === 0) {
        throw createError('No valid fields to update', 400);
      }
      
      updates.push(`updated_at = NOW()`);
      params.push(id);
      
      const result = await db.query(
        `UPDATE drivers SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );
      
      const driver = result.rows[0];
      
      res.json({
        success: true,
        message: 'Driver updated successfully',
        data: {
          id: driver.id,
          status: driver.status,
          currentVehicleId: driver.current_vehicle_id,
          currentOrderId: driver.current_order_id,
          location: driver.location ? JSON.parse(driver.location) : null,
          workingHours: {
            start: driver.working_hours_start,
            end: driver.working_hours_end
          },
          isAvailableForAssignment: driver.is_available_for_assignment,
          specialSkills: driver.special_skills ? JSON.parse(driver.special_skills) : null,
          emergencyContact: JSON.parse(driver.emergency_contact),
          updatedAt: driver.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
}

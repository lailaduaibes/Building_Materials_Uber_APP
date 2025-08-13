import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { VehicleStatus, CreateVehicleRequest } from '../types/vehicle';

export class VehicleController {
  async createVehicle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const {
        licensePlate,
        type,
        brand,
        model,
        year,
        maxWeight,
        maxVolume,
        equipment,
        fuelType,
        insuranceExpiry,
        registrationExpiry,
        lastMaintenanceDate,
        nextMaintenanceDate
      }: CreateVehicleRequest = req.body;

      const db = getDB();
      
      // Check if license plate already exists
      const existingVehicle = await db.query(
        'SELECT id FROM vehicles WHERE license_plate = $1',
        [licensePlate]
      );
      
      if (existingVehicle.rows.length > 0) {
        throw createError('Vehicle with this license plate already exists', 409);
      }
      
      const vehicleId = uuidv4();
      
      const result = await db.query(
        `INSERT INTO vehicles (
          id, license_plate, type, brand, model, year, max_weight, max_volume,
          status, equipment, fuel_type, insurance_expiry, registration_expiry,
          last_maintenance_date, next_maintenance_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *`,
        [
          vehicleId,
          licensePlate,
          type,
          brand,
          model,
          year,
          maxWeight,
          maxVolume,
          VehicleStatus.AVAILABLE,
          JSON.stringify(equipment),
          fuelType,
          insuranceExpiry,
          registrationExpiry,
          lastMaintenanceDate || null,
          nextMaintenanceDate || null
        ]
      );
      
      const vehicle = result.rows[0];
      
      res.status(201).json({
        success: true,
        message: 'Vehicle created successfully',
        data: {
          id: vehicle.id,
          licensePlate: vehicle.license_plate,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          maxWeight: vehicle.max_weight,
          maxVolume: vehicle.max_volume,
          status: vehicle.status,
          equipment: JSON.parse(vehicle.equipment),
          fuelType: vehicle.fuel_type,
          insuranceExpiry: vehicle.insurance_expiry,
          registrationExpiry: vehicle.registration_expiry,
          lastMaintenanceDate: vehicle.last_maintenance_date,
          nextMaintenanceDate: vehicle.next_maintenance_date,
          createdAt: vehicle.created_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async getVehicles(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, type, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const db = getDB();
      let query = `
        SELECT v.*, 
               u.first_name as driver_first_name, u.last_name as driver_last_name
        FROM vehicles v
        LEFT JOIN users u ON v.current_driver_id = u.id
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (status) {
        conditions.push(`v.status = $${params.length + 1}`);
        params.push(status);
      }
      
      if (type) {
        conditions.push(`v.type = $${params.length + 1}`);
        params.push(type);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), offset);
      
      const result = await db.query(query, params);
      
      res.json({
        success: true,
        message: 'Vehicles retrieved successfully',
        data: {
          vehicles: result.rows.map(vehicle => ({
            id: vehicle.id,
            licensePlate: vehicle.license_plate,
            type: vehicle.type,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            maxWeight: vehicle.max_weight,
            maxVolume: vehicle.max_volume,
            status: vehicle.status,
            equipment: JSON.parse(vehicle.equipment),
            currentDriver: vehicle.driver_first_name ? {
              firstName: vehicle.driver_first_name,
              lastName: vehicle.driver_last_name
            } : null,
            location: vehicle.location ? JSON.parse(vehicle.location) : null,
            insuranceExpiry: vehicle.insurance_expiry,
            registrationExpiry: vehicle.registration_expiry,
            nextMaintenanceDate: vehicle.next_maintenance_date,
            createdAt: vehicle.created_at
          }))
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async getVehicleById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const db = getDB();
      
      const result = await db.query(
        `SELECT v.*, 
               u.first_name as driver_first_name, u.last_name as driver_last_name,
               u.phone as driver_phone
        FROM vehicles v
        LEFT JOIN users u ON v.current_driver_id = u.id
        WHERE v.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        throw createError('Vehicle not found', 404);
      }
      
      const vehicle = result.rows[0];
      
      res.json({
        success: true,
        message: 'Vehicle retrieved successfully',
        data: {
          id: vehicle.id,
          licensePlate: vehicle.license_plate,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          maxWeight: vehicle.max_weight,
          maxVolume: vehicle.max_volume,
          status: vehicle.status,
          equipment: JSON.parse(vehicle.equipment),
          currentDriver: vehicle.driver_first_name ? {
            firstName: vehicle.driver_first_name,
            lastName: vehicle.driver_last_name,
            phone: vehicle.driver_phone
          } : null,
          location: vehicle.location ? JSON.parse(vehicle.location) : null,
          fuelType: vehicle.fuel_type,
          insuranceExpiry: vehicle.insurance_expiry,
          registrationExpiry: vehicle.registration_expiry,
          lastMaintenanceDate: vehicle.last_maintenance_date,
          nextMaintenanceDate: vehicle.next_maintenance_date,
          createdAt: vehicle.created_at,
          updatedAt: vehicle.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async updateVehicle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const { status, currentDriverId, equipment, location, lastMaintenanceDate, nextMaintenanceDate } = req.body;
      
      const db = getDB();
      
      // Check if vehicle exists
      const vehicleCheck = await db.query('SELECT id FROM vehicles WHERE id = $1', [id]);
      if (vehicleCheck.rows.length === 0) {
        throw createError('Vehicle not found', 404);
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
      
      if (currentDriverId !== undefined) {
        updates.push(`current_driver_id = $${paramCount}`);
        params.push(currentDriverId);
        paramCount++;
      }
      
      if (equipment !== undefined) {
        updates.push(`equipment = $${paramCount}`);
        params.push(JSON.stringify(equipment));
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
      
      if (lastMaintenanceDate !== undefined) {
        updates.push(`last_maintenance_date = $${paramCount}`);
        params.push(lastMaintenanceDate);
        paramCount++;
      }
      
      if (nextMaintenanceDate !== undefined) {
        updates.push(`next_maintenance_date = $${paramCount}`);
        params.push(nextMaintenanceDate);
        paramCount++;
      }
      
      if (updates.length === 0) {
        throw createError('No valid fields to update', 400);
      }
      
      updates.push(`updated_at = NOW()`);
      params.push(id);
      
      const result = await db.query(
        `UPDATE vehicles SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );
      
      const vehicle = result.rows[0];
      
      res.json({
        success: true,
        message: 'Vehicle updated successfully',
        data: {
          id: vehicle.id,
          status: vehicle.status,
          currentDriverId: vehicle.current_driver_id,
          equipment: JSON.parse(vehicle.equipment),
          location: vehicle.location ? JSON.parse(vehicle.location) : null,
          lastMaintenanceDate: vehicle.last_maintenance_date,
          nextMaintenanceDate: vehicle.next_maintenance_date,
          updatedAt: vehicle.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
}

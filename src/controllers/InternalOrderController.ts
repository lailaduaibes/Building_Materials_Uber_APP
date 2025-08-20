import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { OrderType, OrderStatus } from '../types/order';

export class InternalOrderController {
  async createInternalOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const {
        salesOrderId,
        customerId,
        items,
        pickupAddress,
        deliveryAddress,
        scheduledPickupTime,
        scheduledDeliveryTime,
        specialRequirements,
        notes
      } = req.body;

      const db = getDB();
      
      // Check if sales order already exists
      const existingOrder = await db.query(
        'SELECT id FROM orders WHERE sales_order_id = $1',
        [salesOrderId]
      );
      
      if (existingOrder.rows.length > 0) {
        throw createError('Internal order already exists for this sales order', 409);
      }
      
      // Calculate totals
      const totalWeight = items.reduce((sum: number, item: any) => sum + item.weight, 0);
      const totalVolume = items.reduce((sum: number, item: any) => sum + (item.volume || 0), 0);
      
      const orderId = uuidv4();
      
      // Start transaction
      await db.query('BEGIN');
      
      try {
        // Insert order
        const orderResult = await db.query(
          `INSERT INTO orders (
            id, order_type, customer_id, status, total_weight, total_volume,
            pickup_address, delivery_address, scheduled_pickup_time, 
            scheduled_delivery_time, special_requirements, notes, sales_order_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING *`,
          [
            orderId,
            OrderType.INTERNAL,
            customerId || null, // Internal orders might not have a registered customer
            OrderStatus.PENDING,
            totalWeight,
            totalVolume,
            JSON.stringify(pickupAddress),
            JSON.stringify(deliveryAddress),
            scheduledPickupTime || null,
            scheduledDeliveryTime || null,
            specialRequirements ? JSON.stringify(specialRequirements) : null,
            notes || null,
            salesOrderId
          ]
        );
        
        // Insert order items
        for (const item of items) {
          const itemId = uuidv4();
          await db.query(
            `INSERT INTO order_items (
              id, order_id, material_type, description, quantity, unit, weight, volume, special_handling
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              itemId,
              orderId,
              item.materialType,
              item.description,
              item.quantity,
              item.unit,
              item.weight,
              item.volume || null,
              item.specialHandling || null
            ]
          );
        }
        
        await db.query('COMMIT');
        
        const order = orderResult.rows[0];
        
        res.status(201).json({
          success: true,
          message: 'Internal order created successfully',
          data: {
            id: order.id,
            orderType: order.order_type,
            status: order.status,
            salesOrderId: order.sales_order_id,
            totalWeight: order.total_weight,
            totalVolume: order.total_volume,
            pickupAddress: JSON.parse(order.pickup_address),
            deliveryAddress: JSON.parse(order.delivery_address),
            scheduledPickupTime: order.scheduled_pickup_time,
            scheduledDeliveryTime: order.scheduled_delivery_time,
            specialRequirements: order.special_requirements ? JSON.parse(order.special_requirements) : null,
            notes: order.notes,
            createdAt: order.created_at
          }
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      next(error);
    }
  }

  async getInternalOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const db = getDB();
      let query = `
        SELECT o.*, 
               u.first_name, u.last_name, u.email,
               d.first_name as driver_first_name, d.last_name as driver_last_name,
               v.license_plate, v.type as vehicle_type
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN users d ON o.driver_id = d.id
        LEFT JOIN vehicles v ON o.vehicle_id = v.id
        WHERE o.order_type = $1
      `;
      
      const params: any[] = [OrderType.INTERNAL];
      
      if (status) {
        query += ` AND o.status = $${params.length + 1}`;
        params.push(status);
      }
      
      query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), offset);
      
      const result = await db.query(query, params);
      
      res.json({
        success: true,
        message: 'Internal orders retrieved successfully',
        data: {
          orders: result.rows.map((order: any) => ({
            id: order.id,
            orderType: order.order_type,
            status: order.status,
            salesOrderId: order.sales_order_id,
            totalWeight: order.total_weight,
            totalVolume: order.total_volume,
            pickupAddress: JSON.parse(order.pickup_address),
            deliveryAddress: JSON.parse(order.delivery_address),
            scheduledPickupTime: order.scheduled_pickup_time,
            scheduledDeliveryTime: order.scheduled_delivery_time,
            actualPickupTime: order.actual_pickup_time,
            actualDeliveryTime: order.actual_delivery_time,
            customer: order.first_name ? {
              firstName: order.first_name,
              lastName: order.last_name,
              email: order.email
            } : null,
            driver: order.driver_first_name ? {
              firstName: order.driver_first_name,
              lastName: order.driver_last_name
            } : null,
            vehicle: order.license_plate ? {
              licensePlate: order.license_plate,
              type: order.vehicle_type
            } : null,
            createdAt: order.created_at
          }))
        }
      });
      
    } catch (error) {
      next(error);
    }
  }

  async getInternalOrderById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const db = getDB();
      
      const orderResult = await db.query(
        `SELECT o.*, 
               u.first_name, u.last_name, u.email,
               d.first_name as driver_first_name, d.last_name as driver_last_name,
               v.license_plate, v.type as vehicle_type
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.id
        LEFT JOIN users d ON o.driver_id = d.id
        LEFT JOIN vehicles v ON o.vehicle_id = v.id
        WHERE o.id = $1 AND o.order_type = $2`,
        [id, OrderType.INTERNAL]
      );
      
      if (orderResult.rows.length === 0) {
        throw createError('Internal order not found', 404);
      }
      
      const order = orderResult.rows[0];
      
      // Get order items
      const itemsResult = await db.query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
        [id]
      );
      
      res.json({
        success: true,
        message: 'Internal order retrieved successfully',
        data: {
          id: order.id,
          orderType: order.order_type,
          status: order.status,
          salesOrderId: order.sales_order_id,
          totalWeight: order.total_weight,
          totalVolume: order.total_volume,
          pickupAddress: JSON.parse(order.pickup_address),
          deliveryAddress: JSON.parse(order.delivery_address),
          scheduledPickupTime: order.scheduled_pickup_time,
          scheduledDeliveryTime: order.scheduled_delivery_time,
          actualPickupTime: order.actual_pickup_time,
          actualDeliveryTime: order.actual_delivery_time,
          specialRequirements: order.special_requirements ? JSON.parse(order.special_requirements) : null,
          notes: order.notes,
          customer: order.first_name ? {
            firstName: order.first_name,
            lastName: order.last_name,
            email: order.email
          } : null,
          driver: order.driver_first_name ? {
            firstName: order.driver_first_name,
            lastName: order.driver_last_name
          } : null,
          vehicle: order.license_plate ? {
            licensePlate: order.license_plate,
            type: order.vehicle_type
          } : null,
          items: itemsResult.rows.map((item: any) => ({
            id: item.id,
            materialType: item.material_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            weight: item.weight,
            volume: item.volume,
            specialHandling: item.special_handling
          })),
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
}

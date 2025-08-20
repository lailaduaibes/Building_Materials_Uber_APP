import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types/user';
import { OrderType, OrderStatus, CreateOrderRequest } from '../types/order';

export class OrderController {
  async createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const {
        items,
        pickupAddress,
        deliveryAddress,
        scheduledPickupTime,
        scheduledDeliveryTime,
        specialRequirements,
        notes
      }: CreateOrderRequest = req.body;

      const db = getDB();
      
      // Calculate totals
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
      const totalVolume = items.reduce((sum, item) => sum + (item.volume || 0), 0);
      
      const orderId = uuidv4();
      
      // Using postgres library - transactions are handled differently
      try {
        // Insert order
        const orderResult = await db`
          INSERT INTO orders (
            id, order_type, customer_id, status, total_weight, total_volume,
            pickup_address, delivery_address, scheduled_pickup_time, 
            scheduled_delivery_time, special_requirements, notes, created_at, updated_at
          ) VALUES (
            ${orderId}, ${OrderType.EXTERNAL}, ${req.user!.id}, ${OrderStatus.PENDING}, 
            ${totalWeight}, ${totalVolume}, ${JSON.stringify(pickupAddress)}, 
            ${JSON.stringify(deliveryAddress)}, ${scheduledPickupTime || null}, 
            ${scheduledDeliveryTime || null}, ${specialRequirements ? JSON.stringify(specialRequirements) : null}, 
            ${notes || null}, NOW(), NOW()
          )
          RETURNING *
        `;
        
        // Insert order items
        for (const item of items) {
          const itemId = uuidv4();
          await db`
            INSERT INTO order_items (
              id, order_id, material_type, description, quantity, unit, weight, volume, special_handling
            ) VALUES (
              ${itemId}, ${orderId}, ${item.materialType}, ${item.description}, 
              ${item.quantity}, ${item.unit}, ${item.weight}, ${item.volume || null}, 
              ${item.specialHandling || null}
            )
          `;
        }
        
        const order = orderResult[0];
        
        res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: {
            id: order.id,
            orderType: order.order_type,
            status: order.status,
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
        // With postgres library, we don't need manual rollback
        throw error;
      }
      
    } catch (error) {
      next(error);
    }
  }

  async getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      // Filter by customer for non-admin users
      if (req.user!.role === UserRole.CUSTOMER) {
        conditions.push(`o.customer_id = $${params.length + 1}`);
        params.push(req.user!.id);
      }
      
      if (status) {
        conditions.push(`o.status = $${params.length + 1}`);
        params.push(status);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      const result = await db`
        SELECT o.*, u.first_name, u.last_name, u.email 
        FROM orders o 
        LEFT JOIN users u ON o.customer_id = u.id 
        ORDER BY o.created_at DESC 
        LIMIT ${Number(limit)} 
        OFFSET ${offset}
      `;
      
      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: {
          orders: result.map((order: any) => ({
            id: order.id,
            orderType: order.order_type,
            status: order.status,
            totalWeight: order.total_weight,
            totalVolume: order.total_volume,
            pickupAddress: JSON.parse(order.pickup_address),
            deliveryAddress: JSON.parse(order.delivery_address),
            scheduledPickupTime: order.scheduled_pickup_time,
            scheduledDeliveryTime: order.scheduled_delivery_time,
            actualPickupTime: order.actual_pickup_time,
            actualDeliveryTime: order.actual_delivery_time,
            customer: {
              firstName: order.first_name,
              lastName: order.last_name,
              email: order.email
            },
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

  async getOrderById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
        WHERE o.id = $1`,
        [id]
      );
      
      if (orderResult.rows.length === 0) {
        throw createError('Order not found', 404);
      }
      
      const order = orderResult.rows[0];
      
      // Check access permissions
      if (req.user!.role === UserRole.CUSTOMER && order.customer_id !== req.user!.id) {
        throw createError('Access denied', 403);
      }
      
      // Get order items
      const itemsResult = await db.query(
        'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at',
        [id]
      );
      
      res.json({
        success: true,
        message: 'Order retrieved successfully',
        data: {
          id: order.id,
          orderType: order.order_type,
          status: order.status,
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
          salesOrderId: order.sales_order_id,
          customer: {
            firstName: order.first_name,
            lastName: order.last_name,
            email: order.email
          },
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

  async updateOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const { id } = req.params;
      const { status, scheduledPickupTime, scheduledDeliveryTime, driverId, vehicleId, notes } = req.body;
      
      const db = getDB();
      
      // Check if order exists
      const orderCheck = await db.query('SELECT customer_id, status FROM orders WHERE id = $1', [id]);
      if (orderCheck.rows.length === 0) {
        throw createError('Order not found', 404);
      }
      
      const order = orderCheck.rows[0];
      
      // Check permissions
      if (req.user!.role === UserRole.CUSTOMER) {
        if (order.customer_id !== req.user!.id) {
          throw createError('Access denied', 403);
        }
        if (status && order.status !== OrderStatus.PENDING) {
          throw createError('Cannot modify order after it has been assigned', 400);
        }
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
      
      if (scheduledPickupTime !== undefined) {
        updates.push(`scheduled_pickup_time = $${paramCount}`);
        params.push(scheduledPickupTime);
        paramCount++;
      }
      
      if (scheduledDeliveryTime !== undefined) {
        updates.push(`scheduled_delivery_time = $${paramCount}`);
        params.push(scheduledDeliveryTime);
        paramCount++;
      }
      
      if (driverId !== undefined && req.user!.role !== UserRole.CUSTOMER) {
        updates.push(`driver_id = $${paramCount}`);
        params.push(driverId);
        paramCount++;
      }
      
      if (vehicleId !== undefined && req.user!.role !== UserRole.CUSTOMER) {
        updates.push(`vehicle_id = $${paramCount}`);
        params.push(vehicleId);
        paramCount++;
      }
      
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount}`);
        params.push(notes);
        paramCount++;
      }
      
      if (updates.length === 0) {
        throw createError('No valid fields to update', 400);
      }
      
      updates.push(`updated_at = NOW()`);
      params.push(id);
      
      const result = await db.query(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );
      
      const updatedOrder = result.rows[0];
      
      res.json({
        success: true,
        message: 'Order updated successfully',
        data: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          scheduledPickupTime: updatedOrder.scheduled_pickup_time,
          scheduledDeliveryTime: updatedOrder.scheduled_delivery_time,
          driverId: updatedOrder.driver_id,
          vehicleId: updatedOrder.vehicle_id,
          notes: updatedOrder.notes,
          updatedAt: updatedOrder.updated_at
        }
      });
      
    } catch (error) {
      next(error);
    }
  }
}

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getDB } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/location/health:
 *   get:
 *     summary: Location service health check
 *     tags: [Location]
 *     responses:
 *       200:
 *         description: Location service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Location service is healthy'
  });
});

/**
 * @swagger
 * /api/v1/location/track:
 *   post:
 *     summary: Update driver/vehicle location
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *               - orderId
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               orderId:
 *                 type: string
 *               heading:
 *                 type: number
 *                 format: float
 *               speed:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid input
 */
router.post('/track', authenticate, async (req, res): Promise<void> => {
  try {
    const { latitude, longitude, orderId, heading, speed, batteryLevel } = req.body;
    const db = getDB();

    if (!latitude || !longitude || !orderId) {
      res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and orderId are required'
      });
      return;
    }

    // Check if order exists and get driver info
    const orderResult = await db`
      SELECT o.id, o.assigned_driver_id, o.status
      FROM orders o
      WHERE o.id = ${orderId} 
      AND o.status IN ('assigned', 'picked_up', 'in_transit')
    `;

    if (orderResult.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Active order not found'
      });
      return;
    }

    const order = orderResult[0];
    const driverId = order.assigned_driver_id;

    if (!driverId) {
      res.status(400).json({
        success: false,
        message: 'No driver assigned to this order'
      });
      return;
    }

    // Create location object
    const locationData = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      accuracy: req.body.accuracy || 10,
      speed: speed ? parseFloat(speed) : 0,
      heading: heading ? parseFloat(heading) : 0
    };

    // Insert delivery tracking data
    await db`
      INSERT INTO delivery_tracking (
        order_id, 
        driver_id, 
        location, 
        timestamp, 
        battery_level, 
        is_online
      ) VALUES (
        ${orderId},
        ${driverId},
        ${JSON.stringify(locationData)},
        NOW(),
        ${batteryLevel || 100},
        true
      )
    `;

    logger.info(`Location updated for order ${orderId} by driver ${driverId}`);
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        orderId,
        location: {
          latitude,
          longitude,
          heading: heading || null,
          speed: speed || null,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/v1/location/order/{orderId}:
 *   get:
 *     summary: Get current location for an order
 *     tags: [Location]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to track
 *     responses:
 *       200:
 *         description: Current order location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         heading:
 *                           type: number
 *                         speed:
 *                           type: number
 *                         timestamp:
 *                           type: string
 *       404:
 *         description: Order not found or no location data
 *       401:
 *         description: Unauthorized
 */
router.get('/order/:orderId', authenticate, async (req, res): Promise<void> => {
  try {
    const { orderId } = req.params;
    const db = getDB();

    // Get the latest delivery tracking data for this order
    const trackingResult = await db`
      SELECT 
        dt.location,
        dt.timestamp,
        dt.battery_level,
        dt.is_online,
        d.first_name || ' ' || d.last_name as driver_name,
        d.phone as driver_phone,
        d.rating,
        v.type as vehicle_type,
        v.license_plate,
        o.status,
        o.estimated_delivery_time
      FROM delivery_tracking dt
      JOIN orders o ON dt.order_id = o.id
      JOIN drivers d ON dt.driver_id = d.id
      LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
      WHERE dt.order_id = ${orderId}
      ORDER BY dt.timestamp DESC
      LIMIT 1
    `;

    if (trackingResult.length === 0) {
      // If no tracking data found, check if order exists
      const orderResult = await db`
        SELECT 
          o.id,
          o.status,
          o.estimated_delivery_time,
          d.first_name || ' ' || d.last_name as driver_name,
          d.phone as driver_phone,
          d.rating,
          v.type as vehicle_type,
          v.license_plate
        FROM orders o
        LEFT JOIN drivers d ON o.assigned_driver_id = d.id
        LEFT JOIN vehicles v ON o.assigned_vehicle_id = v.id
        WHERE o.id = ${orderId}
      `;

      if (orderResult.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      // Return order info without location data
      const order = orderResult[0];
      res.json({
        success: true,
        data: {
          orderId,
          location: {
            latitude: 25.276987, // Default Dubai location
            longitude: 55.296249,
            heading: 0,
            speed: 0,
            timestamp: new Date().toISOString()
          },
          driver: {
            id: 'unknown',
            name: order.driver_name || 'Driver',
            phone: order.driver_phone || 'N/A',
            rating: order.rating || 4.5,
            vehicleType: order.vehicle_type || 'Delivery Vehicle',
            vehicleNumber: order.license_plate || 'N/A'
          },
          estimatedArrival: order.estimated_delivery_time || new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }
      });
      return;
    }

    const tracking = trackingResult[0];
    const location = tracking.location;

    res.json({
      success: true,
      data: {
        orderId,
        location: {
          latitude: location.lat,
          longitude: location.lng,
          heading: location.heading || 0,
          speed: location.speed || 0,
          timestamp: tracking.timestamp
        },
        driver: {
          name: tracking.driver_name,
          phone: tracking.driver_phone,
          rating: tracking.rating || 4.5,
          vehicleType: tracking.vehicle_type || 'Delivery Vehicle',
          vehicleNumber: tracking.license_plate || 'N/A'
        },
        estimatedArrival: tracking.estimated_delivery_time || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        batteryLevel: tracking.battery_level,
        isOnline: tracking.is_online
      }
    });

  } catch (error) {
    logger.error('Error fetching order location:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

import { Router } from 'express';
import { body, param } from 'express-validator';
import { DriverController } from '../controllers/DriverController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/user';

const router = Router();
const driverController = new DriverController();

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Add new driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - driverLicense
 *               - emergencyContact
 *             properties:
 *               userId:
 *                 type: string
 *               driverLicense:
 *                 type: object
 *               emergencyContact:
 *                 type: object
 *     responses:
 *       201:
 *         description: Driver created successfully
 */
router.post('/', authenticate, authorize(UserRole.ADMIN), driverController.createDriver);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by driver status
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *     responses:
 *       200:
 *         description: Drivers retrieved successfully
 */
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.DISPATCHER), driverController.getDrivers);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver retrieved successfully
 */
router.get('/:id', authenticate, [
  param('id').isUUID()
], driverController.getDriverById);

/**
 * @swagger
 * /drivers/{id}:
 *   put:
 *     summary: Update driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Driver updated successfully
 */
router.put('/:id', authenticate, [
  param('id').isUUID()
], driverController.updateDriver);

export default router;

import { Router } from 'express';
import { body, param } from 'express-validator';
import { VehicleController } from '../controllers/VehicleController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/user';

const router = Router();
const vehicleController = new VehicleController();

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Add new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licensePlate
 *               - type
 *               - brand
 *               - model
 *               - year
 *               - maxWeight
 *               - maxVolume
 *             properties:
 *               licensePlate:
 *                 type: string
 *               type:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: integer
 *               maxWeight:
 *                 type: number
 *               maxVolume:
 *                 type: number
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 */
router.post('/', authenticate, authorize(UserRole.ADMIN), vehicleController.createVehicle);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by vehicle status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by vehicle type
 *     responses:
 *       200:
 *         description: Vehicles retrieved successfully
 */
router.get('/', authenticate, vehicleController.getVehicles);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
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
 *         description: Vehicle retrieved successfully
 */
router.get('/:id', authenticate, [
  param('id').isUUID()
], vehicleController.getVehicleById);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update vehicle
 *     tags: [Vehicles]
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
 *         description: Vehicle updated successfully
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN), [
  param('id').isUUID()
], vehicleController.updateVehicle);

export default router;

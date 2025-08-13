import { Router } from 'express';
import { body, param } from 'express-validator';
import { InternalOrderController } from '../controllers/InternalOrderController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/user';

const router = Router();
const internalOrderController = new InternalOrderController();

/**
 * @swagger
 * /internal-orders:
 *   post:
 *     summary: Create internal order from sales app
 *     tags: [Internal Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - salesOrderId
 *               - items
 *               - pickupAddress
 *               - deliveryAddress
 *             properties:
 *               salesOrderId:
 *                 type: string
 *               items:
 *                 type: array
 *               pickupAddress:
 *                 type: object
 *               deliveryAddress:
 *                 type: object
 *     responses:
 *       201:
 *         description: Internal order created successfully
 */
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.DISPATCHER), internalOrderController.createInternalOrder);

/**
 * @swagger
 * /internal-orders:
 *   get:
 *     summary: Get internal orders
 *     tags: [Internal Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Internal orders retrieved successfully
 */
router.get('/', authenticate, authorize(UserRole.ADMIN, UserRole.DISPATCHER), internalOrderController.getInternalOrders);

/**
 * @swagger
 * /internal-orders/{id}:
 *   get:
 *     summary: Get internal order by ID
 *     tags: [Internal Orders]
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
 *         description: Internal order retrieved successfully
 */
router.get('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.DISPATCHER), [
  param('id').isUUID()
], internalOrderController.getInternalOrderById);

export default router;

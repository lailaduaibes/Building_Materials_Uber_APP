import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { OrderController } from '../controllers/OrderController';
import { authenticate, authorize } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import { UserRole } from '../types/user';

const router = Router();
const orderController = new OrderController();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new external delivery order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - pickupAddress
 *               - deliveryAddress
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     materialType:
 *                       type: string
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unit:
 *                       type: string
 *                     weight:
 *                       type: number
 *               pickupAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               deliveryAddress:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *               specialRequirements:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticate, [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array with at least one item'),
  body('items.*.materialType')
    .notEmpty()
    .withMessage('Material type is required'),
  body('items.*.description')
    .notEmpty()
    .withMessage('Item description is required'),
  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number'),
  body('items.*.unit')
    .notEmpty()
    .withMessage('Unit is required'),
  body('items.*.weight')
    .isNumeric()
    .withMessage('Weight must be a number'),
  body('pickupAddress.street')
    .notEmpty()
    .withMessage('Pickup street address is required'),
  body('pickupAddress.city')
    .notEmpty()
    .withMessage('Pickup city is required'),
  body('pickupAddress.state')
    .notEmpty()
    .withMessage('Pickup state is required'),
  body('pickupAddress.zipCode')
    .notEmpty()
    .withMessage('Pickup zip code is required'),
  body('deliveryAddress.street')
    .notEmpty()
    .withMessage('Delivery street address is required'),
  body('deliveryAddress.city')
    .notEmpty()
    .withMessage('Delivery city is required'),
  body('deliveryAddress.state')
    .notEmpty()
    .withMessage('Delivery state is required'),
  body('deliveryAddress.zipCode')
    .notEmpty()
    .withMessage('Delivery zip code is required'),
  body('specialRequirements')
    .optional()
    .isString()
    .withMessage('Special requirements must be a string')
], handleValidationErrors, orderController.createOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/', authenticate, orderController.getOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/:id', authenticate, [
  param('id').isUUID()
], orderController.getOrderById);

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       404:
 *         description: Order not found
 */
router.put('/:id', authenticate, [
  param('id').isUUID()
], orderController.updateOrder);

export default router;

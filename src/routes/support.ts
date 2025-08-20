import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { SupportController } from '../controllers/SupportController';

const router = Router();
const supportController = new SupportController();

/**
 * @swagger
 * components:
 *   schemas:
 *     SupportTicket:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         subject:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [general, technical, billing, delivery, complaint]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         status:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/support/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *               - category
 *             properties:
 *               subject:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               category:
 *                 type: string
 *                 enum: [general, technical, billing, delivery, complaint]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Support ticket created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/tickets', authenticate, [
  body('subject')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .isIn(['general', 'technical', 'billing', 'delivery', 'complaint'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority')
], supportController.createTicket);

/**
 * @swagger
 * /api/v1/support/tickets:
 *   get:
 *     summary: Get user's support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Support tickets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SupportTicket'
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets', authenticate, supportController.getUserTickets);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}:
 *   get:
 *     summary: Get specific ticket details with messages
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: ticketId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ticket details retrieved successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets/:ticketId', authenticate, supportController.getTicket);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/messages:
 *   post:
 *     summary: Add message to ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: ticketId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: Message added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.post('/tickets/:ticketId/messages', authenticate, [
  body('message')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters')
], supportController.addMessage);

/**
 * @swagger
 * /api/v1/support/tickets/{ticketId}/close:
 *   patch:
 *     summary: Close a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: ticketId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ticket closed successfully
 *       404:
 *         description: Ticket not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/tickets/:ticketId/close', authenticate, supportController.closeTicket);

export default router;

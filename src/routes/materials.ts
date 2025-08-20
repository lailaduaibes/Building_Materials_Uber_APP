import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MaterialType } from '../types/order';

const router = Router();

/**
 * @swagger
 * /materials:
 *   get:
 *     summary: Get available building materials
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Materials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                       unit:
 *                         type: string
 *                       pricePerUnit:
 *                         type: number
 *                       description:
 *                         type: string
 *                       inStock:
 *                         type: boolean
 */
router.get('/', authenticate, (req, res) => {
  // Available building materials with pricing
  const materials = [
    {
      id: '1',
      name: 'Portland Cement',
      category: 'Cement',
      materialType: MaterialType.CEMENT,
      unit: 'bag (50kg)',
      pricePerUnit: 8.50,
      description: 'High-quality Portland cement for construction',
      inStock: true,
      weight: 50, // kg per unit
    },
    {
      id: '2',
      name: 'Steel Reinforcement Bars',
      category: 'Steel',
      materialType: MaterialType.STEEL,
      unit: 'piece (12mm x 6m)',
      pricePerUnit: 15.75,
      description: 'Grade 60 steel rebar for reinforcement',
      inStock: true,
      weight: 8.5, // kg per piece
    },
    {
      id: '3',
      name: 'Concrete Blocks',
      category: 'Masonry',
      materialType: MaterialType.CONCRETE_BLOCKS,
      unit: 'piece (8x8x16)',
      pricePerUnit: 2.25,
      description: 'Standard concrete masonry units',
      inStock: true,
      weight: 18, // kg per block
    },
    {
      id: '4',
      name: 'River Sand',
      category: 'Aggregates',
      materialType: MaterialType.SAND,
      unit: 'cubic meter',
      pricePerUnit: 25.00,
      description: 'Clean river sand for construction',
      inStock: true,
      weight: 1600, // kg per cubic meter
    },
    {
      id: '5',
      name: 'Crushed Gravel',
      category: 'Aggregates',
      materialType: MaterialType.GRAVEL,
      unit: 'cubic meter',
      pricePerUnit: 30.00,
      description: '20mm crushed gravel aggregate',
      inStock: true,
      weight: 1700, // kg per cubic meter
    },
    {
      id: '6',
      name: 'Red Clay Bricks',
      category: 'Masonry',
      materialType: MaterialType.BRICKS,
      unit: 'piece',
      pricePerUnit: 0.45,
      description: 'Standard red clay building bricks',
      inStock: true,
      weight: 2.5, // kg per brick
    },
    {
      id: '7',
      name: 'Construction Lumber',
      category: 'Wood',
      materialType: MaterialType.LUMBER,
      unit: 'board foot',
      pricePerUnit: 3.50,
      description: 'Treated construction grade lumber',
      inStock: true,
      weight: 2.5, // kg per board foot
    },
    {
      id: '8',
      name: 'PVC Pipes',
      category: 'Plumbing',
      materialType: MaterialType.PIPES,
      unit: 'meter (4 inch)',
      pricePerUnit: 12.00,
      description: 'PVC pipes for plumbing and drainage',
      inStock: true,
      weight: 3.2, // kg per meter
    },
    {
      id: '9',
      name: 'Ceramic Floor Tiles',
      category: 'Finishing',
      materialType: MaterialType.TILES,
      unit: 'square meter',
      pricePerUnit: 18.75,
      description: 'Ceramic tiles for flooring',
      inStock: true,
      weight: 20, // kg per square meter
    },
    {
      id: '10',
      name: 'Mixed Mortar',
      category: 'Cement',
      materialType: MaterialType.OTHER,
      unit: 'bag (25kg)',
      pricePerUnit: 6.25,
      description: 'Ready-mixed mortar for masonry work',
      inStock: true,
      weight: 25, // kg per bag
    },
  ];

  res.json({
    success: true,
    message: 'Materials retrieved successfully',
    data: materials
  });
});

/**
 * @swagger
 * /materials/{id}:
 *   get:
 *     summary: Get material by ID
 *     tags: [Materials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material ID
 *     responses:
 *       200:
 *         description: Material retrieved successfully
 *       404:
 *         description: Material not found
 */
router.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  // This would typically fetch from database
  // For now, return a sample material
  const material = {
    id,
    name: 'Portland Cement',
    category: 'Cement',
    materialType: MaterialType.CEMENT,
    unit: 'bag (50kg)',
    pricePerUnit: 8.50,
    description: 'High-quality Portland cement for construction',
    inStock: true,
    weight: 50,
  };

  res.json({
    success: true,
    message: 'Material retrieved successfully',
    data: material
  });
});

export default router;

import { Request, Response, NextFunction } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  res.status(404).json({
    success: false,
    message,
    availableRoutes: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      orders: '/api/v1/orders',
      internalOrders: '/api/v1/internal-orders',
      vehicles: '/api/v1/vehicles',
      drivers: '/api/v1/drivers',
      documentation: '/api-docs',
      health: '/health'
    }
  });
};

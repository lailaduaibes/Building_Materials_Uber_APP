import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import orderRoutes from './routes/orders';
import internalOrderRoutes from './routes/internalOrders';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import { swaggerOptions } from './config/swagger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://10.0.2.2:3000', 'http://192.168.1.*'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Building Materials Delivery API is running',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
});

// API Routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/orders`, orderRoutes);
app.use(`/api/${apiVersion}/internal-orders`, internalOrderRoutes);
app.use(`/api/${apiVersion}/vehicles`, vehicleRoutes);
app.use(`/api/${apiVersion}/drivers`, driverRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;

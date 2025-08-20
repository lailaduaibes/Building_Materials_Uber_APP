import { Request, Response, NextFunction } from 'express';
import { redisUtils, isRedisConnected } from '../config/redis';
import { logger } from '../utils/logger';

// In-memory fallback for when Redis is not available
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Simple rate limiter using Redis with in-memory fallback
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.ip || req.connection.remoteAddress || 'unknown';
      const userId = (req as any).user?.id;
      const rateLimitKey = userId ? `${key}:${userId}` : key;
      const fullKey = `rate_limit:${rateLimitKey}`;
      
      let result;
      
      if (isRedisConnected()) {
        // Use Redis for rate limiting
        result = await redisUtils.checkRateLimit(
          fullKey,
          options.max || 100,
          Math.ceil((options.windowMs || 900000) / 1000)
        );
      } else {
        // Fallback to in-memory rate limiting
        const now = Date.now();
        const current = memoryStore.get(fullKey);
        const windowMs = options.windowMs || 900000;
        const max = options.max || 100;
        
        if (!current || current.resetTime <= now) {
          // Reset window
          memoryStore.set(fullKey, { count: 1, resetTime: now + windowMs });
          result = {
            allowed: true,
            remaining: max - 1,
            resetTime: now + windowMs
          };
        } else {
          // Increment count
          current.count++;
          memoryStore.set(fullKey, current);
          result = {
            allowed: current.count <= max,
            remaining: Math.max(0, max - current.count),
            resetTime: current.resetTime
          };
        }
      }
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': String(options.max || 100),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000))
      });
      
      if (!result.allowed) {
        const ip = req.ip || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        logger.warn(`Rate limit exceeded for IP: ${ip}, User-Agent: ${userAgent}`);
        
        res.status(429).json({
          success: false,
          message: options.message || 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil((options.windowMs || 900000) / 1000)
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue without rate limiting if both Redis and memory fail
      next();
    }
  };
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.'
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for general API
  message: 'API rate limit exceeded, please slow down your requests.'
});

export const strictRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes for sensitive operations
  message: 'Rate limit exceeded for sensitive operations.'
});

export const orderRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 order creations per minute
  message: 'Too many order requests, please wait before creating another order.'
});

// B2B tier-based rate limiting
export const createTieredRateLimit = (tier: 'basic' | 'premium' | 'enterprise') => {
  const limits = {
    basic: { windowMs: 15 * 60 * 1000, max: 100 },
    premium: { windowMs: 15 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 }
  };

  return createRateLimit({
    ...limits[tier],
    message: `Rate limit exceeded for ${tier} tier. Consider upgrading your plan for higher limits.`
  });
};

// IP-based blocking for security
export const createSecurityRateLimit = () => {
  return createRateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1000, // 1000 requests per day per IP
    message: 'Daily request limit exceeded. Contact support if you need higher limits.'
  });
};

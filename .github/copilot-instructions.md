# Building Materials Delivery API - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a comprehensive delivery management API for building materials that handles:
- **Internal deliveries**: Orders from existing sales app via API integration
- **External deliveries**: Direct delivery requests from customers
- **Fleet management**: Vehicle and driver assignment system

## Tech Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT-based with role-based permissions
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with supertest

## Architecture Guidelines

### Code Style & Patterns
- Use TypeScript strict mode with proper typing
- Follow RESTful API conventions
- Use async/await for database operations
- Implement proper error handling with custom error classes
- Use middleware for authentication, validation, and error handling

### Database Patterns
- Use PostgreSQL with proper transactions for multi-table operations
- Use UUID for all primary keys
- Store JSON data in JSONB columns for complex objects (addresses, equipment, etc.)
- Follow naming conventions: snake_case for database, camelCase for TypeScript

### Security Best Practices
- Always validate input with express-validator
- Use parameterized queries to prevent SQL injection  
- Implement rate limiting on API endpoints
- Use helmet for security headers
- Hash passwords with bcrypt (12+ rounds)
- Validate JWT tokens and check user permissions

### API Design
- Return consistent response format: `{ success: boolean, message: string, data?: any }`
- Use appropriate HTTP status codes
- Include pagination for list endpoints
- Document all endpoints with Swagger annotations

### Role-Based Access
- **Customer**: Can create external orders, view their own orders
- **Driver**: Can view assigned orders, update delivery status  
- **Dispatcher**: Can assign orders to drivers/vehicles, view all orders
- **Admin**: Full system access, user management, vehicle management

### Business Logic
- **Order Flow**: pending → assigned → picked_up → in_transit → delivered
- **Vehicle Selection**: Match orders with vehicles based on weight, volume, equipment needs
- **Driver Assignment**: Consider availability, location, working hours, special skills

### File Organization
- `/src/controllers/` - Request handlers and business logic
- `/src/routes/` - API endpoint definitions with validation
- `/src/middleware/` - Authentication, error handling, validation
- `/src/types/` - TypeScript type definitions
- `/src/config/` - Database, Redis, and other configurations
- `/src/utils/` - Utility functions and helpers
- `/database/` - SQL schema and migration files

## Development Guidelines

When generating code:
1. **Always include proper TypeScript types** for parameters and return values
2. **Use the existing error handling pattern** with `createError()` function
3. **Include input validation** with express-validator for all endpoints
4. **Follow the established database query patterns** with proper error handling
5. **Add Swagger documentation** for new endpoints
6. **Consider role-based access control** for all endpoints
7. **Use transactions** for operations that modify multiple tables
8. **Include proper logging** with the logger utility

## Common Patterns to Follow

### Controller Method Structure
```typescript
async methodName(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError('Validation failed', 400);
    }

    // 2. Extract and validate business logic
    const { param1, param2 } = req.body;
    
    // 3. Database operations with proper error handling
    const db = getDB();
    const result = await db.query('SELECT...', [param1]);
    
    // 4. Return consistent response
    res.json({
      success: true,
      message: 'Operation successful',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
}
```

### Route Definition Pattern
```typescript
router.post('/endpoint', authenticate, authorize(UserRole.ADMIN), [
  body('field').isRequired().isLength({ min: 1 }),
  // ... other validations
], controller.method);
```

This project is in Phase 1 development focusing on core functionality. Future phases will add real-time tracking, advanced route optimization, and mobile apps.

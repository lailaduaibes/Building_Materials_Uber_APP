# Development Setup Guide

## Quick Start Options

### Option 1: Docker Setup (Recommended)
The fastest way to get started with all dependencies:

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up postgres redis -d

# Install dependencies and run the API
npm install
npm run dev
```

### Option 2: Local Setup
If you prefer to run PostgreSQL and Redis locally:

```bash
# Install dependencies
npm install

# Set up your local database (adjust connection details in .env)
createdb delivery_app_dev
npm run db:setup

# Start Redis locally (or skip if using Docker for just Redis)
redis-server

# Run the development server
npm run dev
```

### Option 3: Full Docker Development
Run everything in containers:

```bash
# Build and run everything
docker-compose --profile full up --build
```

## Environment Configuration

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your settings**:
   ```bash
   # Database (adjust if using different settings)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=delivery_app_dev
   DB_USER=postgres
   DB_PASSWORD=password

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # Security
   JWT_SECRET=your_development_secret_change_in_production
   ```

## Database Setup

### Automatic Setup (Recommended)
```bash
npm run db:setup    # Set up database schema
npm run db:reset    # Reset database (drops and recreates)
```

### Manual Setup
```bash
# Connect to PostgreSQL
psql -U postgres -d delivery_app_dev

# Run the schema file
\i database/schema.sql
```

## Testing the API

Once the server is running on `http://localhost:3000`:

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. API Documentation
Visit: http://localhost:3000/api-docs

### 3. Create Admin User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 4. Login and Get Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### 5. Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests (when implemented)
npm run db:setup     # Initialize database schema
npm run db:reset     # Reset database
```

### Code Changes
- TypeScript files are automatically compiled and the server restarts on changes
- Database schema changes require running `npm run db:reset`
- New dependencies require `npm install` and server restart

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres
# OR if local:
pg_isready -h localhost -p 5432
```

**2. Redis Connection Error**
```bash
# Check if Redis is running
docker-compose ps redis
# OR if local:
redis-cli ping
```

**3. Port Already in Use**
```bash
# Kill process using port 3000
npx kill-port 3000
# OR change PORT in .env file
```

**4. TypeScript Compilation Errors**
```bash
# Clean build
rm -rf dist/
npm run build
```

### Development Tips

1. **Use VS Code**: The project is configured with proper TypeScript support
2. **API Documentation**: Always check `/api-docs` for latest endpoint specs
3. **Database Changes**: Use migrations or `npm run db:reset` for schema changes
4. **Environment Variables**: Never commit real credentials to `.env`
5. **Error Logs**: Check the console for detailed error messages

### Testing Endpoints

Use the provided Swagger UI at `/api-docs` or tools like:
- **Postman**: Import the API endpoints
- **cURL**: Use the examples in this guide
- **REST Client**: VS Code extension for testing APIs

## Next Steps

1. **Create Sample Data**: Add vehicles, drivers, and test orders
2. **Test Order Flow**: Create orders and test the assignment logic
3. **Integration Testing**: Test with your existing sales app
4. **Security Review**: Ensure proper authentication in production

## Production Deployment

For production deployment:
1. Update `.env` with production values
2. Use proper PostgreSQL and Redis instances
3. Set strong JWT secrets
4. Configure proper CORS origins
5. Enable SSL/TLS
6. Set up monitoring and logging

The API is now ready for development and testing!

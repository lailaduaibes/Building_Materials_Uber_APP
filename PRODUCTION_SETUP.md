# Production Setup Guide

## 🎯 Current Status
✅ **API Server**: Running on port 3000  
✅ **Database**: PostgreSQL/Supabase connected  
⚠️ **Redis**: Using in-memory fallback (install Redis for production features)  
✅ **Email Service**: SendGrid configured  
✅ **Rate Limiting**: Active with memory fallback  
✅ **Real-time Tracking**: Database integrated  

## 📋 Production Deployment Checklist

### Phase 1: Redis Installation (Recommended)
Redis provides production-grade caching, sessions, and rate limiting.

#### Windows Installation Options:

**Option 1: Using Windows Subsystem for Linux (WSL)**
```bash
# Install WSL and Ubuntu
wsl --install Ubuntu

# In WSL terminal:
sudo apt update
sudo apt install redis-server
redis-server
```

**Option 2: Using Docker**
```bash
# Install Docker Desktop for Windows
# Then run Redis container:
docker run -d --name redis-buildmate -p 6379:6379 redis:latest
```

**Option 3: Redis Windows Port**
```bash
# Download from: https://github.com/MicrosoftArchive/redis/releases
# Or use Chocolatey:
choco install redis-64
```

### Phase 2: Environment Configuration
Update your `.env` file with production settings:

```env
# Redis Configuration (after installation)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password
REDIS_DB=0

# Production Email Settings
SENDGRID_API_KEY=your_sendgrid_api_key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=BuildMate Support

# Production Database
DATABASE_URL=your_production_database_url

# Security Settings
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
BCRYPT_ROUNDS=12

# API Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Phase 3: SSL/HTTPS Setup
For production deployment with custom domain:

1. **Get SSL Certificate**
   - Use Let's Encrypt with Certbot
   - Or use your hosting provider's SSL

2. **Configure HTTPS**
   ```javascript
   // Add to server.ts for HTTPS
   import https from 'https';
   import fs from 'fs';

   const options = {
     key: fs.readFileSync('path/to/private-key.pem'),
     cert: fs.readFileSync('path/to/certificate.pem')
   };

   https.createServer(options, app).listen(443);
   ```

### Phase 4: Production Hosting Options

#### Option 1: Cloud Deployment (Recommended)
- **Heroku**: Easy deployment with add-ons
- **AWS**: EC2 + RDS + ElastiCache
- **Google Cloud**: App Engine + Cloud SQL + Memorystore
- **Azure**: App Service + Database + Cache

#### Option 2: VPS Deployment
- **DigitalOcean Droplet**
- **Linode**
- **Vultr**

#### Option 3: Dedicated Server
- Configure your own server with Docker/PM2

### Phase 5: Monitoring & Logging

#### Add Production Monitoring
```bash
npm install pm2 winston helmet compression
```

#### PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'buildmate-api',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};

# Start with PM2
pm2 start ecosystem.config.js --env production
```

### Phase 6: Security Hardening

#### API Security Headers
Already configured with Helmet.js:
- CORS policies
- Security headers
- Rate limiting
- Input validation

#### Database Security
- Use environment variables for credentials
- Enable SSL for database connections
- Regular security updates

### Phase 7: Performance Optimization

#### Already Implemented:
✅ Redis caching for API responses  
✅ Database connection pooling  
✅ Efficient queries with indexes  
✅ Rate limiting to prevent abuse  

#### Additional Optimizations:
- CDN for static assets
- Database query optimization
- Compression middleware
- Response caching

## 🧪 Testing Production Features

### Test Rate Limiting
```powershell
# Test auth rate limiting (10 requests per 15 minutes)
for ($i=1; $i -le 15; $i++) {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/login' -Method POST -Body '{"email":"test@test.com","password":"test"}' -ContentType 'application/json' -ErrorAction SilentlyContinue
    Write-Host "Request $i`: $($response.message)"
}
```

### Test Health Monitoring
```powershell
# Health check with detailed info
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
```

### Test Email Service
```powershell
# Test user registration (triggers email)
$userData = @{
    firstName = 'Test'
    lastName = 'User'
    email = 'test@yourdomain.com'
    password = 'SecurePass123!'
    role = 'customer'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/register' -Method POST -Body $userData -ContentType 'application/json'
```

## 📊 Monitoring Dashboard

### Key Metrics to Monitor:
- API response times
- Error rates
- Database connection pool usage
- Redis memory usage
- Rate limit hit rates
- User registration/login rates

### Log Files:
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Access logs: `logs/access.log`

## 🔄 Backup Strategy

### Database Backups:
- Daily automated backups
- Point-in-time recovery
- Cross-region replication

### File Backups:
- User uploaded files
- Configuration files
- SSL certificates

## 📱 Mobile App Integration

### Current Status:
✅ React Native app ready  
✅ API endpoints integrated  
✅ Real-time location tracking  
✅ Authentication system  

### Next Mobile Steps:
1. Test on physical devices
2. App store preparation
3. Push notifications setup
4. App analytics integration

## 🚀 Go-Live Checklist

- [ ] Redis installed and configured
- [ ] SSL certificate installed
- [ ] Domain name configured
- [ ] Database backups configured
- [ ] Monitoring tools setup
- [ ] Error tracking configured
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Team trained on production procedures

## 📞 Support & Maintenance

### Regular Tasks:
- Monitor system performance
- Review error logs
- Update dependencies
- Security patches
- Database maintenance
- Backup verification

### Emergency Procedures:
- Incident response plan
- Rollback procedures
- Data recovery steps
- Contact information

# 🚚 YouMats - Building Materials Delivery Platform

[![Production Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/LailaGhassan/building-materials-delivery-app)
[![Mobile App](https://img.shields.io/badge/Mobile-React%20Native%20Expo-blue)](https://expo.dev/)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-green)](https://supabase.com/)

A complete **Professional Building Materials Delivery Management System** built with modern technologies - Node.js backend API, Supabase PostgreSQL database, and React Native mobile application.

## 🎯 **Current Status - PRODUCTION READY**

- 🌐 **Backend API**: Running with Supabase PostgreSQL integration
- 📱 **Mobile App**: YouMats Professional UI with complete authentication
- 💾 **Database**: Production Supabase PostgreSQL with complete schema
- � **Authentication**: JWT-based with role-based access control

## 🏗️ **System Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   YouMats App   │◄───┤   RESTful API   │◄───┤   Supabase      │
│  React Native   │    │   (Node.js)     │    │  PostgreSQL     │
│  Professional  │    │  + TypeScript   │    │   Database      │
│      UI         │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
  iOS & Android            Express + Supabase          Production DB
   Expo/React Native       JWT Authentication         Cloud Hosted
   LinearGradient UI       Swagger Documentation      UUID Primary Keys
   Role-Based Access       Error Handling             Relationship Integrity
```

## 🚀 Features

### 🔐 **Authentication System**
- JWT-based authentication
- Role-based access control (Customer, Driver, Dispatcher, Admin)
- Password hashing with bcrypt
- Secure API endpoints

### 📦 **Order Management**
- **External Orders**: Direct customer delivery requests
- **Internal Orders**: Sales app integration
- Real-time order tracking
- Status updates (Pending → Assigned → In Transit → Delivered)
- Material specifications with quantities and weights

### 🚚 **Fleet Management**
- Vehicle capacity tracking (weight, volume)
- Equipment requirements (crane, forklift, GPS)
- Driver assignment and scheduling
- Route optimization

### 📱 **Mobile Applications**
- **Customer App**: Order placement and tracking
- **Driver App**: Delivery management and status updates
- **Dispatcher App**: Fleet coordination and assignment
- **Admin Panel**: System management

## � **Project Structure**

```
building-materials-delivery-app/
├── src/                          # Backend API source code
│   ├── controllers/              # API route handlers
│   │   ├── AuthController.ts     # Authentication & user management
│   │   ├── OrderController.ts    # External order management
│   │   ├── InternalOrderController.ts # Sales app integration
│   │   ├── VehicleController.ts  # Fleet management
│   │   ├── DriverController.ts   # Driver management
│   │   └── UserController.ts     # User profile management
│   ├── routes/                   # API endpoint definitions
│   ├── middleware/               # Authentication, validation, errors
│   ├── types/                    # TypeScript type definitions
│   ├── config/                   # Database & Redis configuration
│   └── utils/                    # Utility functions & helpers
├── YouMatsApp/                   # React Native mobile application
│   ├── App.tsx                   # Main mobile app component
│   ├── assets/                   # Images, icons, fonts
│   └── package.json              # Mobile app dependencies
├── supabase-schema.sql           # Production database schema
├── .env                          # Environment variables
├── package.json                  # Backend dependencies
└── README.md                     # Project documentation
```

## �🛠 **Technology Stack**

### **Backend API**
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js with comprehensive middleware
- **Database**: Supabase PostgreSQL (Production)
- **Authentication**: JWT tokens + bcrypt password hashing
- **Documentation**: Swagger/OpenAPI integration
- **Validation**: express-validator for all endpoints
- **Security**: Helmet, CORS, rate limiting ready

### **Mobile Application**
- **Framework**: React Native + Expo (Cross-platform)
- **Language**: TypeScript with strict mode
- **UI Components**: Professional LinearGradient design
- **Storage**: AsyncStorage for user sessions
- **API Integration**: Fetch with comprehensive error handling
- **Navigation**: Role-based screen routing system

### **Database & Infrastructure**
- **Database**: Supabase PostgreSQL with UUID primary keys
- **Schema**: Complete relational design with proper constraints
- **Hosting**: Cloud-native with global availability
- **Access**: External API tunnel with Cloudflared
- **Development**: Hot reload + tunnel access for mobile testing

## 📋 **Prerequisites**

- Node.js 18+
- Supabase account (free tier available)
- Expo CLI for mobile development
- Mobile device with Expo Go app OR emulator

## 🚀 **Quick Start**

### 1. **Environment Setup**

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add your Supabase credentials to .env
```

### 2. **Database Setup**

```sql
-- Run this SQL in your Supabase SQL Editor
-- Copy content from supabase-schema.sql
```

### 3. **Start Backend API**

```bash
npm run dev
# Backend runs on http://localhost:3000
```

### 4. **Start Mobile App**

```bash
cd YouMatsApp
npx expo start --tunnel
# Scan QR code with Expo Go app
```
npm install

# Copy environment file
cp .env.example .env
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb delivery_app_dev

# Run database schema
npm run db:setup

# Or reset and recreate database
npm run db:reset
```

### 3. Start Development Server

```bash
npm run dev
```

The API will be available at:
- **API Base URL**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 📊 Database Schema

### Core Tables
- **users** - Customer, driver, dispatcher, and admin accounts
- **vehicles** - Fleet vehicles with capacity and equipment specs
- **drivers** - Driver profiles with licenses and availability
- **orders** - Both internal and external delivery orders
- **order_items** - Individual items within orders

### Key Relationships
- Orders → Users (customer_id, driver_id)
- Orders → Vehicles (vehicle_id)
- Drivers → Users (user_id)
- Order Items → Orders (order_id)

## 🔐 API Authentication

### User Roles
- **Customer**: Create external orders, view own orders
- **Driver**: View assigned orders, update delivery status
- **Dispatcher**: Assign orders, manage fleet operations
- **Admin**: Full system access, user management

### Authentication Flow
```bash
# Register user
POST /api/v1/auth/register

# Login
POST /api/v1/auth/login

# Use JWT token in Authorization header
Authorization: Bearer <your-jwt-token>
```

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user profile

### Orders (External)
- `POST /api/v1/orders` - Create external delivery order
- `GET /api/v1/orders` - List orders (filtered by user role)
- `GET /api/v1/orders/:id` - Get order details
- `PUT /api/v1/orders/:id` - Update order

### Internal Orders (Sales App Integration)
- `POST /api/v1/internal-orders` - Create internal order from sales app
- `GET /api/v1/internal-orders` - List internal orders
- `GET /api/v1/internal-orders/:id` - Get internal order details

### Vehicles (Admin/Dispatcher)
- `POST /api/v1/vehicles` - Add new vehicle
- `GET /api/v1/vehicles` - List vehicles
- `GET /api/v1/vehicles/:id` - Get vehicle details
- `PUT /api/v1/vehicles/:id` - Update vehicle

### Drivers (Admin/Dispatcher)
- `POST /api/v1/drivers` - Add new driver
- `GET /api/v1/drivers` - List drivers
- `GET /api/v1/drivers/:id` - Get driver details
- `PUT /api/v1/drivers/:id` - Update driver

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run db:setup     # Set up database schema
npm run db:reset     # Reset and recreate database
```

### Project Structure
```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server startup
├── config/             # Database, Redis, Swagger config
├── controllers/        # Business logic and request handlers
├── middleware/         # Authentication, validation, error handling
├── routes/             # API endpoint definitions
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and utilities

database/
└── schema.sql          # PostgreSQL database schema

tests/
└── (test files)        # Unit and integration tests
```

## 🌟 Key Features in Detail

### Order Management
- **Dual Order Types**: Seamlessly handle both internal orders from sales app and external customer requests
- **Smart Vehicle Assignment**: Automatically match orders with appropriate vehicles based on weight, volume, and equipment requirements
- **Status Tracking**: Complete order lifecycle tracking with timestamps

### Fleet Management
- **Vehicle Profiles**: Detailed vehicle information including capacity, equipment (crane, forklift, GPS)
- **Driver Profiles**: Comprehensive driver management with licenses, skills, and availability
- **Assignment Logic**: Intelligent matching based on driver availability, vehicle capacity, and special requirements

### Security & Validation
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permissions for different user types
- **Input Validation**: Comprehensive validation for all API endpoints
- **Rate Limiting**: Protection against API abuse

## 🔮 Future Phases

### Phase 2 (Planned)
- Real-time GPS tracking with WebSocket connections
- Advanced route optimization
- Driver mobile application
- Push notifications
- Proof of delivery capture

### Phase 3 (Planned)
- Payment processing integration
- Analytics dashboard
- Customer mobile application
- Advanced reporting

## 🤝 API Integration

### Sales App Integration
The API provides dedicated endpoints for internal order creation from your existing sales application:

```javascript
// Example: Create internal order from sales app
POST /api/v1/internal-orders
{
  "salesOrderId": "SALES_12345",
  "customerId": "optional-if-registered",
  "items": [...],
  "pickupAddress": {...},
  "deliveryAddress": {...}
}
```

## 🛡️ Security Notes

- All passwords are hashed using bcrypt with 12 rounds
- JWT tokens expire in 24 hours (configurable)
- Rate limiting prevents API abuse
- CORS configured for secure cross-origin requests
- Helmet middleware adds security headers

## 📞 Support

For development questions or issues:
1. Check the API documentation at `/api-docs`
2. Review the database schema in `database/schema.sql`
3. Check the Copilot instructions in `.github/copilot-instructions.md`

## 📄 License

This project is proprietary software for building materials delivery management.

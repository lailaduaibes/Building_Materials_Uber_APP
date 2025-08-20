import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { createRateLimit } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
// import authSupabaseRoutes from './routes/auth-supabase';
import userRoutes from './routes/users';
import orderRoutes from './routes/orders';
import internalOrderRoutes from './routes/internalOrders';
import vehicleRoutes from './routes/vehicles';
import driverRoutes from './routes/drivers';
import locationRoutes from './routes/location';
import materialsRoutes from './routes/materials';
import supportRoutes from './routes/support';
import devToolsRoutes from './routes/dev-tools';
import { swaggerOptions } from './config/swagger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : true, // Allow all origins in development for mobile testing
  credentials: true
}));

// Rate limiting with Redis/memory fallback
const generalLimiter = createRateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', generalLimiter);

// Authentication specific rate limiting
const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again in 15 minutes.'
});

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for email verification
app.use(express.static('public'));

// Email verification route
app.get('/verify-email', (req, res) => {
  res.sendFile('verify-email.html', { root: 'public' });
});

// Swagger Documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Serve the mobile app demo at root
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BuildMate - Mobile App Demo</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
        }
        .phone-mockup { 
            width: 320px; height: 640px; background: #000; border-radius: 25px; 
            padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .screen { 
            width: 100%; height: 100%; background: #F8F9FA; border-radius: 15px; 
            overflow: hidden; position: relative;
        }
        .header { background: #2E86C1; padding: 20px; text-align: center; }
        .header h1 { color: white; font-size: 24px; margin-bottom: 5px; }
        .header p { color: rgba(255,255,255,0.9); font-size: 14px; }
        .content { padding: 20px; height: calc(100% - 80px); overflow-y: auto; }
        .welcome { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .welcome h2 { color: #2C3E50; margin-bottom: 10px; }
        .welcome p { color: #5D6D7E; line-height: 1.5; }
        .button { 
            display: block; width: 100%; padding: 15px; margin-bottom: 10px; 
            border: none; border-radius: 8px; font-weight: bold; font-size: 16px; 
            cursor: pointer; transition: transform 0.2s;
        }
        .button:hover { transform: translateY(-2px); }
        .btn-primary { background: #2E86C1; color: white; }
        .btn-success { background: #28B463; color: white; }
        .btn-outline { background: transparent; border: 2px solid #2E86C1; color: #2E86C1; }
        .btn-warning { background: #E67E22; color: white; }
        .features { margin-top: 20px; }
        .feature { 
            background: white; padding: 15px; margin-bottom: 10px; 
            border-radius: 8px; display: flex; align-items: center;
            box-shadow: 0 1px 5px rgba(0,0,0,0.1);
        }
        .feature-icon { font-size: 24px; margin-right: 15px; }
        .feature-text h3 { color: #2C3E50; margin-bottom: 5px; }
        .feature-text p { color: #5D6D7E; font-size: 12px; }
        .status { 
            background: white; padding: 15px; border-radius: 8px; 
            margin-top: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status h3 { text-align: center; color: #2C3E50; margin-bottom: 15px; }
        .status-item { display: flex; align-items: center; margin-bottom: 8px; }
        .status-dot { width: 8px; height: 8px; background: #28B463; border-radius: 50%; margin-right: 10px; }
        .status-text { color: #2C3E50; font-size: 14px; }
    </style>
</head>
<body>
    <div class="phone-mockup">
        <div class="screen">
            <div class="header">
                <h1>BuildMate</h1>
                <p>Building Materials Delivery</p>
            </div>
            <div class="content">
                <div id="app-content">
                    <!-- Main Dashboard -->
                    <div id="main-dashboard">
                        <div class="welcome">
                            <h2>Welcome to BuildMate</h2>
                            <p>Choose your portal to get started</p>
                        </div>
                        
                        <button class="button btn-primary" onclick="showCustomerPortal()">
                            🏗️ Customer Portal
                        </button>
                        
                        <button class="button btn-success" onclick="showDriverPortal()">
                            🚛 Driver Portal
                        </button>
                        
                        <button class="button btn-outline" onclick="showDispatcherPortal()">
                            � Dispatcher Portal
                        </button>
                        
                        <button class="button btn-warning" onclick="testAPI()">
                            🔗 Test API Connection
                        </button>
                    </div>
                </div>
                
                <div class="features">
                    <div class="feature">
                        <span class="feature-icon">⚡</span>
                        <div class="feature-text">
                            <h3>Fast Delivery</h3>
                            <p>Same-day delivery for urgent orders</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🛡️</span>
                        <div class="feature-text">
                            <h3>Secure Handling</h3>
                            <p>Professional handling of all materials</p>
                        </div>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📱</span>
                        <div class="feature-text">
                            <h3>Real-time Tracking</h3>
                            <p>Track your order from pickup to delivery</p>
                        </div>
                    </div>
                </div>
                
                <div class="status">
                    <h3>System Status</h3>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span class="status-text">API Connected & Running</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span class="status-text">Real-time Tracking Active</span>
                    </div>
                    <div class="status-item">
                        <div class="status-dot"></div>
                        <span class="status-text">Native Apps Ready</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;
        
        // Main Dashboard
        function showMainDashboard() {
            if (!currentUser) {
                showLoginScreen();
                return;
            }
            
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div id="main-dashboard">
                    <div class="welcome">
                        <h2>Welcome, \${currentUser.firstName}!</h2>
                        <p>Choose your portal to get started</p>
                        <div style="text-align: right; margin-bottom: 20px;">
                            <button onclick="logout()" style="background: #e74c3c; color: white; padding: 8px 15px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">Logout</button>
                        </div>
                    </div>
                    
                    <button class="button btn-primary" onclick="showCustomerPortal()">
                        🏗️ Customer Portal
                    </button>
                    
                    <button class="button btn-success" onclick="showDriverPortal()">
                        🚛 Driver Portal
                    </button>
                    
                    <button class="button btn-outline" onclick="showDispatcherPortal()">
                        📊 Dispatcher Portal
                    </button>
                    
                    <button class="button btn-warning" onclick="testAPI()">
                        🔗 Test API Connection
                    </button>
                </div>
            \`;
        }
        
        // Login Screen
        function showLoginScreen() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div class="welcome" style="text-align: center; margin-bottom: 30px;">
                        <h2>Welcome to BuildMate</h2>
                        <p>Please sign in to continue</p>
                    </div>
                    
                    <form id="login-form" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 8px; font-weight: bold;">Email Address</label>
                            <input type="email" id="login-email" placeholder="Enter your email" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 25px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 8px; font-weight: bold;">Password</label>
                            <input type="password" id="login-password" placeholder="Enter your password" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <button type="button" onclick="handleLogin()" class="button btn-primary" style="width: 100%; padding: 15px; font-size: 18px; margin-bottom: 15px;">
                            🔐 Sign In
                        </button>
                        
                        <div style="text-align: center;">
                            <span style="color: #7f8c8d;">Don't have an account? </span>
                            <button type="button" onclick="showRegisterScreen()" style="background: none; border: none; color: #3498db; cursor: pointer; text-decoration: underline;">Sign Up</button>
                        </div>
                    </form>
                </div>
            \`;
        }
        
        // Register Screen
        function showRegisterScreen() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showLoginScreen()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">Create Account</h2>
                    </div>
                    
                    <form id="register-form" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">First Name</label>
                            <input type="text" id="register-firstName" placeholder="Enter your first name" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Last Name</label>
                            <input type="text" id="register-lastName" placeholder="Enter your last name" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Email Address</label>
                            <input type="email" id="register-email" placeholder="Enter your email" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Phone Number</label>
                            <input type="tel" id="register-phone" placeholder="Enter your phone number" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Role</label>
                            <select id="register-role" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                                <option value="">Select your role</option>
                                <option value="customer">Customer</option>
                                <option value="driver">Driver</option>
                                <option value="dispatcher">Dispatcher</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Password</label>
                            <input type="password" id="register-password" placeholder="Create a password (min 6 characters)" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <button type="button" onclick="handleRegister()" class="button btn-success" style="width: 100%; padding: 15px; font-size: 18px;">
                            ✅ Create Account
                        </button>
                    </form>
                </div>
            \`;
        }
        
        // Customer Portal
        function showCustomerPortal() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showMainDashboard()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">Customer Portal</h2>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <button onclick="showPlaceOrder()" class="button btn-primary">
                            <div style="font-size: 24px; margin-bottom: 5px;">📦</div>
                            <div>Place Order</div>
                        </button>
                        <button onclick="showMyOrders()" class="button btn-success">
                            <div style="font-size: 24px; margin-bottom: 5px;">📋</div>
                            <div>My Orders</div>
                        </button>
                    </div>
                    
                    <!-- Recent Orders -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Recent Orders</h3>
                        <div id="recent-orders">
                            <div style="border-left: 4px solid #e74c3c; padding: 12px; background: #fff5f5; border-radius: 8px; margin-bottom: 10px;">
                                <div style="font-weight: bold; color: #2c3e50;">Order #ORD001</div>
                                <div style="color: #7f8c8d; font-size: 14px;">Cement bags (50) - In Transit</div>
                                <div style="color: #e74c3c; font-size: 12px; margin-top: 5px;">ETA: 2:30 PM</div>
                            </div>
                            <div style="border-left: 4px solid #27ae60; padding: 12px; background: #f8fff8; border-radius: 8px;">
                                <div style="font-weight: bold; color: #2c3e50;">Order #ORD002</div>
                                <div style="color: #7f8c8d; font-size: 14px;">Steel rods (20) - Delivered</div>
                                <div style="color: #27ae60; font-size: 12px; margin-top: 5px;">Completed: Today 11:45 AM</div>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }
        
        // Place Order Screen
        function showPlaceOrder() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showCustomerPortal()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">Place New Order</h2>
                    </div>
                    
                    <form id="order-form" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Materials Needed</label>
                            <select id="material-type" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                                <option value="">Select material type</option>
                                <option value="cement">Cement Bags</option>
                                <option value="steel">Steel Rods</option>
                                <option value="bricks">Bricks</option>
                                <option value="sand">Sand (cubic meters)</option>
                                <option value="gravel">Gravel (cubic meters)</option>
                            </select>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Quantity</label>
                            <input type="number" id="quantity" placeholder="Enter quantity" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Delivery Address</label>
                            <textarea id="delivery-address" placeholder="Enter complete delivery address" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px; height: 80px; resize: vertical;"></textarea>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Delivery Date</label>
                            <input type="date" id="delivery-date" style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px;">
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; color: #2c3e50; margin-bottom: 5px; font-weight: bold;">Special Instructions</label>
                            <textarea id="special-instructions" placeholder="Any special handling instructions..." style="width: 100%; padding: 12px; border: 2px solid #ecf0f1; border-radius: 8px; font-size: 16px; height: 60px; resize: vertical;"></textarea>
                        </div>
                        
                        <button type="button" onclick="submitOrder()" class="button btn-primary" style="width: 100%; padding: 15px; font-size: 18px;">
                            📦 Place Order
                        </button>
                    </form>
                </div>
            \`;
        }
        
        // My Orders Screen
        function showMyOrders() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showCustomerPortal()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">My Orders</h2>
                    </div>
                    
                    <div id="orders-list">
                        <!-- Active Orders -->
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h3 style="margin: 0; color: #2c3e50;">Order #ORD001</h3>
                                <span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">IN TRANSIT</span>
                            </div>
                            <div style="color: #7f8c8d; margin-bottom: 10px;">
                                <strong>Items:</strong> Cement bags (50)<br>
                                <strong>Delivery:</strong> 123 Construction Site, Downtown<br>
                                <strong>ETA:</strong> 2:30 PM
                            </div>
                            <button onclick="trackOrder('ORD001')" class="button btn-success" style="width: 100%;">
                                📍 Track Live Location
                            </button>
                        </div>
                        
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h3 style="margin: 0; color: #2c3e50;">Order #ORD002</h3>
                                <span style="background: #27ae60; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">DELIVERED</span>
                            </div>
                            <div style="color: #7f8c8d; margin-bottom: 10px;">
                                <strong>Items:</strong> Steel rods (20)<br>
                                <strong>Delivery:</strong> 456 Building Project, Uptown<br>
                                <strong>Completed:</strong> Today 11:45 AM
                            </div>
                            <button onclick="rateOrder('ORD002')" class="button btn-outline" style="width: 100%;">
                                ⭐ Rate & Review
                            </button>
                        </div>
                    </div>
                </div>
            \`;
        }
        
        // Driver Portal
        function showDriverPortal() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showMainDashboard()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">Driver Portal</h2>
                    </div>
                    
                    <!-- Driver Status -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Driver Status</h3>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #7f8c8d;">Currently:</span>
                            <span style="background: #27ae60; color: white; padding: 6px 12px; border-radius: 20px;">AVAILABLE</span>
                        </div>
                    </div>
                    
                    <!-- Assigned Jobs -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Assigned Jobs</h3>
                        
                        <div style="border-left: 4px solid #3498db; padding: 15px; background: #f8f9ff; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">Job #JOB001</div>
                            <div style="color: #7f8c8d; font-size: 14px; margin-bottom: 8px;">
                                <strong>Items:</strong> Cement bags (50)<br>
                                <strong>Pickup:</strong> BuildMate Warehouse A<br>
                                <strong>Delivery:</strong> 123 Construction Site, Downtown
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button onclick="startDelivery('JOB001')" class="button btn-primary" style="flex: 1;">
                                    🚀 Start Delivery
                                </button>
                                <button onclick="viewJobDetails('JOB001')" class="button btn-outline" style="flex: 1;">
                                    📋 Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            \`;
        }
        
        // Dispatcher Portal
        function showDispatcherPortal() {
            const content = document.getElementById('app-content');
            content.innerHTML = \`
                <div style="padding: 20px;">
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                        <button onclick="showMainDashboard()" style="background: none; border: none; font-size: 20px; cursor: pointer; margin-right: 10px;">←</button>
                        <h2 style="color: #2c3e50; margin: 0;">Dispatcher Portal</h2>
                    </div>
                    
                    <!-- Fleet Overview -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="background: #3498db; color: white; padding: 20px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">12</div>
                            <div style="font-size: 14px;">Active Drivers</div>
                        </div>
                        <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: bold;">8</div>
                            <div style="font-size: 14px;">Pending Orders</div>
                        </div>
                    </div>
                    
                    <!-- Pending Orders -->
                    <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Pending Assignment</h3>
                        
                        <div style="border: 2px solid #f39c12; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">Order #ORD003</div>
                            <div style="color: #7f8c8d; font-size: 14px; margin-bottom: 10px;">
                                <strong>Items:</strong> Bricks (1000)<br>
                                <strong>Delivery:</strong> 789 New Building, Suburb<br>
                                <strong>Priority:</strong> High
                            </div>
                            <button onclick="assignOrder('ORD003')" class="button btn-warning" style="width: 100%;">
                                🚛 Assign Driver
                            </button>
                        </div>
                    </div>
                </div>
            \`;
        }
        
        // Authentication Functions
        async function handleLogin() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    currentUser = data.user;
                    localStorage.setItem('buildmate_token', data.token);
                    localStorage.setItem('buildmate_user', JSON.stringify(data.user));
                    alert('Login Successful!\\n\\nWelcome back, ' + data.user.firstName + '!');
                    showMainDashboard();
                } else {
                    alert('Login Failed\\n\\n' + (data.message || 'Invalid credentials'));
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login Failed\\n\\nUnable to connect to server. Please try again.');
            }
        }
        
        async function handleRegister() {
            const firstName = document.getElementById('register-firstName').value;
            const lastName = document.getElementById('register-lastName').value;
            const email = document.getElementById('register-email').value;
            const phone = document.getElementById('register-phone').value;
            const role = document.getElementById('register-role').value;
            const password = document.getElementById('register-password').value;
            
            if (!firstName || !lastName || !email || !phone || !role || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        firstName,
                        lastName,
                        email,
                        phone,
                        role,
                        password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    alert('Registration Successful!\\n\\nAccount created for ' + firstName + ' ' + lastName + '.\\nPlease sign in to continue.');
                    showLoginScreen();
                } else {
                    alert('Registration Failed\\n\\n' + (data.message || 'Unable to create account'));
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration Failed\\n\\nUnable to connect to server. Please try again.');
            }
        }
        
        function logout() {
            currentUser = null;
            localStorage.removeItem('buildmate_token');
            localStorage.removeItem('buildmate_user');
            showLoginScreen();
        }
        
        // Check for existing session
        function checkExistingSession() {
            const token = localStorage.getItem('buildmate_token');
            const user = localStorage.getItem('buildmate_user');
            
            if (token && user) {
                try {
                    currentUser = JSON.parse(user);
                    return true;
                } catch (error) {
                    localStorage.removeItem('buildmate_token');
                    localStorage.removeItem('buildmate_user');
                }
            }
            return false;
        }
        
        // Utility Functions
        function submitOrder() {
            const materialType = document.getElementById('material-type').value;
            const quantity = document.getElementById('quantity').value;
            const address = document.getElementById('delivery-address').value;
            const date = document.getElementById('delivery-date').value;
            
            if (!materialType || !quantity || !address || !date) {
                alert('Please fill in all required fields');
                return;
            }
            
            alert('Order Submitted Successfully!\\n\\nOrder ID: ORD' + Math.floor(Math.random() * 1000).toString().padStart(3, '0') + '\\nEstimated Delivery: ' + date + '\\n\\nYou will receive tracking information shortly.');
            showCustomerPortal();
        }
        
        function trackOrder(orderId) {
            alert('Live Tracking - Order ' + orderId + '\\n\\n📍 Current Location: Downtown Ave & 5th St\\n🚛 Driver: Mike Johnson\\n📞 Contact: (555) 123-4567\\n\\n⏰ ETA: 2:30 PM');
        }
        
        function rateOrder(orderId) {
            alert('Rate Your Experience\\n\\nOrder ' + orderId + ' completed successfully!\\n\\nThank you for using BuildMate. Your feedback helps us improve our service.');
        }
        
        function startDelivery(jobId) {
            alert('Delivery Started!\\n\\nJob ' + jobId + ' is now in progress.\\nNavigation has been activated.\\nCustomer has been notified.');
        }
        
        function viewJobDetails(jobId) {
            alert('Job Details - ' + jobId + '\\n\\nCustomer: ABC Construction\\nPhone: (555) 987-6543\\nSpecial Instructions: Use rear entrance\\nDelivery Window: 2:00 PM - 4:00 PM');
        }
        
        function assignOrder(orderId) {
            alert('Assign Driver\\n\\nOrder ' + orderId + ' assigned to:\\nDriver: Sarah Wilson\\nVehicle: Truck #T-205\\nETA to pickup: 15 minutes');
        }
        
        async function testAPI() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                alert('Backend Connection\\n\\n✅ ' + data.message + '\\n\\nStatus: ' + data.status + '\\nTime: ' + new Date().toLocaleTimeString());
            } catch (error) {
                alert('Backend Connection\\n\\n❌ Failed to connect to backend API');
                console.error('API connection error:', error);
            }
        }
        
        // Initialize app
        if (checkExistingSession()) {
            showMainDashboard();
        } else {
            showLoginScreen();
        }
    </script>
</body>
</html>
  `);
});

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

// Use main auth routes with additional auth rate limiting
app.use(`/api/${apiVersion}/auth`, authLimiter, authRoutes);

// Legacy auth routes (keep for backward compatibility during transition)
// app.use(`/api/${apiVersion}/auth-legacy`, authLimiter, authRoutes);

app.use(`/api/${apiVersion}/users`, userRoutes);
app.use(`/api/${apiVersion}/orders`, orderRoutes);
app.use(`/api/${apiVersion}/internal-orders`, internalOrderRoutes);
app.use(`/api/${apiVersion}/vehicles`, vehicleRoutes);
app.use(`/api/${apiVersion}/drivers`, driverRoutes);
app.use(`/api/${apiVersion}/location`, locationRoutes);
app.use(`/api/${apiVersion}/materials`, materialsRoutes);
app.use(`/api/${apiVersion}/support`, supportRoutes);
app.use(`/api/${apiVersion}/dev`, devToolsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;

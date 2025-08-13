# 📱 Building Materials Uber - Mobile App

A professional React Native mobile application for Android and iOS that connects to your Building Materials Delivery API.

## 🎨 **App Features**

### **Modern Professional UI**
- 🎯 **Clean Design**: Modern color scheme with orange-red primary color
- 📱 **Native Experience**: Professional UI similar to Uber, DoorDash apps
- 🔍 **Role-based Views**: Different interfaces for Customer, Driver, Dispatcher, Admin
- 📊 **Real-time Status**: Live order tracking and status updates

### **Customer Features**
- ✅ **Order Management**: Create, track, and manage delivery orders
- 📍 **Address Management**: Pickup and delivery location selection
- 📦 **Material Selection**: Choose building materials with quantities
- 🚚 **Live Tracking**: Real-time delivery status updates
- 📱 **Push Notifications**: Order status change notifications

### **Driver Features**
- 🗺️ **Route Optimization**: GPS navigation to pickup/delivery locations
- 📋 **Order Assignment**: View and accept assigned deliveries
- ✅ **Status Updates**: Mark orders as picked up, in transit, delivered
- 🚛 **Vehicle Info**: Current vehicle and capacity information

### **Dispatcher Features**
- 👥 **Fleet Management**: Assign drivers and vehicles to orders
- 📊 **Dashboard Analytics**: Order statistics and performance metrics
- 🚚 **Vehicle Tracking**: Monitor fleet location and availability
- 📋 **Order Queue**: Manage pending order assignments

## 🏗️ **Architecture**

```
mobile-app/
├── src/
│   ├── screens/           # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── CustomerDashboard.tsx
│   │   ├── CreateOrder.tsx
│   │   └── OrderDetails.tsx
│   ├── components/        # Reusable UI components
│   │   ├── OrderCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── CustomButton.tsx
│   ├── navigation/        # App navigation setup
│   │   ├── AppNavigator.tsx
│   │   └── TabNavigator.tsx
│   ├── services/         # API integration
│   │   └── api.ts
│   ├── types/            # TypeScript definitions
│   │   └── index.ts
│   ├── constants/        # App constants
│   │   └── theme.ts
│   └── utils/           # Helper functions
```

## 🚀 **Setup Instructions**

### **Prerequisites**
- Node.js 16+ installed
- Expo CLI installed: `npm install -g @expo/cli`
- Android Studio (for Android) or Xcode (for iOS)
- Your backend API running on `http://localhost:3000`

### **Step 1: Install Dependencies**
```bash
cd mobile-app
npm install
```

### **Step 2: Configure API Connection**
Edit `src/services/api.ts`:
```typescript
// For Android Emulator
const API_BASE_URL = "http://10.0.2.2:3000/api/v1";

// For iOS Simulator  
const API_BASE_URL = "http://localhost:3000/api/v1";

// For Physical Device (replace with your computer's IP)
const API_BASE_URL = "http://192.168.1.100:3000/api/v1";
```

### **Step 3: Start the Development Server**
```bash
# Start Expo development server
npm start

# Or run directly on platforms
npm run android    # Android emulator/device
npm run ios        # iOS simulator (macOS only)
npm run web        # Web browser
```

## 📱 **Testing the Mobile App**

### **Step 1: Test Login**
1. Open the app on your device/emulator
2. Use test credentials:
   - **Customer**: `customer@test.com` / `password123`
   - **Driver**: `driver@test.com` / `password123`
   - **Dispatcher**: `dispatcher@test.com` / `password123`
   - **Admin**: `admin@test.com` / `password123`

### **Step 2: Test Customer Flow**
1. Login as customer
2. View dashboard with order statistics
3. Tap "Create Order" to add new delivery
4. Fill in material details and addresses
5. Track order status changes

### **Step 3: Test Driver Flow**
1. Login as driver
2. View assigned orders
3. Update order status (Picked Up → In Transit → Delivered)
4. View route information

### **Step 4: Test API Integration**
Monitor network requests in development:
```bash
# Backend API logs
cd ../
npm run dev

# Check API health
curl http://localhost:3000/health
```

## 🎨 **UI Components**

### **Colors & Branding**
- **Primary**: #FF6B35 (Orange-red)
- **Secondary**: #2E3A59 (Dark blue-gray)
- **Success**: #28A745 (Green)
- **Warning**: #FFC107 (Yellow)
- **Error**: #DC3545 (Red)

### **Typography**
- **Headers**: Bold, 24-32px
- **Body Text**: Regular, 16px
- **Labels**: Medium, 14px
- **Captions**: Regular, 12px

### **Status Colors**
- **Pending**: #FFC107 (Yellow)
- **Assigned**: #17A2B8 (Blue)
- **Picked Up**: #6F42C1 (Purple)
- **In Transit**: #FF6B35 (Orange)
- **Delivered**: #28A745 (Green)

## 📋 **Next Steps**

### **Phase 1 (Current)**
- ✅ Login/Authentication
- ✅ Customer Dashboard
- ✅ Order Management
- ✅ API Integration
- 🔄 Navigation Setup
- 🔄 Create Order Screen

### **Phase 2 (Upcoming)**
- 📍 GPS Integration
- 🔔 Push Notifications
- 📷 Photo Upload
- 🗺️ Maps Integration
- 📊 Analytics Dashboard

### **Phase 3 (Future)**
- 🚀 Performance Optimization
- 🧪 Testing Suite
- 📦 App Store Deployment
- 🔄 Offline Support

## 🐛 **Troubleshooting**

### **Common Issues**
1. **API Connection Failed**
   - Check backend server is running
   - Verify API base URL matches your setup
   - For physical devices, use your computer's IP address

2. **Module Not Found Errors**
   - Run `npm install` to install dependencies
   - Clear Metro cache: `npx expo start --clear`

3. **Android Build Issues**
   - Ensure Android Studio is properly installed
   - Check ANDROID_HOME environment variable
   - Run `expo doctor` to check setup

### **Development Tips**
- Use `console.log()` for debugging API calls
- Enable network inspection in React Native Debugger
- Test on both Android and iOS if possible
- Use physical devices for better performance testing

## 📞 **Support**

For issues or questions:
1. Check backend API documentation
2. Review React Native/Expo documentation
3. Test API endpoints with Postman/curl first
4. Verify mobile device network connectivity

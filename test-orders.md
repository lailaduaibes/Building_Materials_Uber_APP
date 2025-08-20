# 🚚 Order Management System Demo

## Overview
The B2B Building Materials Delivery App supports two types of orders:

### **1. External Orders** (Direct Customer Requests)
- Customers place delivery requests directly through the app
- Full address details with pickup and delivery locations
- Multiple material types with weight/volume calculations
- Scheduling for pickup and delivery times

### **2. Internal Orders** (From Sales System)
- Integration with existing sales app via API
- Pre-approved orders with sales order IDs
- Automatic order import and processing

## Order Lifecycle
```
PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
```

## Sample Order Data

### External Delivery Order
```json
{
  "items": [
    {
      "materialType": "cement",
      "description": "Portland Cement 50kg bags",
      "quantity": 20,
      "unit": "bags",
      "weight": 1000,
      "volume": 2.5,
      "specialHandling": ["keep_dry", "handle_with_care"]
    },
    {
      "materialType": "steel",
      "description": "Reinforcement Steel Bars 12mm",
      "quantity": 100,
      "unit": "pieces",
      "weight": 890,
      "volume": 1.2
    }
  ],
  "pickupAddress": {
    "street": "123 Warehouse District",
    "city": "Industrial City",
    "state": "State",
    "zipCode": "12345",
    "country": "Country",
    "specialInstructions": "Loading dock B, security code: 1234"
  },
  "deliveryAddress": {
    "street": "456 Construction Site Ave",
    "city": "Build City",
    "state": "State", 
    "zipCode": "67890",
    "country": "Country",
    "specialInstructions": "Site manager: John Smith, call before arrival"
  },
  "scheduledPickupTime": "2025-08-15T08:00:00Z",
  "scheduledDeliveryTime": "2025-08-15T14:00:00Z",
  "specialRequirements": ["crane_access", "forklift_needed"],
  "notes": "Rush order for foundation work"
}
```

## Testing the Order System

### 1. Create Order API
```bash
POST /api/v1/orders
```

### 2. Get Orders API  
```bash
GET /api/v1/orders?status=pending&page=1&limit=10
```

### 3. Update Order Status
```bash
PATCH /api/v1/orders/:id/status
```

### 4. Assign Driver/Vehicle
```bash
PATCH /api/v1/orders/:id/assign
```

## Material Types Supported
- 🏗️ **Cement** - Bags, bulk
- 🔩 **Steel** - Rebar, structural steel
- 🧱 **Bricks** - Standard, specialty bricks  
- 🏖️ **Sand** - Construction sand, fine sand
- 🪨 **Gravel** - Various sizes
- 🏠 **Concrete Blocks** - Standard blocks
- 🪵 **Lumber** - Various dimensions
- 🚰 **Pipes** - PVC, metal pipes
- 🔲 **Tiles** - Floor, wall tiles
- ❓ **Other** - Custom materials

## Key Features
- ✅ **Real-time order tracking**
- ✅ **Weight/volume calculations**
- ✅ **GPS coordinates support**
- ✅ **Special handling requirements**
- ✅ **Multi-item orders**
- ✅ **Scheduled deliveries**
- ✅ **Customer notifications**
- ✅ **Driver assignment**
- ✅ **Vehicle matching**

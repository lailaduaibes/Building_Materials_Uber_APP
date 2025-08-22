# Complete Database Analysis - Navigation Fix Plan

## Database Structure Analysis

### Two Main Order Systems:

1. **ORDERS Table** (Internal orders from sales system)
   - Has `order_type` field (delivery, pickup, urgent, bulk)
   - Status values: `in_transit`, `pending`, `delivered`, `matched`
   - Links to `order_items` table for materials
   - Used for existing sales app integration

2. **TRIP_REQUESTS Table** (External direct delivery requests)
   - Status values: `in_transit`, `pending`, `delivered`, `matched`  
   - Direct customer requests for materials delivery
   - More detailed location tracking and requirements
   - Material type stored directly in table

### Current Problem:
- All service type buttons (Delivery, Pickup, Urgent, Bulk) from UberStyleMainDashboard are routing to the same basic map view
- User cannot access existing comprehensive screens:
  - `OrderHistoryScreen.tsx` (400 lines) - Trip history functionality
  - `LiveTrackingScreenTrip.tsx` (738 lines) - Real-time tracking
  - `DashboardScreen.tsx` (653 lines) - Order management

### Solution Plan:

1. **Connect Service Types to Existing Screens**:
   - Delivery Orders → `OrderHistoryScreen` filtered by order_type='delivery'
   - Pickup Orders → `OrderHistoryScreen` filtered by order_type='pickup'  
   - Urgent Orders → `OrderHistoryScreen` filtered by order_type='urgent'
   - Bulk Orders → `OrderHistoryScreen` filtered by order_type='bulk'
   - Live Tracking → `LiveTrackingScreenTrip` (all active trips)

2. **Update TripService Integration**:
   - Modify to work with both `orders` and `trip_requests` tables
   - Filter by order_type for internal orders
   - Show all trip_requests for external orders

3. **Fix Navigation in UberStyleMainDashboard**:
   - Route service buttons to existing screens with proper filters
   - Remove basic map view routing
   - Connect to comprehensive existing functionality

## Next Steps:
1. Update UberStyleMainDashboard navigation
2. Modify TripService to handle both table types
3. Update OrderHistoryScreen to filter by order_type
4. Ensure LiveTrackingScreenTrip works with both order types

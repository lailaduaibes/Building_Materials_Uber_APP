# 🏗️ Professional Pricing Architecture Plan

## Current State Analysis
- ❌ **CustomerApp**: Has `calculateTripPrice()` in TripService.ts
- ❌ **DriverApp**: Uses `quoted_price` from database (no calculation)
- ❌ **No ASAP Premium**: No surge pricing for urgent deliveries
- ❌ **Inconsistency Risk**: Different apps might calculate different prices

## Recommended Architecture: **Backend-Centralized Pricing**

### Phase 1: Backend Pricing Service
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Customer App      │    │   Backend API       │    │   Driver App        │
│                     │    │                     │    │                     │
│ Request Price  ────►│────│ PricingService      │────│◄──── Get Trip Price │
│                     │    │                     │    │                     │
│ Create Order  ────►│────│ • Base Calculation  │────│◄──── Show Earnings  │
│                     │    │ • ASAP Premium      │    │                     │
│                     │    │ • Surge Logic       │    │                     │
│                     │    │ • Weight Multiplier │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Phase 2: Professional ASAP Pricing Logic
```typescript
// Backend: src/services/PricingService.ts
export class ProfessionalPricingService {
  
  async calculateTripPrice(params: {
    pickupLat: number;
    pickupLng: number;
    deliveryLat: number;
    deliveryLng: number;
    truckTypeId: string;
    estimatedWeight?: number;
    pickupTimePreference: 'asap' | 'scheduled';
    scheduledTime?: Date;
  }): Promise<PricingResult> {
    
    // 1. Base price calculation
    const basePrice = await this.calculateBasePrice(params);
    
    // 2. ASAP premium logic
    const asapMultiplier = this.getASAPMultiplier(params);
    
    // 3. Surge pricing (demand-based)
    const surgeMultiplier = await this.getSurgeMultiplier(params);
    
    // 4. Final price calculation
    const finalPrice = basePrice * asapMultiplier * surgeMultiplier;
    
    return {
      basePrice,
      asapMultiplier,
      surgeMultiplier,
      finalPrice,
      breakdown: this.generatePriceBreakdown()
    };
  }
  
  private getASAPMultiplier(params): number {
    if (params.pickupTimePreference === 'asap') {
      const now = new Date();
      const hour = now.getHours();
      
      // Peak hours premium
      if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
        return 1.5; // 50% premium during rush hours
      }
      
      // Regular ASAP premium
      return 1.3; // 30% premium for ASAP
    }
    
    return 1.0; // No premium for scheduled
  }
}
```

### Phase 3: API Endpoints
```typescript
// Backend: src/routes/pricing.ts
router.post('/calculate-price', async (req, res) => {
  const pricingService = new ProfessionalPricingService();
  const result = await pricingService.calculateTripPrice(req.body);
  
  res.json({
    success: true,
    data: result
  });
});

router.post('/get-driver-earnings', async (req, res) => {
  const { tripId } = req.body;
  const trip = await getTripById(tripId);
  const earnings = await pricingService.calculateDriverEarnings(trip);
  
  res.json({
    success: true,
    data: earnings
  });
});
```

### Phase 4: Updated App Integration

#### Customer App Changes:
```typescript
// CustomerAppNew/services/TripService.ts
async calculateTripPrice(params): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/pricing/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    const result = await response.json();
    return result.data.finalPrice;
  } catch (error) {
    // Fallback to local calculation
    return this.calculateTripPriceLocal(params);
  }
}
```

#### Driver App Changes:
```typescript
// YouMatsApp/services/DriverService.ts
async getEnhancedTripEarnings(tripId: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/pricing/get-driver-earnings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId })
    });
    
    const result = await response.json();
    return result.data.estimatedEarnings;
  } catch (error) {
    // Fallback to quoted_price
    return trip.quoted_price || 0;
  }
}
```

## Benefits of This Architecture

### ✅ **Consistency**
- Single source of truth for pricing
- Both apps get identical prices
- Centralized business logic

### ✅ **Professional ASAP Logic**
- Dynamic ASAP premiums (1.3x - 1.8x)
- Surge pricing during peak hours
- Distance-based bonuses
- Driver scarcity multipliers

### ✅ **Maintainability**
- Changes in one place
- Easy A/B testing
- Centralized monitoring

### ✅ **Scalability**
- Real-time pricing adjustments
- Market-responsive pricing
- Advanced algorithms (ML, etc.)

### ✅ **Fallback Safety**
- Apps retain local calculation as backup
- Graceful degradation if API fails
- Always functional

## Implementation Priority

### 🚀 **Phase 1** (Immediate)
1. Create backend PricingService
2. Add ASAP premium logic (1.3x multiplier)
3. Update CustomerApp to use API
4. Update DriverApp earnings display

### 🚀 **Phase 2** (Week 2)
1. Add surge pricing logic
2. Implement distance bonuses
3. Add driver scarcity multipliers
4. Enhanced UI showing price breakdown

### 🚀 **Phase 3** (Week 3)
1. A/B testing framework
2. Analytics integration
3. Advanced algorithms
4. Real-time pricing adjustments

## Database Schema Additions (Optional)
```sql
-- Track pricing decisions for analytics
CREATE TABLE pricing_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_request_id UUID REFERENCES trip_requests(id),
  base_price NUMERIC NOT NULL,
  asap_multiplier NUMERIC DEFAULT 1.0,
  surge_multiplier NUMERIC DEFAULT 1.0,
  final_price NUMERIC NOT NULL,
  calculation_timestamp TIMESTAMP DEFAULT NOW(),
  pricing_version VARCHAR(10) DEFAULT '1.0'
);
```

This architecture ensures **professional, consistent, and scalable pricing** across both apps while adding the missing ASAP premium logic you need.

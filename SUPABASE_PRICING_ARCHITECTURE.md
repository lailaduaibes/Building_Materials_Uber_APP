# 🏗️ Supabase-Compatible Pricing Architecture

## Current Constraint: No Traditional Backend Server
- ✅ Using Supabase as backend
- ❌ Cannot create traditional REST API server
- ❌ Need alternative to centralized pricing service

## **Best Approach: Shared TypeScript Pricing Module**

### Architecture Overview
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Customer App      │    │   Shared Pricing    │    │   Driver App        │
│                     │    │      Module         │    │                     │
│ Import PricingService │────│ ProfessionalPricing │────│ Import PricingService│
│                     │    │                     │    │                     │
│ Calculate Locally   │    │ • ASAP Premium      │    │ Calculate Locally   │
│ Store in Supabase   │    │ • Surge Logic       │    │ Show Earnings       │
│                     │    │ • Weight Multiplier │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │   Supabase DB       │
                            │                     │
                            │ • trip_requests     │
                            │ • quoted_price      │
                            │ • final_price       │
                            │ • asap_multiplier   │
                            └─────────────────────┘
```

### Implementation Strategy

## **Phase 1: Shared Pricing Module**

### Create Shared Pricing Service
```typescript
// shared/services/ProfessionalPricingService.ts
export interface PricingParams {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  truckTypeId: string;
  estimatedWeight?: number;
  pickupTimePreference: 'asap' | 'scheduled';
  scheduledTime?: Date;
  currentHour?: number; // for testing
}

export interface PricingResult {
  basePrice: number;
  asapMultiplier: number;
  surgeMultiplier: number;
  proximityBonus: number;
  finalPrice: number;
  driverEarnings: number;
  breakdown: PriceBreakdown;
}

export class ProfessionalPricingService {
  
  // Base truck type rates (fallback if Supabase fails)
  private static readonly TRUCK_RATES = {
    'small-truck': { perKm: 2.50, perHour: 40.00 },
    'box-truck': { perKm: 2.50, perHour: 50.00 },
    'dump-truck': { perKm: 3.00, perHour: 65.00 },
    'flatbed': { perKm: 3.50, perHour: 75.00 },
    'crane-truck': { perKm: 5.00, perHour: 120.00 }
  };

  // Professional ASAP Configuration
  private static readonly ASAP_CONFIG = {
    REGULAR_MULTIPLIER: 1.3,        // 30% premium for ASAP
    PEAK_HOURS_MULTIPLIER: 1.5,     // 50% premium during rush hours
    HIGH_DEMAND_MULTIPLIER: 1.8,    // 80% premium during high demand
    PROXIMITY_BONUS: 10,             // ₪10 bonus for nearby trips
    PREFERRED_DISTANCE_KM: 5,        // Distance for proximity bonus
    PEAK_HOURS: [7, 8, 9, 17, 18, 19], // Rush hour times
    MINIMUM_CHARGE: 50.00            // Minimum trip price
  };

  /**
   * 🚀 Professional ASAP Price Calculation
   */
  static async calculatePrice(
    params: PricingParams,
    truckRates?: { base_rate_per_km: number; base_rate_per_hour: number }
  ): Promise<PricingResult> {
    
    // 1. Calculate base price
    const distance = this.calculateDistance(
      params.pickupLat, params.pickupLng,
      params.deliveryLat, params.deliveryLng
    );
    
    const rates = truckRates || this.getTruckRatesFallback(params.truckTypeId);
    const estimatedHours = distance / 40; // 40 km/h average speed
    
    let basePrice = (distance * rates.base_rate_per_km) + 
                    (estimatedHours * rates.base_rate_per_hour);
    
    // 2. Weight multiplier
    if (params.estimatedWeight && params.estimatedWeight > 5) {
      basePrice *= (1 + (params.estimatedWeight - 5) * 0.1);
    }
    
    // 3. ASAP Premium Logic
    const asapMultiplier = this.calculateASAPMultiplier(params);
    
    // 4. Surge pricing (future: based on demand)
    const surgeMultiplier = this.calculateSurgeMultiplier(params);
    
    // 5. Proximity bonus for short trips
    const proximityBonus = this.calculateProximityBonus(distance, params);
    
    // 6. Final price calculation
    const subtotal = basePrice * asapMultiplier * surgeMultiplier;
    const finalPrice = Math.max(subtotal + proximityBonus, this.ASAP_CONFIG.MINIMUM_CHARGE);
    
    // 7. Driver earnings (85% of final price)
    const driverEarnings = finalPrice * 0.85;
    
    return {
      basePrice: Math.round(basePrice * 100) / 100,
      asapMultiplier,
      surgeMultiplier,
      proximityBonus,
      finalPrice: Math.round(finalPrice * 100) / 100,
      driverEarnings: Math.round(driverEarnings * 100) / 100,
      breakdown: {
        distance,
        estimatedHours,
        ratePerKm: rates.base_rate_per_km,
        ratePerHour: rates.base_rate_per_hour,
        isASAP: params.pickupTimePreference === 'asap',
        isPeakHours: this.isPeakHours(params.currentHour || new Date().getHours()),
        isProximityBonus: distance <= this.ASAP_CONFIG.PREFERRED_DISTANCE_KM
      }
    };
  }

  /**
   * 🔥 ASAP Premium Calculation
   */
  private static calculateASAPMultiplier(params: PricingParams): number {
    if (params.pickupTimePreference !== 'asap') {
      return 1.0; // No premium for scheduled trips
    }
    
    const currentHour = params.currentHour || new Date().getHours();
    
    // Peak hours premium (7-9 AM, 5-7 PM)
    if (this.ASAP_CONFIG.PEAK_HOURS.includes(currentHour)) {
      return this.ASAP_CONFIG.PEAK_HOURS_MULTIPLIER;
    }
    
    // Regular ASAP premium
    return this.ASAP_CONFIG.REGULAR_MULTIPLIER;
  }

  /**
   * 📊 Surge Pricing (Future Enhancement)
   */
  private static calculateSurgeMultiplier(params: PricingParams): number {
    // Future: Calculate based on demand, available drivers, etc.
    // For now, return 1.0 (no surge)
    return 1.0;
  }

  /**
   * 🎯 Proximity Bonus for Short Trips
   */
  private static calculateProximityBonus(distance: number, params: PricingParams): number {
    if (params.pickupTimePreference === 'asap' && 
        distance <= this.ASAP_CONFIG.PREFERRED_DISTANCE_KM) {
      return this.ASAP_CONFIG.PROXIMITY_BONUS;
    }
    return 0;
  }

  /**
   * 📍 Distance Calculation (Haversine Formula)
   */
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static isPeakHours(hour: number): boolean {
    return this.ASAP_CONFIG.PEAK_HOURS.includes(hour);
  }

  private static getTruckRatesFallback(truckTypeId: string) {
    return {
      base_rate_per_km: 3.00,
      base_rate_per_hour: 50.00
    };
  }
}

export interface PriceBreakdown {
  distance: number;
  estimatedHours: number;
  ratePerKm: number;
  ratePerHour: number;
  isASAP: boolean;
  isPeakHours: boolean;
  isProximityBonus: boolean;
}
```

## **Phase 2: Integration Strategy**

### Option A: Copy Module to Both Apps
```
Building Materials Uber App/
├── CustomerAppNew/
│   └── shared/services/ProfessionalPricingService.ts
├── YouMatsApp/
│   └── shared/services/ProfessionalPricingService.ts
└── shared/ (master copy)
    └── services/ProfessionalPricingService.ts
```

### Option B: NPM Package (Advanced)
```bash
# Create shared package
cd shared/
npm init -y
npm publish @yourcompany/pricing-service

# Install in both apps
cd CustomerAppNew/
npm install @yourcompany/pricing-service

cd YouMatsApp/
npm install @yourcompany/pricing-service
```

### Option C: Git Submodule
```bash
# Add as submodule
git submodule add ./shared CustomerAppNew/shared
git submodule add ./shared YouMatsApp/shared
```

## **Phase 3: App Integration**

### Customer App Changes
```typescript
// CustomerAppNew/services/TripService.ts
import { ProfessionalPricingService } from '../shared/services/ProfessionalPricingService';

async calculateTripPrice(params): Promise<number> {
  try {
    // Get truck rates from Supabase
    const { data: truckType } = await supabase
      .from('truck_types')
      .select('base_rate_per_km, base_rate_per_hour')
      .eq('id', params.truckTypeId)
      .single();

    // Calculate using shared service
    const result = await ProfessionalPricingService.calculatePrice(params, truckType);
    
    return result.finalPrice;
  } catch (error) {
    console.error('Pricing calculation error:', error);
    // Fallback to basic calculation
    return 75.00;
  }
}
```

### Driver App Changes
```typescript
// YouMatsApp/services/DriverService.ts
import { ProfessionalPricingService } from '../shared/services/ProfessionalPricingService';

async getEnhancedTripEarnings(trip: OrderAssignment): Promise<number> {
  try {
    const params = {
      pickupLat: trip.pickupLocation.latitude,
      pickupLng: trip.pickupLocation.longitude,
      deliveryLat: trip.deliveryLocation.latitude,
      deliveryLng: trip.deliveryLocation.longitude,
      truckTypeId: trip.truckTypeId,
      estimatedWeight: trip.estimatedWeight,
      pickupTimePreference: trip.pickupTimePreference
    };

    const result = await ProfessionalPricingService.calculatePrice(params);
    return result.driverEarnings;
  } catch (error) {
    // Fallback to quoted_price
    return trip.quoted_price || 0;
  }
}
```

## **Benefits of This Approach**

### ✅ **Supabase Compatible**
- No need for additional backend server
- Works with existing Supabase architecture
- Leverages existing database structure

### ✅ **Consistency**
- Both apps use identical pricing logic
- Single source of truth for calculations
- Professional ASAP premium handling

### ✅ **Professional Features**
- ASAP multipliers (1.3x - 1.5x)
- Peak hours surge pricing
- Proximity bonuses for short trips
- Driver earnings calculation

### ✅ **Maintainable**
- Shared code, single place for changes
- Easy to test and debug
- Version controlled

### ✅ **Scalable**
- Easy to add new pricing rules
- A/B testing capabilities
- Performance optimized

## **Implementation Priority**

1. **Week 1**: Create shared ProfessionalPricingService
2. **Week 2**: Integrate into CustomerApp
3. **Week 3**: Integrate into DriverApp with enhanced ASAP logic
4. **Week 4**: Add surge pricing and advanced features

This approach gives you **professional Uber-like pricing** while working within your Supabase architecture constraints!

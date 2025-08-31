/**
 * 🚚 Professional Building Materials Delivery Pricing Service
 * 
 * Handles both ASAP and Scheduled trip pricing with:
 * - ASAP premium multipliers (30-80% surge)
 * - Peak hours surge pricing
 * - Proximity bonuses for efficiency
 * - Weight-based pricing
 * - Driver earnings calculation
 * - Professional Uber-like logic
 */

export interface PricingParams {
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
  truckTypeId: string;
  estimatedWeight?: number;
  pickupTimePreference: 'asap' | 'scheduled';
  scheduledTime?: Date;
  currentHour?: number; // For testing purposes
  isHighDemand?: boolean; // Future: based on active trips
}

export interface TruckRates {
  base_rate_per_km: number;
  base_rate_per_hour: number;
}

export interface PricingResult {
  basePrice: number;
  asapMultiplier: number;
  surgeMultiplier: number;
  proximityBonus: number;
  finalPrice: number;
  driverEarnings: number;
  breakdown: PriceBreakdown;
  pricing: {
    isASAP: boolean;
    isPeakHours: boolean;
    isProximityBonus: boolean;
    isHighDemand: boolean;
    premiumType: 'none' | 'asap-regular' | 'asap-peak' | 'asap-surge';
  };
}

export interface PriceBreakdown {
  distance: number;
  estimatedHours: number;
  ratePerKm: number;
  ratePerHour: number;
  weightMultiplier: number;
  rawBasePrice: number;
  adjustedBasePrice: number;
}

export class ProfessionalPricingService {
  
  // Professional ASAP Configuration - Uber-like parameters
  private static readonly ASAP_CONFIG = {
    // ASAP Multipliers
    REGULAR_MULTIPLIER: 1.3,        // 30% premium for regular ASAP
    PEAK_HOURS_MULTIPLIER: 1.5,     // 50% premium during rush hours  
    HIGH_DEMAND_MULTIPLIER: 1.8,    // 80% premium during high demand
    
    // Bonuses & Incentives
    PROXIMITY_BONUS: 15,             // ₪15 bonus for trips within preferred zone
    PREFERRED_DISTANCE_KM: 5,        // Distance threshold for proximity bonus
    EFFICIENCY_BONUS: 10,            // ₪10 bonus for very short trips (<2km)
    EFFICIENCY_THRESHOLD_KM: 2,      // Distance for efficiency bonus
    
    // Time-based Logic
    PEAK_HOURS: [7, 8, 9, 17, 18, 19], // Rush hour times (7-9 AM, 5-7 PM)
    NIGHT_PREMIUM_HOURS: [22, 23, 0, 1, 2, 3, 4, 5, 6], // Night premium 10PM-6AM
    NIGHT_PREMIUM_MULTIPLIER: 1.2,   // 20% premium for night deliveries
    
    // Business Rules
    MINIMUM_CHARGE: 50.00,           // Minimum trip price
    DRIVER_COMMISSION: 0.15,         // Platform takes 15%, driver gets 85%
    AVERAGE_SPEED_KMH: 40,           // Assumed average speed for time calculation
    WEIGHT_THRESHOLD_TONS: 5,        // Weight over which premium applies
    WEIGHT_PREMIUM_RATE: 0.1,        // 10% extra per ton over threshold
  };

  // Fallback truck rates if Supabase query fails
  private static readonly TRUCK_RATES_FALLBACK: Record<string, TruckRates> = {
    'small-truck': { base_rate_per_km: 2.50, base_rate_per_hour: 40.00 },
    'box-truck': { base_rate_per_km: 2.50, base_rate_per_hour: 50.00 },
    'car-carrier': { base_rate_per_km: 2.50, base_rate_per_hour: 60.00 },
    'dump-truck': { base_rate_per_km: 3.00, base_rate_per_hour: 65.00 },
    'flatbed-truck': { base_rate_per_km: 3.50, base_rate_per_hour: 75.00 },
    'crane-truck': { base_rate_per_km: 5.00, base_rate_per_hour: 120.00 },
    'default': { base_rate_per_km: 3.00, base_rate_per_hour: 50.00 }
  };

  /**
   * 🚀 Main Price Calculation Method
   * Professional pricing logic for both ASAP and scheduled trips
   */
  static async calculatePrice(
    params: PricingParams,
    truckRates?: TruckRates
  ): Promise<PricingResult> {
    
    console.log('🧮 [PricingService] Starting professional price calculation...');
    console.log('📊 [PricingService] Params:', {
      pickup: `${params.pickupLat.toFixed(4)}, ${params.pickupLng.toFixed(4)}`,
      delivery: `${params.deliveryLat.toFixed(4)}, ${params.deliveryLng.toFixed(4)}`,
      truckType: params.truckTypeId,
      preference: params.pickupTimePreference,
      weight: params.estimatedWeight || 'N/A'
    });

    try {
      // 1. Calculate distance and time
      const distance = this.calculateDistance(
        params.pickupLat, params.pickupLng,
        params.deliveryLat, params.deliveryLng
      );
      const estimatedHours = distance / this.ASAP_CONFIG.AVERAGE_SPEED_KMH;
      
      console.log(`📏 [PricingService] Distance: ${distance.toFixed(2)}km, Time: ${estimatedHours.toFixed(2)}h`);
      
      // 2. Get truck rates (from Supabase or fallback)
      const rates = truckRates || this.getTruckRatesFallback(params.truckTypeId);
      console.log(`🚛 [PricingService] Rates: ₪${rates.base_rate_per_km}/km, ₪${rates.base_rate_per_hour}/h`);
      
      // 3. Calculate raw base price
      const rawBasePrice = (distance * rates.base_rate_per_km) + (estimatedHours * rates.base_rate_per_hour);
      console.log(`💰 [PricingService] Raw base price: ₪${rawBasePrice.toFixed(2)}`);
      
      // 4. Apply weight multiplier
      const weightMultiplier = this.calculateWeightMultiplier(params.estimatedWeight);
      const adjustedBasePrice = rawBasePrice * weightMultiplier;
      console.log(`⚖️ [PricingService] Weight multiplier: ${weightMultiplier}x, Adjusted: ₪${adjustedBasePrice.toFixed(2)}`);
      
      // 5. Calculate ASAP premium
      const { multiplier: asapMultiplier, premiumType } = this.calculateASAPMultiplier(params);
      console.log(`🔥 [PricingService] ASAP multiplier: ${asapMultiplier}x (${premiumType})`);
      
      // 6. Calculate surge multiplier (future enhancement)
      const surgeMultiplier = this.calculateSurgeMultiplier(params);
      console.log(`📈 [PricingService] Surge multiplier: ${surgeMultiplier}x`);
      
      // 7. Calculate proximity and efficiency bonuses
      const proximityBonus = this.calculateProximityBonus(distance, params);
      console.log(`🎯 [PricingService] Proximity bonus: ₪${proximityBonus}`);
      
      // 8. Final price calculation
      const subtotal = adjustedBasePrice * asapMultiplier * surgeMultiplier;
      const finalPrice = Math.max(subtotal + proximityBonus, this.ASAP_CONFIG.MINIMUM_CHARGE);
      
      // 9. Calculate driver earnings
      const driverEarnings = finalPrice * (1 - this.ASAP_CONFIG.DRIVER_COMMISSION);
      
      console.log(`🏁 [PricingService] Final price: ₪${finalPrice.toFixed(2)}, Driver earns: ₪${driverEarnings.toFixed(2)}`);
      
      // 10. Build result object
      const result: PricingResult = {
        basePrice: this.roundPrice(adjustedBasePrice),
        asapMultiplier,
        surgeMultiplier,
        proximityBonus,
        finalPrice: this.roundPrice(finalPrice),
        driverEarnings: this.roundPrice(driverEarnings),
        breakdown: {
          distance,
          estimatedHours,
          ratePerKm: rates.base_rate_per_km,
          ratePerHour: rates.base_rate_per_hour,
          weightMultiplier,
          rawBasePrice: this.roundPrice(rawBasePrice),
          adjustedBasePrice: this.roundPrice(adjustedBasePrice)
        },
        pricing: {
          isASAP: params.pickupTimePreference === 'asap',
          isPeakHours: this.isPeakHours(params.currentHour),
          isProximityBonus: proximityBonus > 0,
          isHighDemand: params.isHighDemand || false,
          premiumType
        }
      };
      
      console.log('✅ [PricingService] Price calculation completed successfully');
      return result;
      
    } catch (error) {
      console.error('❌ [PricingService] Price calculation error:', error);
      
      // Return fallback pricing
      return this.createFallbackPricing(params);
    }
  }

  /**
   * 🔥 ASAP Premium Logic
   * Calculates multiplier based on time of day and demand
   */
  private static calculateASAPMultiplier(params: PricingParams): { 
    multiplier: number; 
    premiumType: 'none' | 'asap-regular' | 'asap-peak' | 'asap-surge' 
  } {
    if (params.pickupTimePreference !== 'asap') {
      return { multiplier: 1.0, premiumType: 'none' };
    }
    
    const currentHour = params.currentHour ?? new Date().getHours();
    
    // High demand surge pricing
    if (params.isHighDemand) {
      return { multiplier: this.ASAP_CONFIG.HIGH_DEMAND_MULTIPLIER, premiumType: 'asap-surge' };
    }
    
    // Peak hours premium (rush hours)
    if (this.ASAP_CONFIG.PEAK_HOURS.includes(currentHour)) {
      return { multiplier: this.ASAP_CONFIG.PEAK_HOURS_MULTIPLIER, premiumType: 'asap-peak' };
    }
    
    // Night premium
    if (this.ASAP_CONFIG.NIGHT_PREMIUM_HOURS.includes(currentHour)) {
      return { multiplier: this.ASAP_CONFIG.NIGHT_PREMIUM_MULTIPLIER, premiumType: 'asap-regular' };
    }
    
    // Regular ASAP premium
    return { multiplier: this.ASAP_CONFIG.REGULAR_MULTIPLIER, premiumType: 'asap-regular' };
  }

  /**
   * 📊 Surge Pricing Logic (Future Enhancement)
   * Based on demand, available drivers, weather, etc.
   */
  private static calculateSurgeMultiplier(params: PricingParams): number {
    // Future implementation:
    // - Check number of active drivers in area
    // - Check number of pending ASAP requests
    // - Weather conditions
    // - Special events
    
    // For now, return 1.0 (no surge)
    return 1.0;
  }

  /**
   * 🎯 Proximity and Efficiency Bonuses
   * Incentivize drivers to take short, efficient trips
   */
  private static calculateProximityBonus(distance: number, params: PricingParams): number {
    if (params.pickupTimePreference !== 'asap') {
      return 0; // Only ASAP trips get bonuses
    }
    
    let bonus = 0;
    
    // Proximity bonus for preferred zone
    if (distance <= this.ASAP_CONFIG.PREFERRED_DISTANCE_KM) {
      bonus += this.ASAP_CONFIG.PROXIMITY_BONUS;
    }
    
    // Efficiency bonus for very short trips
    if (distance <= this.ASAP_CONFIG.EFFICIENCY_THRESHOLD_KM) {
      bonus += this.ASAP_CONFIG.EFFICIENCY_BONUS;
    }
    
    return bonus;
  }

  /**
   * ⚖️ Weight-based Pricing Multiplier
   * Additional charge for heavy loads
   */
  private static calculateWeightMultiplier(estimatedWeight?: number): number {
    if (!estimatedWeight || estimatedWeight <= this.ASAP_CONFIG.WEIGHT_THRESHOLD_TONS) {
      return 1.0;
    }
    
    const excessWeight = estimatedWeight - this.ASAP_CONFIG.WEIGHT_THRESHOLD_TONS;
    return 1 + (excessWeight * this.ASAP_CONFIG.WEIGHT_PREMIUM_RATE);
  }

  /**
   * 📍 Distance Calculation using Haversine Formula
   * Accurate distance calculation between two GPS coordinates
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

  /**
   * 🕐 Peak Hours Detection
   */
  private static isPeakHours(hour?: number): boolean {
    if (hour === undefined) {
      hour = new Date().getHours();
    }
    return this.ASAP_CONFIG.PEAK_HOURS.includes(hour);
  }

  /**
   * 🚛 Get Truck Rates (Fallback)
   */
  private static getTruckRatesFallback(truckTypeId: string): TruckRates {
    const normalizedId = truckTypeId.toLowerCase().replace(/[^a-z-]/g, '');
    return this.TRUCK_RATES_FALLBACK[normalizedId] || this.TRUCK_RATES_FALLBACK.default;
  }

  /**
   * 💰 Round Price to 2 Decimal Places
   */
  private static roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  /**
   * 🛡️ Fallback Pricing (If Calculation Fails)
   */
  private static createFallbackPricing(params: PricingParams): PricingResult {
    const fallbackPrice = 75.00;
    const isASAP = params.pickupTimePreference === 'asap';
    const finalPrice = isASAP ? fallbackPrice * 1.3 : fallbackPrice;
    const driverEarnings = finalPrice * 0.85;
    
    return {
      basePrice: fallbackPrice,
      asapMultiplier: isASAP ? 1.3 : 1.0,
      surgeMultiplier: 1.0,
      proximityBonus: 0,
      finalPrice: this.roundPrice(finalPrice),
      driverEarnings: this.roundPrice(driverEarnings),
      breakdown: {
        distance: 10,
        estimatedHours: 0.25,
        ratePerKm: 3.00,
        ratePerHour: 50.00,
        weightMultiplier: 1.0,
        rawBasePrice: fallbackPrice,
        adjustedBasePrice: fallbackPrice
      },
      pricing: {
        isASAP,
        isPeakHours: false,
        isProximityBonus: false,
        isHighDemand: false,
        premiumType: isASAP ? 'asap-regular' : 'none'
      }
    };
  }

  /**
   * 🔧 Utility: Convert Degrees to Radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 📋 Get Pricing Summary (For Display)
   */
  static getPricingSummary(result: PricingResult): string {
    let summary = `Base: ₪${result.basePrice}`;
    
    if (result.pricing.isASAP) {
      const premiumPercent = Math.round((result.asapMultiplier - 1) * 100);
      summary += ` + ASAP ${premiumPercent}%`;
    }
    
    if (result.proximityBonus > 0) {
      summary += ` + Bonus ₪${result.proximityBonus}`;
    }
    
    summary += ` = ₪${result.finalPrice}`;
    return summary;
  }
}

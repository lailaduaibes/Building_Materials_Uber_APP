/**
 * 🚀 Professional Pricing Configuration
 * Shared configuration for ASAP and scheduled trip pricing
 * Used by both CustomerApp and DriverApp for consistency
 */

export const PRICING_CONFIG = {
  // 🔥 ASAP Premium Multipliers  
  ASAP_REGULAR_MULTIPLIER: 1.3,      // 30% premium for regular ASAP
  ASAP_PEAK_HOURS_MULTIPLIER: 1.5,   // 50% premium during rush hours
  ASAP_HIGH_DEMAND_MULTIPLIER: 1.8,  // 80% premium during high demand
  ASAP_NIGHT_MULTIPLIER: 1.2,        // 20% premium for night deliveries

  // 🎯 Bonuses & Incentives
  PROXIMITY_BONUS: 15,                // ₪15 bonus for trips within 5km
  EFFICIENCY_BONUS: 10,               // ₪10 bonus for trips under 2km
  PREFERRED_DISTANCE_KM: 5,           // Distance for proximity bonus
  EFFICIENCY_THRESHOLD_KM: 2,         // Distance for efficiency bonus

  // ⏰ Time-based Logic  
  PEAK_HOURS: [7, 8, 9, 17, 18, 19],                    // Rush hours
  NIGHT_HOURS: [22, 23, 0, 1, 2, 3, 4, 5, 6],          // Night hours

  // 💼 Business Rules
  MINIMUM_CHARGE: 50.00,              // Minimum trip price
  DRIVER_COMMISSION: 0.15,            // Platform takes 15%, driver gets 85%
  AVERAGE_SPEED_KMH: 40,              // Average speed for time calculation
  WEIGHT_THRESHOLD_TONS: 5,           // Weight over which premium applies
  WEIGHT_PREMIUM_RATE: 0.1,           // 10% extra per ton over threshold

  // 📊 Display Settings
  CURRENCY_SYMBOL: '₪',               // Currency symbol
  CURRENCY_CODE: 'ILS',               // Currency code  
  DECIMAL_PLACES: 2,                  // Price decimal places
  
  // 🚀 Feature Flags
  ENABLE_ASAP_PREMIUM: true,          // Enable ASAP premium pricing
  ENABLE_SURGE_PRICING: false,        // Enable surge pricing (future)
  ENABLE_PROXIMITY_BONUS: true,       // Enable proximity bonuses
  ENABLE_WEIGHT_PREMIUM: true,        // Enable weight-based pricing
  
  // 🎨 UI Configuration  
  SHOW_PRICE_BREAKDOWN: true,         // Show detailed price breakdown
  SHOW_PREMIUM_BADGE: true,           // Show premium trip badges
  SHOW_EARNINGS_SUMMARY: true,        // Show earnings summary to drivers
};

export const TRUCK_TYPE_DEFAULTS = {
  'small-truck': { base_rate_per_km: 2.50, base_rate_per_hour: 40.00 },
  'box-truck': { base_rate_per_km: 2.50, base_rate_per_hour: 50.00 },
  'car-carrier': { base_rate_per_km: 2.50, base_rate_per_hour: 60.00 },
  'dump-truck': { base_rate_per_km: 3.00, base_rate_per_hour: 65.00 },
  'flatbed-truck': { base_rate_per_km: 3.50, base_rate_per_hour: 75.00 },
  'crane-truck': { base_rate_per_km: 5.00, base_rate_per_hour: 120.00 },
  'default': { base_rate_per_km: 3.00, base_rate_per_hour: 50.00 }
};

/**
 * Get current pricing environment (can be extended for A/B testing)
 */
export const getPricingEnvironment = (): 'production' | 'test' => {
  return 'production';
};

/**
 * Check if ASAP premium is enabled
 */
export const isASAPPremiumEnabled = (): boolean => {
  return PRICING_CONFIG.ENABLE_ASAP_PREMIUM;
};

/**
 * Get ASAP multiplier based on current time
 */
export const getASAPMultiplier = (hour?: number): number => {
  if (!isASAPPremiumEnabled()) {
    return 1.0;
  }

  const currentHour = hour ?? new Date().getHours();
  
  if (PRICING_CONFIG.PEAK_HOURS.includes(currentHour)) {
    return PRICING_CONFIG.ASAP_PEAK_HOURS_MULTIPLIER;
  }
  
  if (PRICING_CONFIG.NIGHT_HOURS.includes(currentHour)) {
    return PRICING_CONFIG.ASAP_NIGHT_MULTIPLIER;
  }
  
  return PRICING_CONFIG.ASAP_REGULAR_MULTIPLIER;
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return `${PRICING_CONFIG.CURRENCY_SYMBOL}${price.toFixed(PRICING_CONFIG.DECIMAL_PLACES)}`;
};

/**
 * Get premium type label
 */
export const getPremiumTypeLabel = (premiumType: string): string => {
  switch (premiumType) {
    case 'asap-peak':
      return 'Peak Hours Premium';
    case 'asap-surge':
      return 'High Demand Surge';
    case 'asap-regular':
      return 'ASAP Premium';
    default:
      return 'Regular';
  }
};

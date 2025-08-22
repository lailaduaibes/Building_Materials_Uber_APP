/**
 * Smart Truck Recommendation System
 * Analyzes user input and recommends optimal truck types
 */

import { TruckType } from './TripService';

export interface TruckRecommendation {
  truckType: TruckType;
  score: number; // 0-100 compatibility score
  reasons: string[];
  warnings?: string[];
  isRecommended: boolean;
  capacityUtilization: {
    weight: number; // percentage
    volume: number; // percentage
  };
}

export interface MaterialRequirements {
  materialType: string;
  estimatedWeight: number; // in tons
  estimatedVolume?: number; // in cubic meters (optional - will be calculated if not provided)
  loadDescription: string;
  requiresCrane?: boolean;
  requiresHydraulicLift?: boolean;
  isFragile?: boolean;
  isHazardous?: boolean;
}

export class TruckRecommendationEngine {
  // Material-specific truck preferences and requirements
  private static materialTruckMap: Record<string, {
    preferredTrucks: string[];
    minCapacityTons: number;
    specialEquipment?: string[];
    volumeMultiplier?: number; // density factor
  }> = {
    steel: {
      preferredTrucks: ['Flatbed Truck', 'Heavy Duty Flatbed'],
      minCapacityTons: 2,
      specialEquipment: ['crane'],
      volumeMultiplier: 0.2 // steel is very dense
    },
    concrete: {
      preferredTrucks: ['Concrete Mixer', 'Dump Truck'],
      minCapacityTons: 3,
      volumeMultiplier: 0.4
    },
    sand: {
      preferredTrucks: ['Dump Truck', 'Tipper Truck'],
      minCapacityTons: 1,
      volumeMultiplier: 0.6
    },
    lumber: {
      preferredTrucks: ['Flatbed Truck', 'Curtainside Truck'],
      minCapacityTons: 1,
      volumeMultiplier: 1.5 // lumber takes more volume
    },
    bricks: {
      preferredTrucks: ['Flatbed Truck', 'Box Truck'],
      minCapacityTons: 2,
      volumeMultiplier: 0.3
    },
    pipes: {
      preferredTrucks: ['Flatbed Truck', 'Pipe Truck'],
      minCapacityTons: 1,
      specialEquipment: ['crane'],
      volumeMultiplier: 1.2
    },
    hardware: {
      preferredTrucks: ['Box Truck', 'Small Truck'],
      minCapacityTons: 0.5,
      volumeMultiplier: 2 // hardware is light but bulky
    },
    heavy_machinery: {
      preferredTrucks: ['Heavy Duty Flatbed', 'Crane Truck', 'Low Loader'],
      minCapacityTons: 5,
      specialEquipment: ['crane', 'hydraulic_lift'],
      volumeMultiplier: 0.8
    },
    other: {
      preferredTrucks: ['Box Truck', 'Small Truck', 'Flatbed Truck'],
      minCapacityTons: 0.5,
      volumeMultiplier: 1
    }
  };

  /**
   * Main recommendation function
   */
  static recommendTrucks(
    requirements: MaterialRequirements,
    availableTrucks: TruckType[]
  ): TruckRecommendation[] {
    const recommendations: TruckRecommendation[] = [];

    for (const truck of availableTrucks) {
      const recommendation = this.evaluateTruck(truck, requirements);
      recommendations.push(recommendation);
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluate a single truck for the given requirements
   */
  private static evaluateTruck(
    truck: TruckType,
    requirements: MaterialRequirements
  ): TruckRecommendation {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    const materialConfig = this.materialTruckMap[requirements.materialType] || this.materialTruckMap.other;
    
    // Use provided volume or calculate estimated volume
    const estimatedVolume = requirements.estimatedVolume || 
                           (requirements.estimatedWeight * (materialConfig.volumeMultiplier || 1));

    // 1. Material type compatibility (30 points)
    const isPreferredTruck = materialConfig.preferredTrucks.includes(truck.name);
    if (isPreferredTruck) {
      score += 30;
      reasons.push(`✅ Specialized for ${requirements.materialType}`);
    } else {
      score += 10;
      reasons.push(`⚠️ Can handle ${requirements.materialType} but not specialized`);
    }

    // 2. Weight capacity check (25 points)
    const weightUtilization = (requirements.estimatedWeight / truck.payload_capacity) * 100;
    if (requirements.estimatedWeight <= truck.payload_capacity) {
      if (weightUtilization <= 80) {
        score += 25;
        reasons.push(`✅ Safe weight capacity (${weightUtilization.toFixed(1)}% utilized)`);
      } else {
        score += 15;
        warnings.push(`⚠️ High weight utilization (${weightUtilization.toFixed(1)}%)`);
      }
    } else {
      score = 0; // Eliminate if overweight
      warnings.push(`❌ Exceeds weight capacity by ${(requirements.estimatedWeight - truck.payload_capacity).toFixed(1)} tons`);
    }

    // 3. Volume capacity check (20 points)
    const volumeUtilization = (estimatedVolume / truck.volume_capacity) * 100;
    if (estimatedVolume <= truck.volume_capacity) {
      if (volumeUtilization <= 80) {
        score += 20;
        reasons.push(`✅ Adequate volume (${volumeUtilization.toFixed(1)}% utilized)`);
      } else {
        score += 10;
        warnings.push(`⚠️ Limited volume space (${volumeUtilization.toFixed(1)}%)`);
      }
    } else {
      score = Math.max(0, score - 10);
      warnings.push(`⚠️ May exceed volume capacity`);
    }

    // 4. Special equipment requirements (15 points)
    if (requirements.requiresCrane || requirements.requiresHydraulicLift) {
      const hasRequiredEquipment = this.checkSpecialEquipment(truck, requirements);
      if (hasRequiredEquipment) {
        score += 15;
        reasons.push(`✅ Has required special equipment`);
      } else {
        score = Math.max(0, score - 20);
        warnings.push(`❌ Missing required equipment (crane/hydraulic lift)`);
      }
    } else {
      score += 5; // Bonus for not needing special equipment
    }

    // 5. Efficiency and cost optimization (10 points)
    const efficiencyScore = this.calculateEfficiencyScore(truck, requirements, weightUtilization, volumeUtilization);
    score += efficiencyScore;
    if (efficiencyScore >= 8) {
      reasons.push(`✅ Cost-effective choice`);
    } else if (efficiencyScore <= 3) {
      reasons.push(`💰 May be oversized for this load`);
    }

    // Ensure minimum capacity requirements
    if (requirements.estimatedWeight < materialConfig.minCapacityTons && truck.payload_capacity > materialConfig.minCapacityTons * 2) {
      warnings.push(`💡 Consider smaller truck for better cost efficiency`);
    }

    return {
      truckType: truck,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      warnings,
      isRecommended: score >= 70 && warnings.length === 0,
      capacityUtilization: {
        weight: weightUtilization,
        volume: volumeUtilization
      }
    };
  }

  private static checkSpecialEquipment(truck: TruckType, requirements: MaterialRequirements): boolean {
    // Check if truck has required special equipment
    // This would need to be implemented based on your truck table structure
    const truckEquipment = truck.name.toLowerCase();
    
    if (requirements.requiresCrane && truckEquipment.includes('crane')) {
      return true;
    }
    
    if (requirements.requiresHydraulicLift && 
        (truckEquipment.includes('hydraulic') || truckEquipment.includes('lift'))) {
      return true;
    }

    return !requirements.requiresCrane && !requirements.requiresHydraulicLift;
  }

  private static calculateEfficiencyScore(
    truck: TruckType,
    requirements: MaterialRequirements,
    weightUtilization: number,
    volumeUtilization: number
  ): number {
    // Optimal utilization is 60-80%
    const idealUtilization = 70;
    const maxUtilization = Math.max(weightUtilization, volumeUtilization);
    
    if (maxUtilization >= 60 && maxUtilization <= 80) {
      return 10; // Perfect efficiency
    } else if (maxUtilization >= 40 && maxUtilization <= 90) {
      return 7; // Good efficiency
    } else if (maxUtilization >= 20 && maxUtilization <= 95) {
      return 4; // Acceptable efficiency
    } else {
      return 1; // Poor efficiency
    }
  }

  /**
   * Get quick recommendation for material type
   */
  static getQuickRecommendation(materialType: string): string[] {
    const config = this.materialTruckMap[materialType] || this.materialTruckMap.other;
    return config.preferredTrucks;
  }

  /**
   * Estimate volume needed based on weight and material type
   */
  static estimateVolume(materialType: string, weightTons: number): number {
    const config = this.materialTruckMap[materialType] || this.materialTruckMap.other;
    return weightTons * (config.volumeMultiplier || 1);
  }

  /**
   * Get material-specific advice
   */
  static getMaterialAdvice(materialType: string): string[] {
    const advice: Record<string, string[]> = {
      steel: [
        'Consider crane requirements for heavy pieces',
        'Secure loading is critical for safety',
        'Weather protection may be needed'
      ],
      concrete: [
        'Time-sensitive delivery required',
        'Mixer trucks needed for wet concrete',
        'Access road must support heavy vehicles'
      ],
      sand: [
        'Tarp covering required for transport',
        'Consider moisture content',
        'Dump access needed at delivery site'
      ],
      lumber: [
        'Weather protection essential',
        'Proper securing to prevent shifting',
        'Consider length of lumber pieces'
      ],
      heavy_machinery: [
        'Special permits may be required',
        'Route planning for height/weight restrictions',
        'Professional loading/unloading essential'
      ]
    };

    return advice[materialType] || [
      'Verify access roads at pickup and delivery',
      'Ensure proper securing of load',
      'Consider weather conditions'
    ];
  }
}

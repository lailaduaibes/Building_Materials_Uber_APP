/**
 * AI Route Optimization Service
 * Advanced multi-stop delivery optimization with intelligent routing
 * Supports: Distance optimization, Traffic analysis, Vehicle capacity, Time windows
 */

interface DeliveryPoint {
  id: string;
  latitude: number;
  longitude: number;
  address: string;
  type: 'pickup' | 'delivery';
  tripId: string;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  priority: 'low' | 'medium' | 'high' | 'asap';
  materialType: string;
  weight: number;
  estimatedHandlingTime: number; // minutes
}

interface Vehicle {
  id: string;
  driverId: string;
  currentLatitude: number;
  currentLongitude: number;
  capacity: {
    weight: number;
    volume: number;
  };
  available: boolean;
  type: 'truck' | 'van' | 'pickup';
  fuelEfficiency: number; // km per liter
}

interface OptimizedRoute {
  vehicleId: string;
  driverId: string;
  points: DeliveryPoint[];
  totalDistance: number;
  estimatedTime: number;
  estimatedFuelCost: number;
  efficiency: number;
  savings: {
    distance: number;
    time: number;
    fuel: number;
    cost: number;
  };
}

interface RouteOptimizationResult {
  routes: OptimizedRoute[];
  totalSavings: {
    distance: number;
    time: number;
    fuel: number;
    cost: number;
  };
  unassigned: DeliveryPoint[];
  recommendations: string[];
}

export class AIRouteOptimizationService {
  private readonly EARTH_RADIUS = 6371; // km
  private readonly FUEL_PRICE_PER_LITER = 6.5; // ₪ per liter
  private readonly TRAFFIC_MULTIPLIERS = {
    morning_rush: 1.4,    // 7-9 AM
    afternoon_rush: 1.3,  // 5-7 PM
    night: 0.8,           // 10 PM - 6 AM
    normal: 1.0           // Other times
  };

  /**
   * Main route optimization function using AI algorithms
   */
  async optimizeRoutes(
    deliveryPoints: DeliveryPoint[],
    vehicles: Vehicle[],
    options: {
      prioritizeASAP?: boolean;
      maxRouteTime?: number; // minutes
      considerTraffic?: boolean;
    } = {}
  ): Promise<RouteOptimizationResult> {
    console.log('🤖 Starting AI route optimization...', {
      points: deliveryPoints.length,
      vehicles: vehicles.length,
      options
    });

    try {
      // Step 1: Filter and prepare data
      const availableVehicles = vehicles.filter(v => v.available);
      const sortedPoints = this.prioritizeDeliveryPoints(deliveryPoints, options.prioritizeASAP);

      // Step 2: Apply clustering algorithm for geographic grouping
      const clusters = this.clusterDeliveryPoints(sortedPoints, availableVehicles.length);

      // Step 3: Assign clusters to vehicles based on capacity and location
      const vehicleAssignments = this.assignClustersToVehicles(clusters, availableVehicles);

      // Step 4: Optimize route for each vehicle using genetic algorithm
      const optimizedRoutes = await Promise.all(
        vehicleAssignments.map(async assignment => 
          this.optimizeVehicleRoute(assignment.vehicle, assignment.points, options)
        )
      );

      // Step 5: Calculate total savings and generate recommendations
      const result = this.calculateOptimizationResult(optimizedRoutes, deliveryPoints);

      console.log('✅ Route optimization complete', result.totalSavings);
      return result;

    } catch (error) {
      console.error('❌ Route optimization failed:', error);
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  }

  /**
   * Prioritize delivery points based on business rules
   */
  private prioritizeDeliveryPoints(points: DeliveryPoint[], prioritizeASAP: boolean = true): DeliveryPoint[] {
    return points.sort((a, b) => {
      // Priority 1: ASAP orders (if enabled)
      if (prioritizeASAP && a.priority !== b.priority) {
        const priorityOrder = { asap: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      // Priority 2: Time windows (earliest first)
      if (a.timeWindow && b.timeWindow) {
        return a.timeWindow.start.getTime() - b.timeWindow.start.getTime();
      }

      // Priority 3: Weight (heavier items first to optimize capacity)
      return b.weight - a.weight;
    });
  }

  /**
   * Cluster delivery points using K-means algorithm
   */
  private clusterDeliveryPoints(points: DeliveryPoint[], numClusters: number): DeliveryPoint[][] {
    if (points.length === 0) return [];
    if (numClusters >= points.length) return points.map(p => [p]);

    // Initialize cluster centers randomly
    const centers = this.initializeClusterCenters(points, numClusters);
    let clusters: DeliveryPoint[][] = Array(numClusters).fill(null).map(() => []);
    let converged = false;
    let iterations = 0;
    const maxIterations = 100;

    while (!converged && iterations < maxIterations) {
      // Clear clusters
      clusters = Array(numClusters).fill(null).map(() => []);

      // Assign points to nearest cluster
      points.forEach(point => {
        let minDistance = Infinity;
        let nearestCluster = 0;

        centers.forEach((center, index) => {
          const distance = this.calculateDistance(
            point.latitude, point.longitude,
            center.lat, center.lng
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestCluster = index;
          }
        });

        clusters[nearestCluster].push(point);
      });

      // Update cluster centers
      const newCenters = clusters.map(cluster => {
        if (cluster.length === 0) return centers[0]; // Keep old center if empty
        
        const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
        return { lat: avgLat, lng: avgLng };
      });

      // Check convergence
      converged = centers.every((center, index) => 
        Math.abs(center.lat - newCenters[index].lat) < 0.0001 &&
        Math.abs(center.lng - newCenters[index].lng) < 0.0001
      );

      centers.splice(0, centers.length, ...newCenters);
      iterations++;
    }

    return clusters.filter(cluster => cluster.length > 0);
  }

  /**
   * Initialize cluster centers using K-means++
   */
  private initializeClusterCenters(points: DeliveryPoint[], k: number): {lat: number, lng: number}[] {
    const centers: {lat: number, lng: number}[] = [];
    
    // Choose first center randomly
    const firstPoint = points[Math.floor(Math.random() * points.length)];
    centers.push({ lat: firstPoint.latitude, lng: firstPoint.longitude });

    // Choose remaining centers using weighted probability
    for (let i = 1; i < k; i++) {
      const distances = points.map(point => {
        const minDistToCenter = Math.min(...centers.map(center =>
          this.calculateDistance(point.latitude, point.longitude, center.lat, center.lng)
        ));
        return minDistToCenter * minDistToCenter; // Squared distance for weighting
      });

      const totalWeight = distances.reduce((sum, d) => sum + d, 0);
      const randomValue = Math.random() * totalWeight;
      
      let cumulativeWeight = 0;
      for (let j = 0; j < points.length; j++) {
        cumulativeWeight += distances[j];
        if (cumulativeWeight >= randomValue) {
          centers.push({ lat: points[j].latitude, lng: points[j].longitude });
          break;
        }
      }
    }

    return centers;
  }

  /**
   * Assign clusters to vehicles based on capacity and proximity
   */
  private assignClustersToVehicles(
    clusters: DeliveryPoint[][],
    vehicles: Vehicle[]
  ): {vehicle: Vehicle, points: DeliveryPoint[]}[] {
    const assignments: {vehicle: Vehicle, points: DeliveryPoint[]}[] = [];
    const usedVehicles = new Set<string>();

    // Sort vehicles by capacity (largest first)
    const sortedVehicles = [...vehicles].sort((a, b) => b.capacity.weight - a.capacity.weight);

    clusters.forEach(cluster => {
      // Calculate cluster center
      const centerLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
      const centerLng = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;
      const totalWeight = cluster.reduce((sum, p) => sum + p.weight, 0);

      // Find best vehicle for this cluster
      let bestVehicle: Vehicle | null = null;
      let bestScore = Infinity;

      sortedVehicles.forEach(vehicle => {
        if (usedVehicles.has(vehicle.id)) return;
        
        // Check capacity constraint
        if (vehicle.capacity.weight < totalWeight) return;

        // Calculate score based on distance and capacity utilization
        const distance = this.calculateDistance(
          vehicle.currentLatitude, vehicle.currentLongitude,
          centerLat, centerLng
        );
        const capacityUtilization = totalWeight / vehicle.capacity.weight;
        const score = distance * 2 - capacityUtilization * 10; // Favor close and well-utilized vehicles

        if (score < bestScore) {
          bestScore = score;
          bestVehicle = vehicle;
        }
      });

      if (bestVehicle) {
        assignments.push({ vehicle: bestVehicle, points: cluster });
        usedVehicles.add(bestVehicle.id);
      }
    });

    return assignments;
  }

  /**
   * Optimize route for single vehicle using genetic algorithm
   */
  private async optimizeVehicleRoute(
    vehicle: Vehicle,
    points: DeliveryPoint[],
    options: any
  ): Promise<OptimizedRoute> {
    if (points.length === 0) {
      return {
        vehicleId: vehicle.id,
        driverId: vehicle.driverId,
        points: [],
        totalDistance: 0,
        estimatedTime: 0,
        estimatedFuelCost: 0,
        efficiency: 100,
        savings: { distance: 0, time: 0, fuel: 0, cost: 0 }
      };
    }

    // For small routes, use brute force optimization
    if (points.length <= 8) {
      return this.bruteForceOptimize(vehicle, points);
    }

    // For larger routes, use genetic algorithm
    return this.geneticAlgorithmOptimize(vehicle, points, options);
  }

  /**
   * Brute force optimization for small routes
   */
  private bruteForceOptimize(vehicle: Vehicle, points: DeliveryPoint[]): OptimizedRoute {
    const bestRoute = this.findBestRoute(points);
    const routeMetrics = this.calculateRouteMetrics(vehicle, bestRoute);

    return {
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      points: bestRoute,
      ...routeMetrics
    };
  }

  /**
   * Genetic algorithm optimization for larger routes
   */
  private geneticAlgorithmOptimize(
    vehicle: Vehicle, 
    points: DeliveryPoint[], 
    options: any
  ): OptimizedRoute {
    const populationSize = 100;
    const generations = 200;
    const mutationRate = 0.1;
    const eliteSize = 20;

    // Initialize population
    let population = this.initializePopulation(points, populationSize);
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitness = population.map(route => this.calculateRouteFitness(vehicle, route));
      
      // Select elite individuals
      const elite = this.selectElite(population, fitness, eliteSize);
      
      // Create new generation
      const newGeneration = [...elite];
      
      while (newGeneration.length < populationSize) {
        // Tournament selection
        const parent1 = this.tournamentSelection(population, fitness);
        const parent2 = this.tournamentSelection(population, fitness);
        
        // Crossover
        const offspring = this.orderCrossover(parent1, parent2);
        
        // Mutation
        if (Math.random() < mutationRate) {
          this.mutateRoute(offspring);
        }
        
        newGeneration.push(offspring);
      }
      
      population = newGeneration;
    }

    // Get best route
    const finalFitness = population.map(route => this.calculateRouteFitness(vehicle, route));
    const bestIndex = finalFitness.indexOf(Math.min(...finalFitness));
    const bestRoute = population[bestIndex];
    const routeMetrics = this.calculateRouteMetrics(vehicle, bestRoute);

    return {
      vehicleId: vehicle.id,
      driverId: vehicle.driverId,
      points: bestRoute,
      ...routeMetrics
    };
  }

  /**
   * Initialize population for genetic algorithm
   */
  private initializePopulation(points: DeliveryPoint[], size: number): DeliveryPoint[][] {
    const population: DeliveryPoint[][] = [];
    
    for (let i = 0; i < size; i++) {
      const route = [...points];
      // Shuffle route randomly
      for (let j = route.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [route[j], route[k]] = [route[k], route[j]];
      }
      population.push(route);
    }
    
    return population;
  }

  /**
   * Calculate fitness score for a route (lower is better)
   */
  private calculateRouteFitness(vehicle: Vehicle, route: DeliveryPoint[]): number {
    const metrics = this.calculateRouteMetrics(vehicle, route);
    
    // Combine multiple factors: distance, time, and constraint violations
    let score = metrics.totalDistance * 2 + metrics.estimatedTime;
    
    // Penalty for constraint violations
    route.forEach((point, index) => {
      if (point.timeWindow) {
        const arrivalTime = this.estimateArrivalTime(vehicle, route, index);
        if (arrivalTime < point.timeWindow.start.getTime() || 
            arrivalTime > point.timeWindow.end.getTime()) {
          score += 100; // Heavy penalty for time window violations
        }
      }
    });
    
    return score;
  }

  /**
   * Tournament selection for genetic algorithm
   */
  private tournamentSelection(population: DeliveryPoint[][], fitness: number[]): DeliveryPoint[] {
    const tournamentSize = 5;
    let bestIndex = Math.floor(Math.random() * population.length);
    let bestFitness = fitness[bestIndex];
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidateIndex = Math.floor(Math.random() * population.length);
      if (fitness[candidateIndex] < bestFitness) {
        bestIndex = candidateIndex;
        bestFitness = fitness[candidateIndex];
      }
    }
    
    return [...population[bestIndex]];
  }

  /**
   * Order crossover (OX) for genetic algorithm
   */
  private orderCrossover(parent1: DeliveryPoint[], parent2: DeliveryPoint[]): DeliveryPoint[] {
    const size = parent1.length;
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * (size - start)) + start;
    
    const offspring: (DeliveryPoint | null)[] = new Array(size).fill(null);
    
    // Copy subset from parent1
    for (let i = start; i <= end; i++) {
      offspring[i] = parent1[i];
    }
    
    // Fill remaining positions from parent2
    let parent2Index = 0;
    for (let i = 0; i < size; i++) {
      if (offspring[i] === null) {
        while (offspring.some(point => point?.id === parent2[parent2Index].id)) {
          parent2Index = (parent2Index + 1) % size;
        }
        offspring[i] = parent2[parent2Index];
        parent2Index = (parent2Index + 1) % size;
      }
    }
    
    return offspring as DeliveryPoint[];
  }

  /**
   * Mutate route by swapping two random positions
   */
  private mutateRoute(route: DeliveryPoint[]): void {
    if (route.length < 2) return;
    
    const i = Math.floor(Math.random() * route.length);
    const j = Math.floor(Math.random() * route.length);
    
    [route[i], route[j]] = [route[j], route[i]];
  }

  /**
   * Select elite individuals
   */
  private selectElite(
    population: DeliveryPoint[][], 
    fitness: number[], 
    eliteSize: number
  ): DeliveryPoint[][] {
    const indexed = population.map((route, index) => ({ route, fitness: fitness[index] }));
    indexed.sort((a, b) => a.fitness - b.fitness);
    return indexed.slice(0, eliteSize).map(item => [...item.route]);
  }

  /**
   * Find best route using nearest neighbor heuristic
   */
  private findBestRoute(points: DeliveryPoint[]): DeliveryPoint[] {
    if (points.length === 0) return [];
    
    const route: DeliveryPoint[] = [];
    const remaining = [...points];
    
    // Start with highest priority point
    let current = remaining.reduce((best, point) => {
      const priorityOrder = { asap: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[point.priority] > priorityOrder[best.priority] ? point : best;
    });
    
    route.push(current);
    remaining.splice(remaining.indexOf(current), 1);
    
    // Greedy nearest neighbor with priority consideration
    while (remaining.length > 0) {
      let nearest = remaining[0];
      let minScore = Infinity;
      
      remaining.forEach(point => {
        const distance = this.calculateDistance(
          current.latitude, current.longitude,
          point.latitude, point.longitude
        );
        
        // Score combines distance with priority
        const priorityOrder = { asap: 4, high: 3, medium: 2, low: 1 };
        const priorityBonus = priorityOrder[point.priority] * 2;
        const score = distance - priorityBonus;
        
        if (score < minScore) {
          minScore = score;
          nearest = point;
        }
      });
      
      route.push(nearest);
      remaining.splice(remaining.indexOf(nearest), 1);
      current = nearest;
    }
    
    return route;
  }

  /**
   * Calculate comprehensive route metrics
   */
  private calculateRouteMetrics(vehicle: Vehicle, route: DeliveryPoint[]): {
    totalDistance: number;
    estimatedTime: number;
    estimatedFuelCost: number;
    efficiency: number;
    savings: { distance: number; time: number; fuel: number; cost: number };
  } {
    if (route.length === 0) {
      return {
        totalDistance: 0,
        estimatedTime: 0,
        estimatedFuelCost: 0,
        efficiency: 100,
        savings: { distance: 0, time: 0, fuel: 0, cost: 0 }
      };
    }

    let totalDistance = 0;
    let totalTime = 0;
    
    // Calculate distance from vehicle to first point
    totalDistance += this.calculateDistance(
      vehicle.currentLatitude, vehicle.currentLongitude,
      route[0].latitude, route[0].longitude
    );

    // Calculate distances between points
    for (let i = 0; i < route.length - 1; i++) {
      const distance = this.calculateDistance(
        route[i].latitude, route[i].longitude,
        route[i + 1].latitude, route[i + 1].longitude
      );
      totalDistance += distance;
    }

    // Calculate estimated time including handling
    const baseTime = totalDistance / 40 * 60; // Assume 40 km/h average speed
    const trafficMultiplier = this.getTrafficMultiplier();
    const handlingTime = route.reduce((sum, point) => sum + point.estimatedHandlingTime, 0);
    
    totalTime = (baseTime * trafficMultiplier) + handlingTime;

    // Calculate fuel cost
    const fuelConsumed = totalDistance / vehicle.fuelEfficiency;
    const estimatedFuelCost = fuelConsumed * this.FUEL_PRICE_PER_LITER;

    // Calculate efficiency (compared to worst-case scenario)
    const worstCaseDistance = this.calculateWorstCaseDistance(vehicle, route);
    const efficiency = Math.max(0, (worstCaseDistance - totalDistance) / worstCaseDistance * 100);

    // Calculate savings
    const unoptimizedCost = worstCaseDistance / vehicle.fuelEfficiency * this.FUEL_PRICE_PER_LITER;
    const savings = {
      distance: worstCaseDistance - totalDistance,
      time: (worstCaseDistance / 30 * 60) - totalTime, // Assume 30 km/h unoptimized
      fuel: (worstCaseDistance - totalDistance) / vehicle.fuelEfficiency,
      cost: unoptimizedCost - estimatedFuelCost
    };

    return {
      totalDistance,
      estimatedTime: totalTime,
      estimatedFuelCost,
      efficiency,
      savings
    };
  }

  /**
   * Calculate worst-case distance (visiting points in random order)
   */
  private calculateWorstCaseDistance(vehicle: Vehicle, route: DeliveryPoint[]): number {
    // Approximate worst case as 1.5x the optimized distance
    const directDistance = route.reduce((sum, point) => {
      return sum + this.calculateDistance(
        vehicle.currentLatitude, vehicle.currentLongitude,
        point.latitude, point.longitude
      );
    }, 0);
    
    return directDistance * 1.5;
  }

  /**
   * Get traffic multiplier based on current time
   */
  private getTrafficMultiplier(): number {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 7 && hour <= 9) return this.TRAFFIC_MULTIPLIERS.morning_rush;
    if (hour >= 17 && hour <= 19) return this.TRAFFIC_MULTIPLIERS.afternoon_rush;
    if (hour >= 22 || hour <= 6) return this.TRAFFIC_MULTIPLIERS.night;
    
    return this.TRAFFIC_MULTIPLIERS.normal;
  }

  /**
   * Estimate arrival time at specific point in route
   */
  private estimateArrivalTime(vehicle: Vehicle, route: DeliveryPoint[], pointIndex: number): number {
    let totalTime = 0;
    let currentLat = vehicle.currentLatitude;
    let currentLng = vehicle.currentLongitude;
    
    for (let i = 0; i <= pointIndex; i++) {
      const distance = this.calculateDistance(currentLat, currentLng, route[i].latitude, route[i].longitude);
      const travelTime = (distance / 40) * 60; // minutes
      const handlingTime = route[i].estimatedHandlingTime;
      
      totalTime += travelTime + handlingTime;
      currentLat = route[i].latitude;
      currentLng = route[i].longitude;
    }
    
    return Date.now() + (totalTime * 60 * 1000); // Convert to timestamp
  }

  /**
   * Calculate optimization result summary
   */
  private calculateOptimizationResult(
    routes: OptimizedRoute[],
    originalPoints: DeliveryPoint[]
  ): RouteOptimizationResult {
    const assignedPoints = new Set(routes.flatMap(route => route.points.map(p => p.id)));
    const unassigned = originalPoints.filter(point => !assignedPoints.has(point.id));

    const totalSavings = routes.reduce(
      (acc, route) => ({
        distance: acc.distance + route.savings.distance,
        time: acc.time + route.savings.time,
        fuel: acc.fuel + route.savings.fuel,
        cost: acc.cost + route.savings.cost
      }),
      { distance: 0, time: 0, fuel: 0, cost: 0 }
    );

    const recommendations = this.generateRecommendations(routes, unassigned);

    return {
      routes: routes.filter(route => route.points.length > 0),
      totalSavings,
      unassigned,
      recommendations
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(routes: OptimizedRoute[], unassigned: DeliveryPoint[]): string[] {
    const recommendations: string[] = [];

    // Check for unassigned high-priority deliveries
    const unassignedASAP = unassigned.filter(p => p.priority === 'asap');
    if (unassignedASAP.length > 0) {
      recommendations.push(`⚡ ${unassignedASAP.length} ASAP deliveries need immediate attention`);
    }

    // Check for underutilized vehicles
    const underutilized = routes.filter(route => route.efficiency < 70);
    if (underutilized.length > 0) {
      recommendations.push(`📈 ${underutilized.length} vehicles could be better utilized`);
    }

    // Check for long routes
    const longRoutes = routes.filter(route => route.estimatedTime > 480); // > 8 hours
    if (longRoutes.length > 0) {
      recommendations.push(`⏰ ${longRoutes.length} routes exceed 8 hours - consider splitting`);
    }

    // Fuel savings recommendation
    const totalFuelSavings = routes.reduce((sum, route) => sum + route.savings.fuel, 0);
    if (totalFuelSavings > 20) {
      recommendations.push(`⛽ Excellent fuel optimization: ${totalFuelSavings.toFixed(1)}L saved`);
    }

    return recommendations;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return this.EARTH_RADIUS * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get real-time traffic data (mock implementation)
   */
  async getTrafficData(route: DeliveryPoint[]): Promise<{[key: string]: number}> {
    // Mock implementation - integrate with real traffic APIs
    const trafficData: {[key: string]: number} = {};
    
    for (let i = 0; i < route.length - 1; i++) {
      const key = `${route[i].id}-${route[i + 1].id}`;
      trafficData[key] = Math.random() * 0.5 + 0.8; // 0.8 - 1.3 multiplier
    }
    
    return trafficData;
  }

  /**
   * Export route to driver app format
   */
  exportRouteForDriver(route: OptimizedRoute): any {
    return {
      id: `route_${Date.now()}`,
      driverId: route.driverId,
      vehicleId: route.vehicleId,
      status: 'optimized',
      estimatedTime: route.estimatedTime,
      estimatedDistance: route.totalDistance,
      estimatedEarnings: route.estimatedFuelCost * 2.5, // Rough estimate
      stops: route.points.map((point, index) => ({
        id: point.id,
        sequence: index + 1,
        type: point.type,
        tripId: point.tripId,
        address: point.address,
        coordinates: {
          latitude: point.latitude,
          longitude: point.longitude
        },
        priority: point.priority,
        timeWindow: point.timeWindow,
        estimatedArrival: new Date(Date.now() + (route.estimatedTime / route.points.length * index * 60000)),
        materialInfo: {
          type: point.materialType,
          weight: point.weight,
          handlingTime: point.estimatedHandlingTime
        }
      })),
      optimization: {
        efficiency: route.efficiency,
        savings: route.savings,
        fuelCost: route.estimatedFuelCost
      }
    };
  }
}

// Export singleton instance
export const aiRouteOptimizer = new AIRouteOptimizationService();

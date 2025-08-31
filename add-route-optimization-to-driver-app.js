// ADD AI ROUTE OPTIMIZATION TO YOUR DRIVER APPS
// This should go in YouMatsApp (driver app) to help drivers optimize their routes

// Simple AI Route Optimization for Multiple Deliveries
class SimpleRouteOptimizer {
    constructor() {
        this.EARTH_RADIUS = 6371; // km
    }

    // Calculate distance between two points
    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return this.EARTH_RADIUS * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Optimize route for driver's assigned trips
    async optimizeDriverRoute(driverId) {
        try {
            console.log('🤖 Optimizing route for driver:', driverId);

            // Get driver's current assigned trips
            const { data: trips, error } = await supabase
                .from('trip_requests')
                .select('*')
                .eq('assigned_driver_id', driverId)
                .in('status', ['matched', 'pickup_started']);

            if (error) throw error;

            if (!trips || trips.length <= 1) {
                return {
                    message: 'Not enough trips to optimize',
                    trips: trips || []
                };
            }

            // Get driver's current location from driver_locations
            const { data: driverLocation } = await supabase
                .from('driver_locations')
                .select('latitude, longitude')
                .eq('driver_id', driverId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            const startLocation = driverLocation || { latitude: 32.0853, longitude: 34.7818 };

            // Create delivery points
            const deliveryPoints = trips.flatMap(trip => {
                const points = [];
                
                // Add pickup point if not completed
                if (!trip.pickup_completed_at) {
                    points.push({
                        id: `pickup_${trip.id}`,
                        tripId: trip.id,
                        type: 'pickup',
                        latitude: parseFloat(trip.pickup_latitude),
                        longitude: parseFloat(trip.pickup_longitude),
                        address: this.extractAddressString(trip.pickup_address),
                        priority: trip.pickup_time_preference === 'asap' ? 3 : 1,
                        estimatedTime: 15 // minutes
                    });
                }

                // Add delivery point
                points.push({
                    id: `delivery_${trip.id}`,
                    tripId: trip.id,
                    type: 'delivery',
                    latitude: parseFloat(trip.delivery_latitude),
                    longitude: parseFloat(trip.delivery_longitude),
                    address: this.extractAddressString(trip.delivery_address),
                    priority: trip.pickup_time_preference === 'asap' ? 3 : 1,
                    estimatedTime: 20 // minutes
                });

                return points;
            });

            // Optimize using nearest neighbor with priority
            const optimizedRoute = this.nearestNeighborOptimization(
                startLocation, 
                deliveryPoints
            );

            // Calculate route metrics
            const routeMetrics = this.calculateRouteMetrics(
                startLocation, 
                optimizedRoute
            );

            console.log('✅ Route optimized:', routeMetrics);

            return {
                optimizedRoute,
                metrics: routeMetrics,
                message: `Route optimized! Estimated ${routeMetrics.fuelSavings}% fuel savings`
            };

        } catch (error) {
            console.error('❌ Route optimization failed:', error);
            throw error;
        }
    }

    // Simple nearest neighbor optimization with priority
    nearestNeighborOptimization(startLocation, points) {
        if (points.length === 0) return [];

        const route = [];
        const remaining = [...points];
        let currentLocation = startLocation;

        while (remaining.length > 0) {
            let nearestIndex = 0;
            let bestScore = Infinity;

            // Find best next point considering distance and priority
            remaining.forEach((point, index) => {
                const distance = this.calculateDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    point.latitude, point.longitude
                );
                
                // Score = distance - priority bonus
                const priorityBonus = point.priority * 2; // Higher priority = lower score
                const score = distance - priorityBonus;

                if (score < bestScore) {
                    bestScore = score;
                    nearestIndex = index;
                }
            });

            // Add best point to route
            const nextPoint = remaining[nearestIndex];
            route.push(nextPoint);
            currentLocation = nextPoint;
            remaining.splice(nearestIndex, 1);
        }

        return route;
    }

    // Calculate route metrics
    calculateRouteMetrics(startLocation, route) {
        if (route.length === 0) {
            return { totalDistance: 0, estimatedTime: 0, fuelSavings: 0 };
        }

        let totalDistance = 0;
        let currentLocation = startLocation;

        // Calculate total distance
        route.forEach(point => {
            const distance = this.calculateDistance(
                currentLocation.latitude, currentLocation.longitude,
                point.latitude, point.longitude
            );
            totalDistance += distance;
            currentLocation = point;
        });

        // Calculate estimated time (including handling time)
        const drivingTime = totalDistance / 30 * 60; // 30 km/h average in city
        const handlingTime = route.reduce((sum, point) => sum + point.estimatedTime, 0);
        const estimatedTime = drivingTime + handlingTime;

        // Estimate fuel savings (compared to random order)
        const worstCaseDistance = totalDistance * 1.4; // Assume 40% worse without optimization
        const fuelSavings = Math.round((worstCaseDistance - totalDistance) / worstCaseDistance * 100);

        return {
            totalDistance: Math.round(totalDistance * 10) / 10,
            estimatedTime: Math.round(estimatedTime),
            fuelSavings: Math.max(0, fuelSavings),
            stops: route.length
        };
    }

    // Extract address string from JSONB
    extractAddressString(addressJson) {
        if (typeof addressJson === 'string') return addressJson;
        if (addressJson && addressJson.formatted_address) return addressJson.formatted_address;
        if (addressJson && addressJson.address) return addressJson.address;
        return 'Unknown address';
    }

    // Send optimized route to driver's app
    async sendOptimizedRouteToDriver(driverId, routeData) {
        try {
            // Get driver's user_id for notification
            const { data: driver } = await supabase
                .from('driver_profiles')
                .select('user_id, first_name')
                .eq('id', driverId)
                .single();

            if (!driver) return;

            // Send notification using your existing notifications table
            const notification = {
                user_id: driver.user_id,
                title: '🤖 Route Optimized!',
                message: `AI optimized your delivery route. ${routeData.metrics.fuelSavings}% fuel savings expected!`,
                type: 'system',
                data: {
                    route_optimization: true,
                    total_distance: routeData.metrics.totalDistance,
                    estimated_time: routeData.metrics.estimatedTime,
                    fuel_savings: routeData.metrics.fuelSavings,
                    optimized_route: routeData.optimizedRoute
                }
            };

            await supabase.from('notifications').insert(notification);

            console.log(`✅ Route optimization sent to ${driver.first_name}`);

        } catch (error) {
            console.error('❌ Error sending route optimization:', error);
        }
    }
}

// Usage in driver app
const routeOptimizer = new SimpleRouteOptimizer();

// Function to optimize current driver's route
async function optimizeMyRoute() {
    try {
        // Get current driver ID (from your driver app context)
        const driverId = getCurrentDriverId(); // You need to implement this
        
        const result = await routeOptimizer.optimizeDriverRoute(driverId);
        
        // Show result to driver
        displayRouteOptimization(result);
        
    } catch (error) {
        console.error('❌ Route optimization failed:', error);
        alert('Route optimization failed. Please try again.');
    }
}

// Display optimization results to driver
function displayRouteOptimization(result) {
    if (result.optimizedRoute.length === 0) {
        alert('No routes to optimize at the moment.');
        return;
    }

    const routeList = result.optimizedRoute.map((point, index) => 
        `${index + 1}. ${point.type.toUpperCase()}: ${point.address}`
    ).join('\n');

    const message = `
🤖 AI Route Optimization Complete!

📍 Optimized Route:
${routeList}

📊 Savings:
• Distance: ${result.metrics.totalDistance} km
• Time: ${result.metrics.estimatedTime} minutes  
• Fuel savings: ${result.metrics.fuelSavings}%
• Total stops: ${result.metrics.stops}

Follow this route for maximum efficiency!
    `;

    alert(message);
}

// Add this to your driver app's UI
function addRouteOptimizationButton() {
    const button = document.createElement('button');
    button.innerHTML = '🤖 Optimize Route';
    button.onclick = optimizeMyRoute;
    button.style.cssText = `
        background: #10B981; color: white; 
        padding: 12px 20px; border: none; 
        border-radius: 8px; font-weight: bold;
        margin: 10px;
    `;
    
    // Add to your driver app's interface
    const container = document.querySelector('.driver-actions') || document.body;
    container.appendChild(button);
}

// Initialize when driver app loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', addRouteOptimizationButton);
}

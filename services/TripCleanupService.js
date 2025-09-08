// Professional Trip Cleanup Service
// This service runs automatically to clean up expired trips

const { createClient } = require('@supabase/supabase-js');

class TripCleanupService {
  constructor() {
    this.supabase = createClient(
      'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
    );
    
    this.isRunning = false;
    this.intervalId = null;
    this.cleanupIntervalMinutes = 15; // Run every 15 minutes
  }

  async start() {
    if (this.isRunning) {
      console.log('🔄 Trip cleanup service is already running');
      return;
    }

    console.log('🚀 Starting Professional Trip Cleanup Service');
    console.log(`⏰ Cleanup interval: ${this.cleanupIntervalMinutes} minutes`);
    
    this.isRunning = true;
    
    // Run initial cleanup
    await this.performCleanup();
    
    // Schedule recurring cleanup
    this.intervalId = setInterval(async () => {
      await this.performCleanup();
    }, this.cleanupIntervalMinutes * 60 * 1000);
    
    console.log('✅ Trip cleanup service started successfully');
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⏹️ Trip cleanup service is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Trip cleanup service stopped');
  }

  async performCleanup() {
    try {
      console.log(`\n🧹 [${new Date().toISOString()}] Starting trip cleanup...`);
      
      // 1. Get statistics before cleanup
      const beforeStats = await this.getTripStatistics();
      console.log('📊 Before cleanup:', this.formatStatistics(beforeStats));
      
      // 2. Identify problematic trips
      const problematicTrips = await this.identifyProblematicTrips();
      if (problematicTrips.length > 0) {
        console.log(`⚠️ Found ${problematicTrips.length} problematic trips`);
        this.logProblematicTrips(problematicTrips);
      }
      
      // 3. Perform automatic cleanup
      const cleanupResult = await this.executeCleanup();
      console.log('🔧 Cleanup result:', cleanupResult);
      
      // 4. Get statistics after cleanup
      const afterStats = await this.getTripStatistics();
      console.log('📊 After cleanup:', this.formatStatistics(afterStats));
      
      // 5. Log summary
      this.logCleanupSummary(beforeStats, afterStats, cleanupResult);
      
    } catch (error) {
      console.error('💥 Error in trip cleanup:', error);
    }
  }

  async getTripStatistics() {
    try {
      const { data, error } = await this.supabase.rpc('get_trip_statistics');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting trip statistics:', error);
      return [];
    }
  }

  async identifyProblematicTrips() {
    try {
      const { data, error } = await this.supabase.rpc('identify_problematic_trips');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error identifying problematic trips:', error);
      return [];
    }
  }

  async executeCleanup() {
    try {
      const { data, error } = await this.supabase.rpc('cleanup_expired_trips');
      if (error) throw error;
      return data?.[0] || { trips_expired: 0, pending_expired: 0, matched_expired: 0 };
    } catch (error) {
      console.error('Error executing cleanup:', error);
      return { trips_expired: 0, pending_expired: 0, matched_expired: 0, error: error.message };
    }
  }

  async emergencyCleanup() {
    console.log('🚨 Performing EMERGENCY cleanup...');
    try {
      const { data, error } = await this.supabase.rpc('emergency_trip_cleanup');
      if (error) throw error;
      
      console.log('🚨 Emergency cleanup results:');
      data?.forEach(result => {
        console.log(`   ${result.action}: ${result.affected_trips} trips - ${result.details}`);
      });
      
      return data;
    } catch (error) {
      console.error('💥 Emergency cleanup failed:', error);
      return null;
    }
  }

  formatStatistics(stats) {
    return stats.map(stat => 
      `${stat.status}: ${stat.count} (avg: ${stat.avg_age_hours}h)`
    ).join(', ');
  }

  logProblematicTrips(trips) {
    const problemCounts = {};
    trips.forEach(trip => {
      problemCounts[trip.problem_type] = (problemCounts[trip.problem_type] || 0) + 1;
    });
    
    console.log('   Problem breakdown:', Object.entries(problemCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', '));
  }

  logCleanupSummary(before, after, cleanupResult) {
    const visibleBefore = before.filter(s => 
      ['pending', 'matched', 'accepted', 'picked_up', 'in_transit'].includes(s.status)
    ).reduce((sum, s) => sum + parseInt(s.count), 0);
    
    const visibleAfter = after.filter(s => 
      ['pending', 'matched', 'accepted', 'picked_up', 'in_transit'].includes(s.status)
    ).reduce((sum, s) => sum + parseInt(s.count), 0);
    
    console.log(`📈 Cleanup Summary:`);
    console.log(`   Visible trips: ${visibleBefore} → ${visibleAfter} (${visibleAfter - visibleBefore})`);
    console.log(`   Expired: ${cleanupResult.trips_expired || 0} trips`);
    console.log(`   (${cleanupResult.pending_expired || 0} pending + ${cleanupResult.matched_expired || 0} matched)`);
  }

  // Method to integrate with existing DriverService
  static async integrateWithDriverService() {
    console.log('🔌 Integrating Trip Cleanup with DriverService...');
    
    // This can be called from DriverService initialization
    const cleanupService = new TripCleanupService();
    await cleanupService.start();
    
    return cleanupService;
  }

  // Method for manual cleanup (can be called from admin panel)
  async manualCleanup() {
    console.log('👨‍💼 Manual cleanup requested...');
    await this.performCleanup();
  }

  // Health check method
  async healthCheck() {
    const stats = await this.getTripStatistics();
    const problematic = await this.identifyProblematicTrips();
    
    return {
      service_running: this.isRunning,
      cleanup_interval_minutes: this.cleanupIntervalMinutes,
      total_trips: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
      problematic_trips: problematic.length,
      last_cleanup: new Date().toISOString(),
      status: problematic.length > 10 ? 'WARNING' : 'HEALTHY'
    };
  }
}

module.exports = TripCleanupService;

// If running directly, start the service
if (require.main === module) {
  const service = new TripCleanupService();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down trip cleanup service...');
    await service.stop();
    process.exit(0);
  });
  
  service.start().catch(console.error);
}

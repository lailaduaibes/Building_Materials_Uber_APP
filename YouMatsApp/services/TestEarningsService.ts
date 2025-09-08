import { driverEarningsService } from './DriverEarningsService';

/**
 * ADD TEST EARNINGS DATA FOR CURRENT DRIVER
 * This function creates sample earnings data for testing the earnings screen
 * Call this from the app to populate earnings data
 */
export const addTestEarningsForDriver = async (driverId: string) => {
  console.log('💰 Adding test earnings for driver:', driverId);
  
  try {
    // Today's earnings (2 trips)
    await driverEarningsService.recordTripEarnings(
      driverId,
      'test-trip-today-1',
      45.00,
      5.00, // tip
      0 // bonus
    );
    
    await driverEarningsService.recordTripEarnings(
      driverId,
      'test-trip-today-2',
      68.50,
      8.50, // tip
      2.00 // bonus
    );
    
    // Yesterday's earnings (1 trip) - mark as paid
    const yesterdayEarning = await driverEarningsService.recordTripEarnings(
      driverId,
      'test-trip-yesterday-1',
      52.00,
      6.00,
      0
    );
    
    if (yesterdayEarning) {
      // Mark as paid (simulate payout)
      await driverEarningsService.markEarningsAsPaidOut(driverId, [yesterdayEarning.id]);
    }
    
    // This week's earnings (2 more trips) - mark as paid
    const weekEarning1 = await driverEarningsService.recordTripEarnings(
      driverId,
      'test-trip-week-1',
      89.75,
      15.50,
      5.00
    );
    
    const weekEarning2 = await driverEarningsService.recordTripEarnings(
      driverId,
      'test-trip-week-2',
      41.50,
      4.00,
      0
    );
    
    if (weekEarning1 && weekEarning2) {
      // Mark as paid
      await driverEarningsService.markEarningsAsPaidOut(driverId, [weekEarning1.id, weekEarning2.id]);
    }
    
    console.log('✅ Test earnings data added successfully!');
    console.log('📊 Expected totals:');
    console.log('- Today: $111.97 (2 trips, pending)');
    console.log('- Yesterday: $50.20 (1 trip, paid)');
    console.log('- This week: $96.79 + $39.27 = $136.06 (2 trips, paid)');
    console.log('- Available for cash out: $111.97');
    
    return true;
  } catch (error) {
    console.error('❌ Error adding test earnings:', error);
    return false;
  }
};

/**
 * REMOVE ALL TEST EARNINGS FOR DRIVER
 * Clean up test data if needed
 */
export const removeTestEarningsForDriver = async (driverId: string) => {
  console.log('🧹 Removing test earnings for driver:', driverId);
  
  try {
    // Note: This would need a custom method in DriverEarningsService
    // For now, we'll just log the intent
    console.log('⚠️ Manual cleanup needed: Remove trips starting with "test-trip-" for driver:', driverId);
    return true;
  } catch (error) {
    console.error('❌ Error removing test earnings:', error);
    return false;
  }
};

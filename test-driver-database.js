/**
 * Quick test to verify database connectivity and trip requests
 */

// Test database connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test trip_requests table
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(5);
    
    if (tripsError) {
      console.error('❌ Error fetching trip requests:', tripsError);
    } else {
      console.log('✅ Trip requests found:', trips?.length || 0);
      console.log('Trip requests:', trips);
    }

    // Test driver_profiles table
    const { data: drivers, error: driversError } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(5);
    
    if (driversError) {
      console.error('❌ Error fetching driver profiles:', driversError);
    } else {
      console.log('✅ Driver profiles found:', drivers?.length || 0);
      console.log('Driver profiles:', drivers);
    }

    // Test trip_tracking table
    const { data: tracking, error: trackingError } = await supabase
      .from('trip_tracking')
      .select('*')
      .limit(5);
    
    if (trackingError) {
      console.error('❌ Error fetching trip tracking:', trackingError);
    } else {
      console.log('✅ Trip tracking records found:', tracking?.length || 0);
      console.log('Trip tracking:', tracking);
    }

    // Test driver_locations table (new table)
    const { data: locations, error: locationsError } = await supabase
      .from('driver_locations')
      .select('*')
      .limit(5);
    
    if (locationsError) {
      console.error('❌ Error fetching driver locations:', locationsError);
    } else {
      console.log('✅ Driver locations found:', locations?.length || 0);
      console.log('Driver locations:', locations);
    }

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

// Run the test
testDatabaseConnection();

console.log('📱 YouMats Driver App Database Test Complete');
console.log('🚗 The driver app should now show real data from the database');
console.log('📋 If no orders appear, it means there are no pending trip requests in the database');
console.log('🔧 Create some trip requests from the customer app to test the driver app functionality');

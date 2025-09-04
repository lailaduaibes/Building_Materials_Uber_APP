/**
 * Analyze Trip Requests Table Structure
 * This will examine the current table structure before making any changes
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTripRequestsTable() {
  console.log('🔍 Analyzing trip_requests Table Structure...\n');

  try {
    // 1. Get all columns in trip_requests table
    console.log('📋 1. CURRENT TRIP_REQUESTS TABLE COLUMNS');
    console.log('=' .repeat(60));

    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
      .eq('table_name', 'trip_requests')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (columns && columns.length > 0) {
      console.log(`Found ${columns.length} columns in trip_requests table:`);
      columns.forEach((col, index) => {
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        if (col.column_default) {
          console.log(`    Default: ${col.column_default}`);
        }
      });
    } else {
      console.log('❌ Could not fetch columns or table not found:', columnError);
    }

    // 2. Check for specific ASAP-related columns we might need
    console.log('\n🎯 2. CHECKING FOR ASAP-RELATED COLUMNS');
    console.log('=' .repeat(60));

    const asapColumns = [
      'assigned_driver_id',
      'current_assigned_driver_id', 
      'current_driver_position',
      'total_drivers_queued',
      'driver_response_deadline',
      'drivers_tried',
      'matching_started_at',
      'acceptance_deadline',
      'original_trip_id',
      'driver_request_sent_at',
      'status'
    ];

    const existingColumns = columns ? columns.map(col => col.column_name) : [];
    
    asapColumns.forEach(colName => {
      const exists = existingColumns.includes(colName);
      console.log(`   ${exists ? '✅' : '❌'} ${colName.padEnd(30)} ${exists ? 'EXISTS' : 'MISSING'}`);
    });

    // 3. Check current data sample
    console.log('\n📊 3. CURRENT TRIP DATA SAMPLE');
    console.log('=' .repeat(60));

    const { data: sampleTrips, error: sampleError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, assigned_driver_id, original_trip_id, matching_started_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sampleTrips && sampleTrips.length > 0) {
      console.log(`Recent ${sampleTrips.length} trips:`);
      sampleTrips.forEach(trip => {
        console.log(`\n🚛 Trip ${trip.id.substring(0, 8)}:`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Type: ${trip.pickup_time_preference}`);
        console.log(`   Assigned Driver: ${trip.assigned_driver_id ? trip.assigned_driver_id.substring(0, 8) : 'None'}`);
        console.log(`   Original Trip: ${trip.original_trip_id ? trip.original_trip_id.substring(0, 8) : 'Main Trip'}`);
        console.log(`   Matching Started: ${trip.matching_started_at || 'No'}`);
        console.log(`   Created: ${trip.created_at}`);
      });
    } else {
      console.log('❌ No trips found or query failed:', sampleError);
    }

    // 4. Check table constraints and foreign keys
    console.log('\n🔗 4. TABLE CONSTRAINTS AND FOREIGN KEYS');
    console.log('=' .repeat(60));

    try {
      const { data: constraints, error: constraintError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', 'trip_requests')
        .eq('table_schema', 'public');

      if (constraints && constraints.length > 0) {
        console.log('Table constraints:');
        constraints.forEach(constraint => {
          console.log(`   ${constraint.constraint_type}: ${constraint.constraint_name}`);
        });
      } else {
        console.log('❌ Could not fetch constraints');
      }
    } catch (err) {
      console.log('⚠️ Constraint query not available');
    }

    // 5. Check indexes
    console.log('\n📇 5. TABLE INDEXES');
    console.log('=' .repeat(60));

    try {
      const { data: indexes, error: indexError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('tablename', 'trip_requests')
        .eq('schemaname', 'public');

      if (indexes && indexes.length > 0) {
        console.log('Table indexes:');
        indexes.forEach(index => {
          console.log(`   ${index.indexname}`);
          console.log(`      ${index.indexdef}`);
        });
      } else {
        console.log('❌ Could not fetch indexes');
      }
    } catch (err) {
      console.log('⚠️ Index query not available');
    }

    // 6. Analyze current ASAP trip patterns
    console.log('\n🔍 6. ASAP TRIP PATTERNS ANALYSIS');
    console.log('=' .repeat(60));

    const { data: asapStats, error: statsError } = await supabase
      .from('trip_requests')
      .select('status, pickup_time_preference')
      .eq('pickup_time_preference', 'asap')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (asapStats) {
      const statusCounts = {};
      asapStats.forEach(trip => {
        statusCounts[trip.status] = (statusCounts[trip.status] || 0) + 1;
      });

      console.log(`ASAP trips in last 7 days: ${asapStats.length}`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} trips`);
      });
    }

    // 7. Recommendations based on analysis
    console.log('\n💡 7. RECOMMENDATIONS FOR UBER-STYLE IMPLEMENTATION');
    console.log('=' .repeat(60));

    const missingColumns = asapColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('📝 Columns that need to be added:');
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.log('✅ All required columns already exist!');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Review the existing column structure above');
    console.log('2. Check if any columns need to be added for Uber-style system');
    console.log('3. Ensure existing data patterns are compatible');
    console.log('4. Plan the migration strategy accordingly');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Execute the analysis
analyzeTripRequestsTable().then(() => {
  console.log('\n✅ Table analysis complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Analysis failed:', err);
  process.exit(1);
});

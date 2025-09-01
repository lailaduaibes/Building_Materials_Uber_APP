// Check truck types and create complete mapping
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTruckTypes() {
  try {
    console.log('🚛 Checking all truck types in database...\n');
    
    const { data: truckTypes, error } = await serviceSupabase
      .from('truck_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching truck types:', error);
      return;
    }

    console.log('📋 Available Truck Types:');
    console.log('========================\n');
    
    truckTypes.forEach((type, index) => {
      console.log(`${index + 1}. ID: ${type.id}`);
      console.log(`   Name: ${type.name}`);
      console.log(`   Description: ${type.description || 'N/A'}`);
      console.log(`   Max Payload: ${type.max_payload_kg || 'N/A'}kg`);
      console.log(`   Max Volume: ${type.max_volume_m3 || 'N/A'}m³`);
      console.log('   ---');
    });

    console.log('\n🔧 Generating Complete Truck Type Mapping:\n');
    
    const mapping = {};
    truckTypes.forEach(type => {
      // Create multiple possible names for each type
      const baseName = type.name;
      mapping[baseName] = type.id;
      
      // Add variations
      if (baseName.includes('Small')) {
        mapping['Small Truck'] = type.id;
        mapping['small_truck'] = type.id;
      }
      if (baseName.includes('Medium')) {
        mapping['Medium Truck'] = type.id;
        mapping['medium_truck'] = type.id;
      }
      if (baseName.includes('Large')) {
        mapping['Large Truck'] = type.id;
        mapping['large_truck'] = type.id;
      }
      if (baseName.includes('Heavy')) {
        mapping['Heavy Truck'] = type.id;
        mapping['heavy_truck'] = type.id;
      }
      if (baseName.includes('Flatbed')) {
        mapping['Flatbed Truck'] = type.id;
        mapping['flatbed_truck'] = type.id;
      }
      if (baseName.includes('Dump')) {
        mapping['Dump Truck'] = type.id;
        mapping['dump_truck'] = type.id;
      }
      if (baseName.includes('Crane')) {
        mapping['Crane Truck'] = type.id;
        mapping['crane_truck'] = type.id;
      }
      if (baseName.includes('Concrete')) {
        mapping['Concrete Mixer'] = type.id;
        mapping['concrete_mixer'] = type.id;
      }
      if (baseName.includes('Box')) {
        mapping['Box Truck'] = type.id;
        mapping['box_truck'] = type.id;
      }
      if (baseName.includes('Refrigerated')) {
        mapping['Refrigerated Truck'] = type.id;
        mapping['refrigerated_truck'] = type.id;
      }
    });

    console.log('const truckTypeMapping = {');
    Object.entries(mapping).forEach(([name, id]) => {
      console.log(`  '${name}': '${id}',`);
    });
    console.log('};');

    console.log('\n🎉 Complete mapping generated!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTruckTypes();

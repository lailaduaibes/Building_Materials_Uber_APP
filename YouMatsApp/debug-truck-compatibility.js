// Debug script to test truck type compatibility
const debugTruckCompatibility = () => {
  console.log('🧪 Testing truck type compatibility logic...');
  
  // Simulate the data from your log
  const requiredTruckType = { name: 'Small Truck' }; // Database truck type name
  const driverPreferredTypes = ['small_truck']; // Driver's stored preferences
  
  const truckTypeMapping = {
    'Small Truck': ['small_truck', 'Small Truck (up to 3.5t)', 'small'],
    'Medium Truck': ['medium_truck', 'Medium Truck (3.5-7.5t)', 'medium'],
    'Large Truck': ['large_truck', 'Large Truck (7.5-18t)', 'large'],
    'Heavy Truck': ['heavy_truck', 'Heavy Truck (18t+)', 'heavy'],
    'Flatbed Truck': ['flatbed_truck', 'Flatbed Truck', 'flatbed'],
    'Dump Truck': ['dump_truck', 'Dump Truck', 'dump'],
    'Concrete Mixer': ['concrete_mixer', 'Concrete Mixer', 'mixer'],
    'Crane Truck': ['crane_truck', 'Crane Truck', 'crane'],
    'Box Truck': ['box_truck', 'Box Truck', 'box'],
    'Refrigerated Truck': ['refrigerated_truck', 'Refrigerated Truck', 'refrigerated']
  };

  let isCompatible = false;
  const requiredTruckTypeName = requiredTruckType.name;
  
  console.log('📊 Testing compatibility:');
  console.log('   Required:', requiredTruckTypeName);
  console.log('   Driver has:', driverPreferredTypes);
  
  // Direct match first
  if (driverPreferredTypes.includes(requiredTruckTypeName)) {
    isCompatible = true;
    console.log('✅ Direct match found!');
  } else {
    console.log('❌ No direct match, checking mapping...');
    
    // Check using mapping
    for (const [dbName, variations] of Object.entries(truckTypeMapping)) {
      console.log(`   Checking ${dbName}: [${variations.join(', ')}]`);
      
      if (requiredTruckTypeName === dbName || variations.includes(requiredTruckTypeName)) {
        console.log(`   ✓ ${requiredTruckTypeName} matches category ${dbName}`);
        
        // Check if driver has any of these variations
        const hasMatch = variations.some(variation => {
          const match = driverPreferredTypes.includes(variation);
          console.log(`     - Driver has "${variation}"? ${match ? '✅' : '❌'}`);
          return match;
        });
        
        if (hasMatch) {
          isCompatible = true;
          console.log(`   🎯 MATCH FOUND in category ${dbName}!`);
          break;
        }
      }
    }
  }
  
  console.log(`\n🔍 Final result: ${isCompatible ? '✅ COMPATIBLE' : '❌ NOT COMPATIBLE'}`);
  return isCompatible;
};

// Run the test
debugTruckCompatibility();

// Test compatibility with the exact data from the database
const testCompatibility = () => {
  console.log('🧪 Testing compatibility with real database data...');
  
  // Simulate the exact scenario from the logs
  const requiredTruckType = { name: 'Small Truck' };
  const driverPreferredTypes = ['small_truck']; // After parsing "[\"small_truck\"]"
  
  console.log('📊 Input data:');
  console.log('  Required:', requiredTruckType.name);
  console.log('  Driver has:', driverPreferredTypes);
  
  // Test the mapping logic
  const truckTypeMapping = {
    'Small Truck': ['small_truck', 'Small Truck (up to 3.5t)', 'small']
  };
  
  let isCompatible = false;
  const requiredTruckTypeName = requiredTruckType.name;
  
  // Direct match test
  const directMatch = driverPreferredTypes.includes(requiredTruckTypeName);
  console.log('🔍 Direct match test:', directMatch);
  
  if (directMatch) {
    isCompatible = true;
    console.log('✅ Direct match found!');
  } else {
    console.log('❌ No direct match, checking mapping...');
    
    // Mapping test
    const variations = truckTypeMapping[requiredTruckTypeName];
    if (variations) {
      console.log(`📋 Variations for "${requiredTruckTypeName}":`, variations);
      
      const matchingVariations = variations.filter(variation => {
        const hasVariation = driverPreferredTypes.includes(variation);
        console.log(`   - Driver has "${variation}"? ${hasVariation ? '✅' : '❌'}`);
        return hasVariation;
      });
      
      if (matchingVariations.length > 0) {
        isCompatible = true;
        console.log(`🎯 MAPPING MATCH! Found: ${matchingVariations.join(', ')}`);
      }
    }
  }
  
  console.log(`\n🔍 Final result: ${isCompatible ? '✅ COMPATIBLE' : '❌ NOT COMPATIBLE'}`);
  
  // This should be TRUE since "Small Truck" maps to ["small_truck", ...]
  // and driver has ["small_truck"]
  return isCompatible;
};

// Run the test
const result = testCompatibility();
console.log(`\n🎯 Expected: TRUE, Actual: ${result}, Test ${result ? 'PASSED' : 'FAILED'} ✨`);

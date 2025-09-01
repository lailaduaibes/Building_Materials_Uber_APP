// Check the exact structure and format of documents in driver_documents table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

async function checkDocumentStructure() {
  console.log('🔍 CHECKING DRIVER_DOCUMENTS TABLE STRUCTURE');
  console.log('===========================================\n');

  try {
    // Get table schema information
    console.log('1️⃣ Checking table schema...');
    const { data: schemaData, error: schemaError } = await supabaseClient
      .rpc('get_table_schema', { table_name: 'driver_documents' });

    if (schemaError) {
      console.log('❌ Could not get schema via RPC, trying direct query...');
    } else {
      console.log('✅ Schema data:', schemaData);
    }

    // Get all documents with full details
    console.log('\n2️⃣ Fetching all documents with complete structure...');
    const { data: documents, error: docsError } = await supabaseClient
      .from('driver_documents')
      .select('*')
      .limit(10);

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError);
      return;
    }

    console.log(`✅ Found ${documents.length} documents in the table`);

    if (documents.length > 0) {
      console.log('\n📋 COMPLETE DOCUMENT STRUCTURE ANALYSIS:');
      console.log('========================================\n');

      // Analyze the first document in detail
      const firstDoc = documents[0];
      console.log('🔍 FIRST DOCUMENT DETAILED STRUCTURE:');
      console.log('-------------------------------------');
      
      Object.keys(firstDoc).forEach(key => {
        const value = firstDoc[key];
        const type = typeof value;
        const isNull = value === null;
        const isArray = Array.isArray(value);
        
        console.log(`📌 ${key}:`);
        console.log(`   Value: ${value}`);
        console.log(`   Type: ${type}`);
        console.log(`   Is Null: ${isNull}`);
        console.log(`   Is Array: ${isArray}`);
        if (type === 'string' && value) {
          console.log(`   Length: ${value.length} characters`);
        }
        console.log('   ---');
      });

      console.log('\n📊 ALL DOCUMENTS SUMMARY:');
      console.log('=========================');
      
      documents.forEach((doc, index) => {
        console.log(`\n📄 Document ${index + 1}:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Driver ID: ${doc.driver_id}`);
        console.log(`   Document Type: ${doc.document_type}`);
        console.log(`   File Name: ${doc.file_name}`);
        console.log(`   File URL: ${doc.file_url}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   Created At: ${doc.created_at}`);
        console.log(`   Updated At: ${doc.updated_at}`);
        
        // Check for additional fields
        const additionalFields = Object.keys(doc).filter(key => 
          !['id', 'driver_id', 'document_type', 'file_name', 'file_url', 'status', 'created_at', 'updated_at'].includes(key)
        );
        
        if (additionalFields.length > 0) {
          console.log(`   Additional Fields: ${additionalFields.join(', ')}`);
          additionalFields.forEach(field => {
            console.log(`   ${field}: ${doc[field]}`);
          });
        }
      });

      console.log('\n🏗️ TABLE STRUCTURE ANALYSIS:');
      console.log('============================');
      
      const allKeys = new Set();
      documents.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });
      
      console.log('📋 All columns found in documents:');
      Array.from(allKeys).sort().forEach(key => {
        console.log(`   • ${key}`);
      });

      console.log('\n📈 DOCUMENT TYPE DISTRIBUTION:');
      console.log('==============================');
      
      const typeCount = {};
      documents.forEach(doc => {
        const type = doc.document_type;
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} documents`);
      });

      console.log('\n📊 STATUS DISTRIBUTION:');
      console.log('=======================');
      
      const statusCount = {};
      documents.forEach(doc => {
        const status = doc.status || 'no_status';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} documents`);
      });

      console.log('\n🔗 FILE URL ANALYSIS:');
      console.log('=====================');
      
      documents.forEach((doc, index) => {
        if (doc.file_url) {
          console.log(`📎 Document ${index + 1} URL structure:`);
          console.log(`   Full URL: ${doc.file_url}`);
          console.log(`   URL Length: ${doc.file_url.length}`);
          console.log(`   Contains 'storage': ${doc.file_url.includes('storage')}`);
          console.log(`   Contains 'public': ${doc.file_url.includes('public')}`);
          console.log(`   File extension: ${doc.file_url.split('.').pop()}`);
          console.log('   ---');
        }
      });

    } else {
      console.log('📭 No documents found in the table');
    }

    console.log('\n🎯 ADMIN DASHBOARD INTEGRATION REQUIREMENTS:');
    console.log('===========================================');
    console.log('Based on the document structure, the admin dashboard should:');
    console.log('✅ Display document_type as formatted name');
    console.log('✅ Show file_name for user reference');
    console.log('✅ Display status with appropriate badges');
    console.log('✅ Show created_at as upload date');
    console.log('✅ Provide file_url as view/download link');
    console.log('✅ Handle document approval/rejection workflow');

  } catch (error) {
    console.error('❌ Error analyzing document structure:', error);
  }
}

checkDocumentStructure();

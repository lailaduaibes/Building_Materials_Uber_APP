const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDocumentButtons() {
  console.log('🔍 Debugging document approve/reject buttons...\n');

  try {
    // Find pending documents
    console.log('📋 Step 1: Finding pending documents...');
    const { data: pendingDocs, error: fetchError } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (fetchError) {
      console.log('❌ Error fetching documents:', fetchError.message);
      return;
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      console.log('⚠️ No pending documents found to test with');
      
      // Let's check all documents for nanduaibes@gmail.com driver
      console.log('\n📋 Checking documents for test driver...');
      const { data: driver } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'nanduaibes@gmail.com')
        .single();

      if (driver) {
        const { data: driverProfile } = await supabase
          .from('driver_profiles')
          .select('id')
          .eq('user_id', driver.id)
          .single();

        if (driverProfile) {
          const { data: allDocs } = await supabase
            .from('driver_documents')
            .select('*')
            .eq('driver_id', driverProfile.id);

          console.log(`Found ${allDocs?.length || 0} documents for test driver:`, allDocs);
        }
      }
      return;
    }

    console.log(`✅ Found ${pendingDocs.length} pending documents:`);
    pendingDocs.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.document_type} (ID: ${doc.id}) - Status: ${doc.status}`);
    });

    // Test approve function on first document
    const testDoc = pendingDocs[0];
    console.log(`\n🔧 Step 2: Testing approve on document ${testDoc.id}...`);

      const { data: approveResult, error: approveError } = await supabase
        .from('driver_documents')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: null, // Fixed: use null instead of 'admin'
          review_notes: 'Test approval from debug script'
        })
        .eq('id', testDoc.id)
        .select();    if (approveError) {
      console.log('❌ Error approving document:', approveError.message);
    } else {
      console.log('✅ Document approved successfully:', approveResult[0]);
    }

    // Test with another document if available
    if (pendingDocs.length > 1) {
      const testDoc2 = pendingDocs[1];
      console.log(`\n🔧 Step 3: Testing reject on document ${testDoc2.id}...`);

        const { data: rejectResult, error: rejectError } = await supabase
          .from('driver_documents')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString(),
            reviewed_by: null, // Fixed: use null instead of 'admin'
            review_notes: 'Test rejection from debug script'
          })
          .eq('id', testDoc2.id)
          .select();      if (rejectError) {
        console.log('❌ Error rejecting document:', rejectError.message);
      } else {
        console.log('✅ Document rejected successfully:', rejectResult[0]);
      }
    }

    // Check if we can simulate the exact fetch call from admin dashboard
    console.log('\n🌐 Step 4: Testing admin dashboard API call simulation...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/driver_documents?id=eq.${testDoc.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: null, // Fixed: use null instead of 'admin'
        review_notes: 'Test from fetch simulation'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Fetch simulation failed:', error);
    } else {
      const result = await response.json();
      console.log('✅ Fetch simulation successful:', result);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDocumentButtons();

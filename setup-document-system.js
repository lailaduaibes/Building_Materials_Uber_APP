const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function setupDocumentSystem() {
  try {
    console.log('📋 Setting up document system...');
    
    // Create driver_documents table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS driver_documents (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER DEFAULT 0,
        file_url TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        review_notes TEXT,
        reviewed_by UUID,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await supabase.rpc('exec_sql', { sql: createTableSQL });
    console.log('✅ driver_documents table created');
    
    // Create email_logs table
    const createEmailLogsSQL = `
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        driver_id UUID REFERENCES driver_profiles(id),
        email_type VARCHAR(50) NOT NULL,
        email_address VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await supabase.rpc('exec_sql', { sql: createEmailLogsSQL });
    console.log('✅ email_logs table created');
    
    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
      CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
      CREATE INDEX IF NOT EXISTS idx_email_logs_driver_id ON email_logs(driver_id);
    `;
    
    await supabase.rpc('exec_sql', { sql: createIndexesSQL });
    console.log('✅ Indexes created');
    
    // Test with existing driver
    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select('id, first_name, last_name')
      .limit(1);
    
    if (drivers && drivers.length > 0) {
      const driver = drivers[0];
      console.log(`🧪 Testing with driver: ${driver.first_name} ${driver.last_name}`);
      
      // Test document insertion
      const { data: testDoc, error: testError } = await supabase
        .from('driver_documents')
        .insert({
          driver_id: driver.id,
          document_type: 'drivers_license',
          file_name: 'test_license.jpg',
          file_size: 2048,
          file_url: 'https://example.com/test_license.jpg',
          status: 'pending'
        })
        .select()
        .single();
      
      if (testError) {
        console.log('❌ Test failed:', testError.message);
      } else {
        console.log('✅ Test document created:', testDoc.id);
        
        // Test retrieval
        const { data: docs } = await supabase
          .from('driver_documents')
          .select('*')
          .eq('driver_id', driver.id);
        
        console.log(`✅ Retrieved ${docs.length} documents`);
        
        // Clean up
        await supabase
          .from('driver_documents')
          .delete()
          .eq('id', testDoc.id);
        console.log('🧹 Test cleanup completed');
      }
      
      // Test email log
      const { data: emailLog, error: emailError } = await supabase
        .from('email_logs')
        .insert({
          driver_id: driver.id,
          email_type: 'approval_pending',
          email_address: 'test@example.com',
          subject: 'Test Email Notification',
          status: 'sent'
        })
        .select()
        .single();
      
      if (emailError) {
        console.log('❌ Email log test failed:', emailError.message);
      } else {
        console.log('✅ Email log created:', emailLog.id);
        await supabase.from('email_logs').delete().eq('id', emailLog.id);
        console.log('🧹 Email log cleanup completed');
      }
    }
    
    console.log('🎉 Document system setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupDocumentSystem();

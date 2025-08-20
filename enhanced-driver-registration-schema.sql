-- Enhanced Driver Registration with Document Upload Schema
-- This file creates the necessary tables and functions for the enhanced driver registration system

-- 1. Create driver_documents table for storing uploaded documents
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'drivers_license', 'vehicle_registration', 'insurance_certificate', 'profile_photo', 'vehicle_photo'
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    review_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create email_logs table for tracking email notifications
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES driver_profiles(id),
    email_type VARCHAR(50) NOT NULL, -- 'approval_pending', 'approval_approved', 'approval_rejected', 'document_approved', 'document_rejected'
    email_address VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create approval_history table for tracking approval changes
CREATE TABLE IF NOT EXISTS approval_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create storage bucket for driver documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('driver-documents', 'driver-documents', true) 
ON CONFLICT (id) DO NOTHING;

-- 5. Set up storage policies for driver documents
CREATE POLICY "Allow authenticated upload driver documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'driver-documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated view driver documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'driver-documents' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Allow authenticated delete own driver documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'driver-documents' 
        AND auth.role() = 'authenticated'
    );

-- 6. Create RLS policies for driver_documents table
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own documents
CREATE POLICY "Drivers can view own documents" ON driver_documents
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Drivers can insert their own documents
CREATE POLICY "Drivers can insert own documents" ON driver_documents
    FOR INSERT WITH CHECK (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Drivers can delete their own pending documents
CREATE POLICY "Drivers can delete own pending documents" ON driver_documents
    FOR DELETE USING (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
        AND status = 'pending'
    );

-- Service role can access all documents (for admin dashboard)
CREATE POLICY "Service role full access to documents" ON driver_documents
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Create RLS policies for email_logs table
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Service role can access all email logs
CREATE POLICY "Service role full access to email logs" ON email_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 8. Create RLS policies for approval_history table
ALTER TABLE approval_history ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own approval history
CREATE POLICY "Drivers can view own approval history" ON approval_history
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM driver_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Service role can access all approval history
CREATE POLICY "Service role full access to approval history" ON approval_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 9. Create function to log approval status changes
CREATE OR REPLACE FUNCTION log_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if approval_status actually changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
        INSERT INTO approval_history (
            driver_id,
            previous_status,
            new_status,
            changed_by,
            reason,
            notes
        ) VALUES (
            NEW.id,
            OLD.approval_status,
            NEW.approval_status,
            NEW.approved_by,
            NEW.rejection_reason,
            NEW.admin_notes
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for approval status changes
DROP TRIGGER IF EXISTS driver_approval_status_history ON driver_profiles;
CREATE TRIGGER driver_approval_status_history
    AFTER UPDATE ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_approval_status_change();

-- 11. Create function to get driver completion status
CREATE OR REPLACE FUNCTION get_driver_completion_status(p_driver_id UUID)
RETURNS TABLE (
    registration_complete BOOLEAN,
    documents_uploaded BOOLEAN,
    required_documents_count INTEGER,
    uploaded_documents_count INTEGER,
    pending_documents_count INTEGER,
    approved_documents_count INTEGER,
    rejected_documents_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH required_docs AS (
        SELECT UNNEST(ARRAY['drivers_license', 'vehicle_registration', 'insurance_certificate', 'profile_photo']) AS doc_type
    ),
    driver_docs AS (
        SELECT 
            document_type,
            status,
            COUNT(*) as doc_count
        FROM driver_documents 
        WHERE driver_id = p_driver_id
        GROUP BY document_type, status
    ),
    doc_summary AS (
        SELECT
            rd.doc_type,
            COALESCE(dd.doc_count, 0) as uploaded_count,
            dd.status
        FROM required_docs rd
        LEFT JOIN driver_docs dd ON rd.doc_type = dd.document_type
    )
    SELECT
        -- Registration is complete if driver profile exists and is not pending
        EXISTS(
            SELECT 1 FROM driver_profiles 
            WHERE id = p_driver_id 
            AND approval_status != 'pending'
        ) as registration_complete,
        
        -- Documents uploaded if all required documents exist
        (SELECT COUNT(*) FROM doc_summary WHERE uploaded_count > 0) = 4 as documents_uploaded,
        
        4 as required_documents_count,
        
        (SELECT COUNT(DISTINCT document_type) 
         FROM driver_documents 
         WHERE driver_id = p_driver_id 
         AND document_type IN ('drivers_license', 'vehicle_registration', 'insurance_certificate', 'profile_photo')
        ) as uploaded_documents_count,
        
        (SELECT COUNT(*) 
         FROM driver_documents 
         WHERE driver_id = p_driver_id 
         AND status = 'pending'
        ) as pending_documents_count,
        
        (SELECT COUNT(*) 
         FROM driver_documents 
         WHERE driver_id = p_driver_id 
         AND status = 'approved'
        ) as approved_documents_count,
        
        (SELECT COUNT(*) 
         FROM driver_documents 
         WHERE driver_id = p_driver_id 
         AND status = 'rejected'
        ) as rejected_documents_count;
END;
$$ LANGUAGE plpgsql;

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_type ON driver_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_driver_id ON email_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_approval_history_driver_id ON approval_history(driver_id);

-- 13. Create updated_at trigger for driver_documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_documents_updated_at
    BEFORE UPDATE ON driver_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. Insert sample document types reference (optional)
CREATE TABLE IF NOT EXISTS document_types_reference (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    accepted_formats TEXT[], -- ['image/jpeg', 'image/png', 'application/pdf']
    max_file_size INTEGER DEFAULT 5242880, -- 5MB in bytes
    sort_order INTEGER DEFAULT 0
);

INSERT INTO document_types_reference (id, title, description, required, accepted_formats, sort_order) VALUES
    ('drivers_license', 'Driver''s License', 'Front and back of your valid driver''s license', true, ARRAY['image/jpeg', 'image/png', 'application/pdf'], 1),
    ('vehicle_registration', 'Vehicle Registration', 'Current vehicle registration document', true, ARRAY['image/jpeg', 'image/png', 'application/pdf'], 2),
    ('insurance_certificate', 'Insurance Certificate', 'Valid vehicle insurance certificate', true, ARRAY['image/jpeg', 'image/png', 'application/pdf'], 3),
    ('profile_photo', 'Profile Photo', 'Clear photo for your driver profile', true, ARRAY['image/jpeg', 'image/png'], 4),
    ('vehicle_photo', 'Vehicle Photo', 'Photo of your delivery vehicle', false, ARRAY['image/jpeg', 'image/png'], 5)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    required = EXCLUDED.required,
    accepted_formats = EXCLUDED.accepted_formats,
    sort_order = EXCLUDED.sort_order;

-- 15. Create admin view for document management
CREATE OR REPLACE VIEW admin_driver_documents_view AS
SELECT 
    dd.id,
    dd.driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.phone as driver_phone,
    dp.approval_status as driver_status,
    dd.document_type,
    dtr.title as document_title,
    dd.file_name,
    dd.file_url,
    dd.status as document_status,
    dd.review_notes,
    dd.uploaded_at,
    dd.reviewed_at,
    ru.email as reviewed_by_email
FROM driver_documents dd
JOIN driver_profiles dp ON dd.driver_id = dp.id
LEFT JOIN document_types_reference dtr ON dd.document_type = dtr.id
LEFT JOIN auth.users ru ON dd.reviewed_by = ru.id
ORDER BY dd.uploaded_at DESC;

COMMENT ON TABLE driver_documents IS 'Stores uploaded documents for driver verification';
COMMENT ON TABLE email_logs IS 'Tracks email notifications sent to drivers';
COMMENT ON TABLE approval_history IS 'Logs changes to driver approval status';
COMMENT ON FUNCTION get_driver_completion_status IS 'Returns completion status for a driver registration';
COMMENT ON VIEW admin_driver_documents_view IS 'Admin view for managing driver documents';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Success message
SELECT 'Enhanced driver registration schema created successfully!' as message;

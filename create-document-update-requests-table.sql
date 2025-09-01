-- Create document_update_requests table for tracking driver document update requests
-- This ensures admin oversight and maintains security compliance

CREATE TABLE IF NOT EXISTS document_update_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    request_type VARCHAR(20) DEFAULT 'document_update',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT,
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_update_requests_driver_id ON document_update_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_document_update_requests_status ON document_update_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_update_requests_created_at ON document_update_requests(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE document_update_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can only see their own requests
CREATE POLICY "Drivers can view their own document update requests" ON document_update_requests
    FOR SELECT USING (driver_id = auth.uid());

-- Policy: Drivers can only create their own requests
CREATE POLICY "Drivers can create their own document update requests" ON document_update_requests
    FOR INSERT WITH CHECK (driver_id = auth.uid());

-- Policy: Service role (admin) can see and modify all requests
CREATE POLICY "Service role can manage all document update requests" ON document_update_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_document_update_requests_updated_at
    BEFORE UPDATE ON document_update_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_document_update_requests_updated_at();

-- Comment for documentation
COMMENT ON TABLE document_update_requests IS 'Tracks driver requests for document updates, ensuring admin oversight and security compliance';

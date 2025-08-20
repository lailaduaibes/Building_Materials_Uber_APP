-- PROFESSIONAL VEHICLE MANAGEMENT SYSTEM
-- ==========================================
-- This script enhances the existing database for professional vehicle management
-- similar to Uber's system where drivers register actual vehicles

-- 1. Enhance trucks table for professional vehicle registration
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS owner_driver_id UUID REFERENCES public.users(id);
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS vin_number TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS registration_expiry_date DATE;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS inspection_certificate_url TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS insurance_certificate_url TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS vehicle_photos JSONB; -- Array of photo URLs
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended'));
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id);
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.trucks ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Create vehicle documents table for tracking all required documents
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('registration', 'insurance', 'inspection', 'license', 'permit')),
    document_url TEXT NOT NULL,
    document_number TEXT,
    issue_date DATE,
    expiry_date DATE,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES public.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create vehicle inspection history table
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES public.users(id),
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('initial', 'annual', 'maintenance', 'accident')),
    inspection_date DATE NOT NULL,
    inspection_result TEXT NOT NULL CHECK (inspection_result IN ('passed', 'failed', 'conditional')),
    inspection_notes TEXT,
    inspection_report_url TEXT,
    next_inspection_due DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update driver_profiles to reference actual registered vehicles
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS registered_vehicles JSONB; -- Array of vehicle IDs
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS primary_vehicle_id UUID REFERENCES public.trucks(id);
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS driver_license_number TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS driver_license_expiry DATE;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS driver_license_class TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS commercial_license_number TEXT;
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS commercial_license_expiry DATE;

-- 5. Create vehicle assignment history table
CREATE TABLE IF NOT EXISTS public.vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id UUID REFERENCES public.trucks(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.users(id),
    assignment_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assignment_end TIMESTAMP WITH TIME ZONE,
    assignment_reason TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS for new tables
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for vehicle management

-- Vehicle documents policies
CREATE POLICY "Drivers can view their own vehicle documents" 
ON public.vehicle_documents FOR SELECT 
USING (truck_id IN (SELECT id FROM public.trucks WHERE owner_driver_id = auth.uid()));

CREATE POLICY "Drivers can insert their own vehicle documents" 
ON public.vehicle_documents FOR INSERT 
WITH CHECK (truck_id IN (SELECT id FROM public.trucks WHERE owner_driver_id = auth.uid()));

CREATE POLICY "Admins can manage all vehicle documents" 
ON public.vehicle_documents FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Vehicle inspection policies
CREATE POLICY "Drivers can view their vehicle inspections" 
ON public.vehicle_inspections FOR SELECT 
USING (truck_id IN (SELECT id FROM public.trucks WHERE owner_driver_id = auth.uid()));

CREATE POLICY "Inspectors and admins can manage inspections" 
ON public.vehicle_inspections FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND user_type IN ('admin', 'inspector')
    )
);

-- Vehicle assignment policies
CREATE POLICY "Drivers can view their assignments" 
ON public.vehicle_assignments FOR SELECT 
USING (driver_id = auth.uid());

CREATE POLICY "Admins can manage vehicle assignments" 
ON public.vehicle_assignments FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trucks_owner_driver ON public.trucks(owner_driver_id);
CREATE INDEX IF NOT EXISTS idx_trucks_verification_status ON public.trucks(verification_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_truck ON public.vehicle_documents(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_type ON public.vehicle_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_truck ON public.vehicle_inspections(truck_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver ON public.vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_truck ON public.vehicle_assignments(truck_id);

-- 9. Create views for easy data access

-- View for driver vehicle overview
CREATE OR REPLACE VIEW public.driver_vehicle_overview AS
SELECT 
    dp.user_id as driver_user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    t.id as truck_id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.verification_status,
    tt.name as truck_type,
    t.is_available,
    t.is_active,
    CASE 
        WHEN t.id = dp.primary_vehicle_id THEN true 
        ELSE false 
    END as is_primary_vehicle
FROM public.driver_profiles dp
LEFT JOIN public.trucks t ON t.owner_driver_id = dp.user_id
LEFT JOIN public.truck_types tt ON t.truck_type_id = tt.id
WHERE t.verification_status = 'approved';

-- View for admin vehicle management
CREATE OR REPLACE VIEW public.admin_vehicle_management AS
SELECT 
    t.id as truck_id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.verification_status,
    tt.name as truck_type,
    dp.first_name || ' ' || dp.last_name as owner_name,
    dp.phone as owner_phone,
    dp.email as owner_email,
    t.insurance_expiry_date,
    t.registration_expiry_date,
    t.created_at as registration_date,
    t.verified_at,
    u.first_name || ' ' || u.last_name as verified_by_name
FROM public.trucks t
JOIN public.truck_types tt ON t.truck_type_id = tt.id
LEFT JOIN public.driver_profiles dp ON t.owner_driver_id = dp.user_id
LEFT JOIN public.users u ON t.verified_by = u.id
ORDER BY t.created_at DESC;

-- 10. Insert sample data for testing

-- Insert a sample truck for our test driver
INSERT INTO public.trucks (
    truck_type_id,
    owner_driver_id,
    license_plate,
    make,
    model,
    year,
    color,
    max_payload,
    max_volume,
    registration_number,
    vin_number,
    insurance_policy_number,
    insurance_expiry_date,
    registration_expiry_date,
    verification_status,
    is_available,
    is_active
) VALUES (
    (SELECT id FROM public.truck_types WHERE name = 'Flatbed Truck' LIMIT 1),
    '7a9ce2f0-db9d-46a7-aef3-c01635d90592', -- Ahmed Driver's user ID
    'RDH-9876',
    'Mercedes',
    'Actros 2640',
    2022,
    'White',
    10.0,
    15.0,
    'RG-2024-567890',
    '1HGCM82633A123456',
    'POL-2024-789123',
    '2025-12-31',
    '2025-06-30',
    'approved',
    true,
    true
) ON CONFLICT DO NOTHING;

-- Update the driver profile to reference the registered vehicle
UPDATE public.driver_profiles 
SET 
    primary_vehicle_id = (
        SELECT id FROM public.trucks 
        WHERE owner_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
        AND license_plate = 'RDH-9876'
        LIMIT 1
    ),
    registered_vehicles = jsonb_build_array(
        (
            SELECT id FROM public.trucks 
            WHERE owner_driver_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592' 
            AND license_plate = 'RDH-9876'
            LIMIT 1
        )
    ),
    driver_license_number = 'DL-SA-2024-456789',
    driver_license_expiry = '2027-03-15',
    driver_license_class = 'Class 3',
    commercial_license_number = 'CDL-SA-2024-987654',
    commercial_license_expiry = '2026-08-20'
WHERE user_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';

COMMENT ON TABLE public.trucks IS 'Registered vehicles in the system with full documentation and verification';
COMMENT ON TABLE public.vehicle_documents IS 'All required documents for vehicle registration and compliance';
COMMENT ON TABLE public.vehicle_inspections IS 'Vehicle inspection history and compliance tracking';
COMMENT ON TABLE public.vehicle_assignments IS 'History of vehicle assignments to drivers';

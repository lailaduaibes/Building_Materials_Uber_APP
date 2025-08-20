-- Create addresses table for common building materials delivery locations
CREATE TABLE public.addresses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  formatted_address text NOT NULL,
  latitude float NOT NULL,
  longitude float NOT NULL,
  city text,
  area_type text CHECK (area_type IN ('industrial', 'commercial', 'residential', 'construction_site', 'warehouse')),
  is_truck_accessible boolean DEFAULT true,
  special_instructions text,
  search_keywords text[], -- For better search matching
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast searching
CREATE INDEX idx_addresses_search ON public.addresses USING gin(search_keywords);
CREATE INDEX idx_addresses_city ON public.addresses(city);
CREATE INDEX idx_addresses_area_type ON public.addresses(area_type);
CREATE INDEX idx_addresses_location ON public.addresses(latitude, longitude);

-- Insert some common building materials locations (example for South Africa)
INSERT INTO public.addresses (name, formatted_address, latitude, longitude, city, area_type, search_keywords) VALUES
('Johannesburg Industrial Area', 'Industrial Area, Johannesburg, South Africa', -26.2041, 28.0473, 'Johannesburg', 'industrial', ARRAY['industrial', 'johannesburg', 'factory', 'warehouse']),
('Cape Town Construction Zone', 'Construction Zone, Cape Town, South Africa', -33.9249, 18.4241, 'Cape Town', 'construction_site', ARRAY['construction', 'cape town', 'building', 'site']),
('Durban Port Area', 'Port Area, Durban, South Africa', -29.8587, 31.0218, 'Durban', 'commercial', ARRAY['port', 'durban', 'shipping', 'logistics']);

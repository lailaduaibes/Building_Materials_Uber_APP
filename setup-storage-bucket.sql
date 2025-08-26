-- =============================================================================
-- SETUP STORAGE BUCKET FOR TRIP PHOTOS
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to create the storage bucket

-- Create storage bucket for trip photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Users can upload trip photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view trip photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'trip-photos');

CREATE POLICY "Users can delete their trip photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'trip-photos' AND
    auth.role() = 'authenticated'
  );

-- Check if the bucket was created successfully
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at 
FROM storage.buckets 
WHERE id = 'trip-photos';

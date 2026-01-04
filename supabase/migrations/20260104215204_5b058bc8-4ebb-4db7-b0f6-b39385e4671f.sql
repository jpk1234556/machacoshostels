-- Add new fields to profiles table for rental system registration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS residential_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS id_type text DEFAULT 'national_id',
ADD COLUMN IF NOT EXISTS id_number text,
ADD COLUMN IF NOT EXISTS id_document_url text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_provider text,
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS security_deposit_agreed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;

-- Create storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for ID documents - users can upload their own
CREATE POLICY "Users can upload own ID documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own ID documents
CREATE POLICY "Users can view own ID documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Super admins can view all ID documents
CREATE POLICY "Super admins can view all ID documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'id-documents' AND public.has_role(auth.uid(), 'super_admin'));
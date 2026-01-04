-- Create payment type enum for different payment schedules
CREATE TYPE public.payment_schedule AS ENUM ('monthly', 'semester', 'annual');

-- Add payment_schedule column to leases table
ALTER TABLE public.leases ADD COLUMN payment_schedule public.payment_schedule DEFAULT 'monthly';

-- Add semester_amount column for semester-based payments
ALTER TABLE public.leases ADD COLUMN semester_amount numeric;
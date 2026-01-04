-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'property_owner');

-- Create enum for property types
CREATE TYPE public.property_type AS ENUM ('hostel', 'apartment', 'hotel', 'rental');

-- Create enum for unit status
CREATE TYPE public.unit_status AS ENUM ('available', 'occupied', 'maintenance');

-- Create enum for lease status
CREATE TYPE public.lease_status AS ENUM ('active', 'expiring_soon', 'expired', 'terminated');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('paid', 'pending', 'overdue');

-- Create enum for maintenance priority
CREATE TYPE public.maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create enum for maintenance status
CREATE TYPE public.maintenance_status AS ENUM ('pending', 'in_progress', 'resolved');

-- Create enum for owner approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  approval_status public.approval_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type public.property_type NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  country TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create units table
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  unit_number TEXT NOT NULL,
  unit_type TEXT,
  capacity INT DEFAULT 1,
  amenities TEXT[],
  rent_amount DECIMAL(10, 2) NOT NULL,
  status public.unit_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create leases table
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10, 2) NOT NULL,
  deposit_amount DECIMAL(10, 2),
  status public.lease_status DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE,
  due_date DATE NOT NULL,
  status public.payment_status DEFAULT 'pending',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  priority public.maintenance_priority DEFAULT 'medium',
  status public.maintenance_status DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's properties (for RLS)
CREATE OR REPLACE FUNCTION public.get_user_property_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.properties WHERE owner_id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Properties policies
CREATE POLICY "Owners can view own properties"
ON public.properties FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage own properties"
ON public.properties FOR ALL
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Super admins can view all properties"
ON public.properties FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Units policies
CREATE POLICY "Owners can view units of own properties"
ON public.units FOR SELECT
TO authenticated
USING (property_id IN (SELECT public.get_user_property_ids(auth.uid())));

CREATE POLICY "Owners can manage units of own properties"
ON public.units FOR ALL
TO authenticated
USING (property_id IN (SELECT public.get_user_property_ids(auth.uid())));

CREATE POLICY "Super admins can view all units"
ON public.units FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Tenants policies
CREATE POLICY "Owners can view own tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage own tenants"
ON public.tenants FOR ALL
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Leases policies (via units -> properties -> owner)
CREATE POLICY "Owners can view leases of own units"
ON public.leases FOR SELECT
TO authenticated
USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_user_property_ids(auth.uid()))));

CREATE POLICY "Owners can manage leases of own units"
ON public.leases FOR ALL
TO authenticated
USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_user_property_ids(auth.uid()))));

CREATE POLICY "Super admins can view all leases"
ON public.leases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Payments policies (via leases -> units -> properties -> owner)
CREATE POLICY "Owners can view payments of own leases"
ON public.payments FOR SELECT
TO authenticated
USING (lease_id IN (
  SELECT l.id FROM public.leases l
  JOIN public.units u ON l.unit_id = u.id
  WHERE u.property_id IN (SELECT public.get_user_property_ids(auth.uid()))
));

CREATE POLICY "Owners can manage payments of own leases"
ON public.payments FOR ALL
TO authenticated
USING (lease_id IN (
  SELECT l.id FROM public.leases l
  JOIN public.units u ON l.unit_id = u.id
  WHERE u.property_id IN (SELECT public.get_user_property_ids(auth.uid()))
));

CREATE POLICY "Super admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Maintenance requests policies
CREATE POLICY "Owners can view maintenance for own units"
ON public.maintenance_requests FOR SELECT
TO authenticated
USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_user_property_ids(auth.uid()))));

CREATE POLICY "Owners can manage maintenance for own units"
ON public.maintenance_requests FOR ALL
TO authenticated
USING (unit_id IN (SELECT id FROM public.units WHERE property_id IN (SELECT public.get_user_property_ids(auth.uid()))));

CREATE POLICY "Super admins can view all maintenance"
ON public.maintenance_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is property_owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'property_owner');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
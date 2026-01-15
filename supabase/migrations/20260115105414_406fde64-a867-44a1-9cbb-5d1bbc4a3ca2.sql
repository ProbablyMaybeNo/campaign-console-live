-- ============================================
-- FIX 1: Campaigns Public Data Exposure
-- ============================================
-- Drop the permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view campaigns" ON public.campaigns;

-- Create policy requiring authentication
CREATE POLICY "Authenticated users can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 2: Admin Role System for Master Data
-- ============================================

-- Create role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view roles (prevents enumeration)
CREATE POLICY "Admins can view user roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Only admins can manage roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create security definer function to check roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- ============================================
-- FIX 3: Restrict Game Systems to Admin Only
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can create game systems" ON public.game_systems;
DROP POLICY IF EXISTS "Authenticated users can update game systems" ON public.game_systems;
DROP POLICY IF EXISTS "Authenticated users can delete game systems" ON public.game_systems;

-- Create admin-only policies for modifications
CREATE POLICY "Admins can create game systems"
ON public.game_systems
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update game systems"
ON public.game_systems
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete game systems"
ON public.game_systems
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 4: Restrict Master Factions to Admin Only
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert master factions" ON public.master_factions;
DROP POLICY IF EXISTS "Authenticated users can update master factions" ON public.master_factions;
DROP POLICY IF EXISTS "Authenticated users can delete master factions" ON public.master_factions;

CREATE POLICY "Admins can insert master factions"
ON public.master_factions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update master factions"
ON public.master_factions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete master factions"
ON public.master_factions
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 5: Restrict Master Units to Admin Only
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert master units" ON public.master_units;
DROP POLICY IF EXISTS "Authenticated users can update master units" ON public.master_units;
DROP POLICY IF EXISTS "Authenticated users can delete master units" ON public.master_units;

CREATE POLICY "Admins can insert master units"
ON public.master_units
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update master units"
ON public.master_units
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete master units"
ON public.master_units
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FIX 6: Restrict Master Rules to Admin Only
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert master rules" ON public.master_rules;
DROP POLICY IF EXISTS "Authenticated users can update master rules" ON public.master_rules;
DROP POLICY IF EXISTS "Authenticated users can delete master rules" ON public.master_rules;

CREATE POLICY "Admins can insert master rules"
ON public.master_rules
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update master rules"
ON public.master_rules
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete master rules"
ON public.master_rules
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
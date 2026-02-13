-- Drop the problematic view
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate the view with security_invoker = true (uses caller's permissions)
-- This is safer as it respects RLS of the underlying table
CREATE VIEW public.profiles_public 
WITH (security_invoker = true, security_barrier = true) AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- The view uses security_invoker, so we need an RLS policy on profiles 
-- that allows authenticated users to see basic fields of all profiles
-- But the profiles table RLS restricts to own profile only...

-- Solution: Create a security definer function for safe public profile lookups
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, avatar_url
  FROM public.profiles
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profiles() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_public_profiles IS 'Returns public-safe profile fields for all users. Used for player lists, message authors, etc.';
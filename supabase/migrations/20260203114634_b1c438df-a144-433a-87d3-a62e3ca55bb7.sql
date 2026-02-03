-- Fix: Restrict profiles SELECT policy to only allow users to view their own sensitive data
-- This prevents exposure of stripe_customer_id and subscription info to other users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create restrictive policy: users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Create a secure view for public profile data (display_name, avatar_url only)
-- This can be used if social features need to display other users' names/avatars
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;
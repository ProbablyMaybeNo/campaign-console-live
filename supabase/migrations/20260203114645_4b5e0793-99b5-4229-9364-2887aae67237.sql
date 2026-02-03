-- Fix the SECURITY DEFINER view issue by recreating with SECURITY INVOKER
-- This ensures the view respects the querying user's permissions

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;
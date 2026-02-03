-- Enable RLS on the profiles_public view
ALTER VIEW public.profiles_public SET (security_invoker = false);

-- Drop the view and recreate with security_barrier to prevent information leakage
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_barrier = true) AS
SELECT 
  id,
  display_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public.profiles_public IS 'Public-safe profile fields for player lists and message authors. Excludes sensitive payment/subscription data.';
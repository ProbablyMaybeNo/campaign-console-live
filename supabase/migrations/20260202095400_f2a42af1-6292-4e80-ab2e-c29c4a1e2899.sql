-- Fix the campaigns_safe view to use security_invoker
DROP VIEW IF EXISTS public.campaigns_safe;

CREATE VIEW public.campaigns_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  description,
  rules_repo_url,
  rules_repo_ref,
  points_limit,
  owner_id,
  created_at,
  updated_at,
  game_system_id,
  max_players,
  total_rounds,
  start_date,
  end_date,
  current_round,
  display_settings,
  round_length,
  status,
  game_system,
  title_color,
  border_color,
  -- Only show join_code to owners
  CASE WHEN owner_id = auth.uid() THEN join_code ELSE NULL END as join_code,
  -- Never expose password fields
  (password_hash IS NOT NULL) as has_password
FROM public.campaigns;

-- Grant access to the view
GRANT SELECT ON public.campaigns_safe TO authenticated;
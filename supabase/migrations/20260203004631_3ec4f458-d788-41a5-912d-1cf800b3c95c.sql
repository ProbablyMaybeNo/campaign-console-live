-- Drop and recreate the view with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.campaigns_safe;

CREATE VIEW public.campaigns_safe 
WITH (security_invoker = true)
AS
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
  max_players,
  total_rounds,
  round_length,
  join_code,
  (password_hash IS NOT NULL) as has_password,
  status,
  game_system,
  game_system_id,
  start_date,
  end_date,
  current_round,
  display_settings,
  title_color,
  border_color,
  is_archived,
  banner_url,
  theme_id
FROM public.campaigns;
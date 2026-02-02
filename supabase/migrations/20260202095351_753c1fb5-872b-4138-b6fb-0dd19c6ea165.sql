-- =====================================================
-- ADDITIONAL SECURITY FIXES
-- =====================================================

-- 1. Fix error_reports INSERT to require authentication
DROP POLICY IF EXISTS "Anyone can insert error reports" ON public.error_reports;

CREATE POLICY "Authenticated users can insert error reports" 
ON public.error_reports 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Create a secure view for campaigns that hides sensitive fields
-- This prevents password_hash from being exposed to members
CREATE OR REPLACE VIEW public.campaigns_safe AS
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
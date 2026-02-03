-- Add new columns to campaigns table for supporter features
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS theme_id text NOT NULL DEFAULT 'dark';

-- Add index for efficient filtering of active/archived campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_is_archived ON public.campaigns (is_archived);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner_archived ON public.campaigns (owner_id, is_archived);

-- Create function to count active campaigns for a user (for limit enforcement)
CREATE OR REPLACE FUNCTION public.count_active_campaigns(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.campaigns
  WHERE owner_id = _user_id
    AND is_archived = false
$$;

-- Create function to check if user can create a new campaign based on their plan
-- Returns true if allowed, false if limit reached
CREATE OR REPLACE FUNCTION public.can_create_campaign(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  active_count integer;
  max_allowed integer;
BEGIN
  -- Get user's plan from profiles
  SELECT COALESCE(plan, 'free') INTO user_plan
  FROM public.profiles
  WHERE id = _user_id;
  
  -- Set max allowed based on plan
  IF user_plan = 'supporter' THEN
    max_allowed := 5;
  ELSE
    max_allowed := 1;
  END IF;
  
  -- Count active campaigns owned by user
  SELECT public.count_active_campaigns(_user_id) INTO active_count;
  
  RETURN active_count < max_allowed;
END;
$$;

-- Create function to get user entitlements
CREATE OR REPLACE FUNCTION public.get_user_entitlements(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  is_supporter boolean;
BEGIN
  -- Get user's plan and subscription status from profiles
  SELECT 
    CASE 
      WHEN plan = 'supporter' AND subscription_status = 'active' THEN 'supporter'
      ELSE 'free'
    END INTO user_plan
  FROM public.profiles
  WHERE id = _user_id;
  
  -- Default to free if no profile
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  is_supporter := (user_plan = 'supporter');
  
  RETURN jsonb_build_object(
    'plan', user_plan,
    'max_active_campaigns', CASE WHEN is_supporter THEN 5 ELSE 1 END,
    'smart_paste_enabled', is_supporter,
    'themes_enabled', is_supporter,
    'banner_enabled', is_supporter,
    'text_widget_enabled', is_supporter,
    'stickers_enabled', is_supporter,
    'active_campaign_count', public.count_active_campaigns(_user_id)
  );
END;
$$;

-- Update campaigns_safe view to include new columns
DROP VIEW IF EXISTS public.campaigns_safe;
CREATE VIEW public.campaigns_safe AS
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
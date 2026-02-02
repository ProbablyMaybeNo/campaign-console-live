-- =====================================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- =====================================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. FIX CAMPAIGN PASSWORD SECURITY
-- Add password_hash column and remove plaintext password
-- =====================================================

-- Add new password_hash column
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS password_hash text;

-- Migrate existing plaintext passwords to hashed (one-time operation)
UPDATE public.campaigns 
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password != '' AND password_hash IS NULL;

-- Create function to set campaign password (hashes the password)
CREATE OR REPLACE FUNCTION public.set_campaign_password(campaign_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE campaigns 
  SET password_hash = crypt(new_password, gen_salt('bf', 10)),
      password = NULL  -- Clear plaintext password
  WHERE id = campaign_id;
END;
$$;

-- Create function to verify campaign password
CREATE OR REPLACE FUNCTION public.verify_campaign_password(campaign_id uuid, input_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM campaigns
  WHERE id = campaign_id;
  
  IF stored_hash IS NULL THEN
    RETURN true;  -- No password required
  END IF;
  
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Clear all plaintext passwords now that they're migrated
UPDATE public.campaigns SET password = NULL WHERE password IS NOT NULL;

-- =====================================================
-- 2. FIX CAMPAIGNS RLS - Restrict visibility
-- =====================================================

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;

-- Create restricted SELECT policy: only owners and members can view
CREATE POLICY "Owners and members can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = campaigns.id 
    AND campaign_players.user_id = auth.uid()
  )
);

-- Create public lookup policy for join flow (minimal fields via RPC)
-- This allows the join-by-code lookup to work

-- =====================================================
-- 3. FIX CAMPAIGN_PLAYERS RLS - Remove public access
-- =====================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view campaign players" ON public.campaign_players;

-- Create restricted SELECT policy: only campaign owners and members
CREATE POLICY "Campaign members and owners can view players" 
ON public.campaign_players 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_players.campaign_id 
    AND campaigns.owner_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM campaign_players cp2 
    WHERE cp2.campaign_id = campaign_players.campaign_id 
    AND cp2.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. FIX ERROR_REPORTS INSERT - Rate limiting via constraint
-- =====================================================

-- Add rate limiting check function
CREATE OR REPLACE FUNCTION public.check_error_report_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Count reports from same fingerprint in last minute
  SELECT COUNT(*) INTO recent_count
  FROM error_reports
  WHERE fingerprint = NEW.fingerprint
  AND created_at > NOW() - INTERVAL '1 minute';
  
  -- If existing report, just update occurrence count instead
  IF recent_count > 0 THEN
    UPDATE error_reports 
    SET occurrence_count = occurrence_count + 1,
        last_occurred_at = NOW()
    WHERE fingerprint = NEW.fingerprint;
    RETURN NULL;  -- Prevent insert, we updated instead
  END IF;
  
  -- Also limit total reports per IP/user in last hour
  SELECT COUNT(*) INTO recent_count
  FROM error_reports
  WHERE (user_id = NEW.user_id OR (user_id IS NULL AND NEW.user_id IS NULL))
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 100 unique errors per user per hour
  IF recent_count >= 100 THEN
    RETURN NULL;  -- Silently drop
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting
DROP TRIGGER IF EXISTS error_report_rate_limit ON public.error_reports;
CREATE TRIGGER error_report_rate_limit
  BEFORE INSERT ON public.error_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_error_report_rate();

-- =====================================================
-- 5. CREATE SECURE CAMPAIGN LOOKUP FUNCTION
-- For join flow - returns only safe public info
-- =====================================================

CREATE OR REPLACE FUNCTION public.lookup_campaign_by_code(join_code_input text)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  game_system text,
  max_players integer,
  has_password boolean,
  player_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.game_system,
    c.max_players,
    (c.password_hash IS NOT NULL) as has_password,
    (SELECT COUNT(*) FROM campaign_players cp WHERE cp.campaign_id = c.id) as player_count
  FROM campaigns c
  WHERE c.join_code = UPPER(join_code_input);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_campaign_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_campaign_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_campaign_password(uuid, text) TO authenticated;
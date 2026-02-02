-- Create security definer function to check campaign ownership without RLS
CREATE OR REPLACE FUNCTION public.is_campaign_owner(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns
    WHERE id = _campaign_id
      AND owner_id = _user_id
  )
$$;

-- Create security definer function to check campaign membership without RLS
CREATE OR REPLACE FUNCTION public.is_campaign_member(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_players
    WHERE campaign_id = _campaign_id
      AND user_id = _user_id
  )
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Owners and members can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Campaign members and owners can view players" ON public.campaign_players;

-- Recreate campaigns SELECT policy using the security definer function
CREATE POLICY "Owners and members can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (
  owner_id = auth.uid() 
  OR public.is_campaign_member(id, auth.uid())
);

-- Recreate campaign_players SELECT policy using the security definer function
CREATE POLICY "Campaign members and owners can view players" 
ON public.campaign_players 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_campaign_owner(campaign_id, auth.uid())
  OR public.is_campaign_member(campaign_id, auth.uid())
);
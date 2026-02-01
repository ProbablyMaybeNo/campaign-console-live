-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Campaign owners can add players" ON public.campaign_players;

-- Create a new INSERT policy that allows:
-- 1. Campaign owners to add any player
-- 2. Users to add themselves to a campaign
CREATE POLICY "Users can join campaigns or owners can add players"
ON public.campaign_players
FOR INSERT
WITH CHECK (
  -- User is adding themselves
  (auth.uid() = user_id)
  OR
  -- Campaign owner is adding someone
  (EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_players.campaign_id
    AND campaigns.owner_id = auth.uid()
  ))
);
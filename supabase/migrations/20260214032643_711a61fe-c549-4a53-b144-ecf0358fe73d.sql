
-- Add is_ghost column to campaign_players
ALTER TABLE public.campaign_players 
ADD COLUMN is_ghost boolean NOT NULL DEFAULT false;

-- Drop the existing INSERT policy and replace with one that allows GMs to add ghost players
DROP POLICY IF EXISTS "Users can join campaigns or owners can add players" ON public.campaign_players;

CREATE POLICY "Users can join campaigns or owners can add players"
ON public.campaign_players
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  OR is_campaign_owner(campaign_id, auth.uid())
);

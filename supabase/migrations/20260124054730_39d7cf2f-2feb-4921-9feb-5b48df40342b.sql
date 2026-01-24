-- Add warband_link column to campaign_players for external warband links
ALTER TABLE public.campaign_players
ADD COLUMN warband_link TEXT DEFAULT NULL;

-- Add UPDATE policy so players can update their own warband_link
CREATE POLICY "Players can update own campaign settings"
ON public.campaign_players
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
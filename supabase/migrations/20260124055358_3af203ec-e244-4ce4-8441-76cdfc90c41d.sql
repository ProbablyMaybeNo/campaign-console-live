-- Add player settings columns to campaign_players
ALTER TABLE public.campaign_players
ADD COLUMN player_name TEXT DEFAULT NULL,
ADD COLUMN faction TEXT DEFAULT NULL,
ADD COLUMN sub_faction TEXT DEFAULT NULL,
ADD COLUMN current_points INTEGER DEFAULT NULL,
ADD COLUMN additional_info TEXT DEFAULT NULL;

-- Create player_narrative_entries table for player-specific narrative
CREATE TABLE public.player_narrative_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.player_narrative_entries ENABLE ROW LEVEL SECURITY;

-- Players can view their own narrative entries
CREATE POLICY "Players can view own narrative entries"
ON public.player_narrative_entries
FOR SELECT
USING (auth.uid() = player_id);

-- GMs and campaign members can view all player narratives in their campaign
CREATE POLICY "Campaign members can view player narratives"
ON public.player_narrative_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = player_narrative_entries.campaign_id 
    AND campaign_players.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = player_narrative_entries.campaign_id 
    AND campaigns.owner_id = auth.uid()
  )
);

-- Players can insert their own entries
CREATE POLICY "Players can create own narrative entries"
ON public.player_narrative_entries
FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Players can update their own entries
CREATE POLICY "Players can update own narrative entries"
ON public.player_narrative_entries
FOR UPDATE
USING (auth.uid() = player_id);

-- Players can delete their own entries
CREATE POLICY "Players can delete own narrative entries"
ON public.player_narrative_entries
FOR DELETE
USING (auth.uid() = player_id);

-- Add updated_at trigger
CREATE TRIGGER update_player_narrative_entries_updated_at
BEFORE UPDATE ON public.player_narrative_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
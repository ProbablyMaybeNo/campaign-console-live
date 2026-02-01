-- Create table for dice roll history
CREATE TABLE public.dice_roll_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  dice_config TEXT NOT NULL,
  rolls INTEGER[] NOT NULL,
  total INTEGER NOT NULL,
  rolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dice_roll_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Campaign members can view roll history" 
ON public.dice_roll_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = dice_roll_history.campaign_id AND campaign_players.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns WHERE campaigns.id = dice_roll_history.campaign_id AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Campaign members can record rolls" 
ON public.dice_roll_history 
FOR INSERT 
WITH CHECK (
  auth.uid() = player_id AND (
    EXISTS (
      SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = dice_roll_history.campaign_id AND campaign_players.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = dice_roll_history.campaign_id AND campaigns.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "GMs can delete roll history" 
ON public.dice_roll_history 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM campaigns WHERE campaigns.id = dice_roll_history.campaign_id AND campaigns.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = dice_roll_history.campaign_id AND campaign_players.user_id = auth.uid() AND campaign_players.role = 'gm'
  )
);

-- Enable realtime for roll history
ALTER PUBLICATION supabase_realtime ADD TABLE public.dice_roll_history;

-- Create index for efficient queries
CREATE INDEX idx_dice_roll_history_campaign ON public.dice_roll_history(campaign_id, rolled_at DESC);
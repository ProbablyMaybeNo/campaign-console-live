-- Create wargame_rules table to cache fetched rules data from GitHub repos
CREATE TABLE public.wargame_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, category, rule_key)
);

-- Enable RLS
ALTER TABLE public.wargame_rules ENABLE ROW LEVEL SECURITY;

-- Campaign members can view rules
CREATE POLICY "Campaign members can view rules" 
ON public.wargame_rules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = wargame_rules.campaign_id 
    AND campaign_players.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = wargame_rules.campaign_id 
    AND campaigns.owner_id = auth.uid()
  )
);

-- GMs can manage rules
CREATE POLICY "GMs can insert rules" 
ON public.wargame_rules 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = wargame_rules.campaign_id 
    AND campaigns.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = wargame_rules.campaign_id 
    AND campaign_players.user_id = auth.uid() 
    AND campaign_players.role = 'gm'
  )
);

CREATE POLICY "GMs can update rules" 
ON public.wargame_rules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = wargame_rules.campaign_id 
    AND campaigns.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = wargame_rules.campaign_id 
    AND campaign_players.user_id = auth.uid() 
    AND campaign_players.role = 'gm'
  )
);

CREATE POLICY "GMs can delete rules" 
ON public.wargame_rules 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = wargame_rules.campaign_id 
    AND campaigns.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaign_players 
    WHERE campaign_players.campaign_id = wargame_rules.campaign_id 
    AND campaign_players.user_id = auth.uid() 
    AND campaign_players.role = 'gm'
  )
);

-- Add index for fast lookups
CREATE INDEX idx_wargame_rules_campaign_category ON public.wargame_rules(campaign_id, category);

-- Add trigger for updated_at
CREATE TRIGGER update_wargame_rules_updated_at
BEFORE UPDATE ON public.wargame_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
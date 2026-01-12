-- Campaign Units Library (GM-managed unit templates)
CREATE TABLE public.campaign_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  faction TEXT NOT NULL,
  sub_faction TEXT,
  name TEXT NOT NULL,
  base_cost INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}',
  abilities JSONB NOT NULL DEFAULT '[]',
  equipment_options JSONB NOT NULL DEFAULT '[]',
  keywords JSONB NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'manual',
  source_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(campaign_id, faction, name)
);

-- Enable RLS
ALTER TABLE public.campaign_units ENABLE ROW LEVEL SECURITY;

-- Anyone in campaign can view units
CREATE POLICY "Campaign members can view units"
ON public.campaign_units
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_players.campaign_id = campaign_units.campaign_id
    AND campaign_players.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_units.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Only GMs can insert units
CREATE POLICY "GMs can insert units"
ON public.campaign_units
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_units.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_players.campaign_id = campaign_units.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

-- Only GMs can update units
CREATE POLICY "GMs can update units"
ON public.campaign_units
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_units.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_players.campaign_id = campaign_units.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

-- Only GMs can delete units
CREATE POLICY "GMs can delete units"
ON public.campaign_units
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_units.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_players.campaign_id = campaign_units.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_campaign_units_updated_at
BEFORE UPDATE ON public.campaign_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create campaign_maps table (one map per campaign)
CREATE TABLE public.campaign_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  image_url TEXT,
  title TEXT NOT NULL DEFAULT 'Campaign Map',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id)
);

-- Create map_legend_items table
CREATE TABLE public.map_legend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.campaign_maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  shape TEXT NOT NULL DEFAULT 'circle',
  color TEXT NOT NULL DEFAULT '#ef4444',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create map_markers table
CREATE TABLE public.map_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES public.campaign_maps(id) ON DELETE CASCADE,
  legend_item_id UUID REFERENCES public.map_legend_items(id) ON DELETE SET NULL,
  label TEXT,
  position_x FLOAT NOT NULL DEFAULT 50,
  position_y FLOAT NOT NULL DEFAULT 50,
  visibility TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.campaign_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_legend_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_maps
CREATE POLICY "Campaign members can view maps"
ON public.campaign_maps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_players
    WHERE campaign_players.campaign_id = campaign_maps.campaign_id
    AND campaign_players.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_maps.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "GMs can insert maps"
ON public.campaign_maps FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_maps.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_players
    WHERE campaign_players.campaign_id = campaign_maps.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

CREATE POLICY "GMs can update maps"
ON public.campaign_maps FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_maps.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_players
    WHERE campaign_players.campaign_id = campaign_maps.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

CREATE POLICY "GMs can delete maps"
ON public.campaign_maps FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE campaigns.id = campaign_maps.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_players
    WHERE campaign_players.campaign_id = campaign_maps.campaign_id
    AND campaign_players.user_id = auth.uid()
    AND campaign_players.role = 'gm'
  )
);

-- RLS Policies for map_legend_items
CREATE POLICY "Campaign members can view legend items"
ON public.map_legend_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaign_players cp ON cp.campaign_id = cm.campaign_id
    WHERE cm.id = map_legend_items.map_id
    AND cp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_legend_items.map_id
    AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "GMs can manage legend items"
ON public.map_legend_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_legend_items.map_id
    AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaign_players cp ON cp.campaign_id = cm.campaign_id
    WHERE cm.id = map_legend_items.map_id
    AND cp.user_id = auth.uid()
    AND cp.role = 'gm'
  )
);

-- RLS Policies for map_markers
CREATE POLICY "Campaign members can view markers"
ON public.map_markers FOR SELECT
USING (
  (
    visibility = 'all'
    AND (
      EXISTS (
        SELECT 1 FROM public.campaign_maps cm
        JOIN public.campaign_players cp ON cp.campaign_id = cm.campaign_id
        WHERE cm.id = map_markers.map_id
        AND cp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.campaign_maps cm
        JOIN public.campaigns c ON c.id = cm.campaign_id
        WHERE cm.id = map_markers.map_id
        AND c.owner_id = auth.uid()
      )
    )
  )
  OR (
    visibility = 'gm_only'
    AND (
      EXISTS (
        SELECT 1 FROM public.campaign_maps cm
        JOIN public.campaigns c ON c.id = cm.campaign_id
        WHERE cm.id = map_markers.map_id
        AND c.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.campaign_maps cm
        JOIN public.campaign_players cp ON cp.campaign_id = cm.campaign_id
        WHERE cm.id = map_markers.map_id
        AND cp.user_id = auth.uid()
        AND cp.role = 'gm'
      )
    )
  )
);

CREATE POLICY "GMs can manage markers"
ON public.map_markers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_markers.map_id
    AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.campaign_maps cm
    JOIN public.campaign_players cp ON cp.campaign_id = cm.campaign_id
    WHERE cm.id = map_markers.map_id
    AND cp.user_id = auth.uid()
    AND cp.role = 'gm'
  )
);

-- Trigger for updated_at on campaign_maps
CREATE TRIGGER update_campaign_maps_updated_at
BEFORE UPDATE ON public.campaign_maps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add fog_regions table for fog of war
CREATE TABLE public.map_fog_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  map_id UUID NOT NULL REFERENCES public.campaign_maps(id) ON DELETE CASCADE,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 10,
  height FLOAT NOT NULL DEFAULT 10,
  revealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.map_fog_regions ENABLE ROW LEVEL SECURITY;

-- Players can view fog regions (to know what's revealed)
CREATE POLICY "Campaign members can view fog regions" ON public.map_fog_regions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaign_maps cm
      JOIN campaigns c ON cm.campaign_id = c.id
      WHERE cm.id = map_fog_regions.map_id
      AND (
        c.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM campaign_players cp
          WHERE cp.campaign_id = c.id AND cp.user_id = auth.uid()
        )
      )
    )
  );

-- Only GM can modify fog regions
CREATE POLICY "GM can manage fog regions" ON public.map_fog_regions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaign_maps cm
      JOIN campaigns c ON cm.campaign_id = c.id
      WHERE cm.id = map_fog_regions.map_id AND c.owner_id = auth.uid()
    )
  );
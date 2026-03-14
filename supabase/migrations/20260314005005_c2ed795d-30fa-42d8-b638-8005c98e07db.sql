
-- Canvas annotations table for text, lines, and rectangles on the dashboard
CREATE TABLE public.canvas_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  annotation_type text NOT NULL DEFAULT 'text', -- 'text', 'line', 'rectangle'
  content text DEFAULT '',
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 120,
  height integer NOT NULL DEFAULT 40,
  -- For lines: end point (position_x/y is start)
  end_x integer DEFAULT NULL,
  end_y integer DEFAULT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  font_size integer DEFAULT 16,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canvas_annotations ENABLE ROW LEVEL SECURITY;

-- Members can view all annotations in their campaign
CREATE POLICY "Campaign members can view annotations"
  ON public.canvas_annotations FOR SELECT
  TO authenticated
  USING (
    is_campaign_member(campaign_id, auth.uid()) 
    OR is_campaign_owner(campaign_id, auth.uid())
  );

-- GMs can always create annotations
CREATE POLICY "GMs can create annotations"
  ON public.canvas_annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND is_campaign_gm(campaign_id, auth.uid())
  );

-- Players can create annotations (app checks display_settings.allow_player_annotations)
CREATE POLICY "Players can create own annotations"
  ON public.canvas_annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
    AND is_campaign_member(campaign_id, auth.uid())
  );

-- Creators can update their own annotations
CREATE POLICY "Creators can update own annotations"
  ON public.canvas_annotations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR has_full_gm_access(campaign_id, auth.uid())
  );

-- Creators and GMs can delete annotations
CREATE POLICY "Creators and GMs can delete annotations"
  ON public.canvas_annotations FOR DELETE
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR has_full_gm_access(campaign_id, auth.uid())
  );

-- Limit: 50 annotations per user per campaign
CREATE OR REPLACE FUNCTION public.check_annotation_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.canvas_annotations
  WHERE campaign_id = NEW.campaign_id
    AND creator_id = NEW.creator_id;
  
  IF current_count >= 50 THEN
    RAISE EXCEPTION 'Annotation limit reached (50 per user per campaign)';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_annotation_limit_trigger
  BEFORE INSERT ON public.canvas_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_annotation_limit();

-- Enable realtime for annotations
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_annotations;

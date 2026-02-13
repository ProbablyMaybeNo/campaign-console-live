-- =====================================================
-- GM Role Hierarchy Migration
-- Roles: owner (implicit), co_gm (full control), assistant (limited), player
-- =====================================================

-- Create a helper function to check if user is a GM (any level) for a campaign
CREATE OR REPLACE FUNCTION public.is_campaign_gm(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Is owner
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = _campaign_id AND owner_id = _user_id)
    OR
    -- Has GM role (gm, co_gm, or assistant)
    EXISTS (
      SELECT 1 FROM public.campaign_players 
      WHERE campaign_id = _campaign_id 
        AND user_id = _user_id 
        AND role IN ('gm', 'co_gm', 'assistant')
    )
$$;

-- Create a helper function to check if user has full GM control (owner, gm, or co_gm)
CREATE OR REPLACE FUNCTION public.has_full_gm_access(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Is owner
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = _campaign_id AND owner_id = _user_id)
    OR
    -- Has full GM role (gm or co_gm)
    EXISTS (
      SELECT 1 FROM public.campaign_players 
      WHERE campaign_id = _campaign_id 
        AND user_id = _user_id 
        AND role IN ('gm', 'co_gm')
    )
$$;

-- =====================================================
-- Update dashboard_components policies
-- co_gm: full access, assistant: update only
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "GMs can manage components" ON public.dashboard_components;
DROP POLICY IF EXISTS "GMs can update components" ON public.dashboard_components;
DROP POLICY IF EXISTS "GMs can delete components" ON public.dashboard_components;

-- INSERT: Only owner, gm, co_gm can create components
CREATE POLICY "Full GMs can create components"
ON public.dashboard_components
FOR INSERT
WITH CHECK (public.has_full_gm_access(campaign_id, auth.uid()));

-- UPDATE: All GM roles (including assistant) can edit
CREATE POLICY "All GMs can update components"
ON public.dashboard_components
FOR UPDATE
USING (public.is_campaign_gm(campaign_id, auth.uid()));

-- DELETE: Only owner, gm, co_gm can delete components
CREATE POLICY "Full GMs can delete components"
ON public.dashboard_components
FOR DELETE
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- =====================================================
-- Update campaign_players policies
-- assistant cannot remove other players
-- =====================================================

DROP POLICY IF EXISTS "Campaign owners or self can remove" ON public.campaign_players;
DROP POLICY IF EXISTS "Players can update own campaign settings" ON public.campaign_players;

-- DELETE: Owner, gm, co_gm can remove players; players can remove self
CREATE POLICY "GMs and self can remove players"
ON public.campaign_players
FOR DELETE
USING (
  (user_id = auth.uid())  -- Can remove self
  OR public.has_full_gm_access(campaign_id, auth.uid())  -- Full GMs can remove others
);

-- UPDATE: Players can update own, or full GMs can update any
CREATE POLICY "Players and GMs can update player settings"
ON public.campaign_players
FOR UPDATE
USING (
  (user_id = auth.uid())  -- Own settings
  OR public.has_full_gm_access(campaign_id, auth.uid())  -- Full GMs can edit anyone
);

-- =====================================================
-- Update other table policies to include all GM roles
-- =====================================================

-- Messages: All GM roles can post announcements
DROP POLICY IF EXISTS "Campaign members can post messages" ON public.messages;
CREATE POLICY "Campaign members can post messages"
ON public.messages
FOR INSERT
WITH CHECK (
  (auth.uid() = author_id) 
  AND (
    public.is_campaign_member(campaign_id, auth.uid())
    OR public.is_campaign_owner(campaign_id, auth.uid())
  )
);

-- Schedule entries: Full GMs only for create/delete, assistants can update
DROP POLICY IF EXISTS "GMs can manage schedule" ON public.schedule_entries;
DROP POLICY IF EXISTS "GMs can update schedule" ON public.schedule_entries;
DROP POLICY IF EXISTS "GMs can delete schedule" ON public.schedule_entries;

CREATE POLICY "Full GMs can create schedule"
ON public.schedule_entries
FOR INSERT
WITH CHECK (public.has_full_gm_access(campaign_id, auth.uid()));

CREATE POLICY "All GMs can update schedule"
ON public.schedule_entries
FOR UPDATE
USING (public.is_campaign_gm(campaign_id, auth.uid()));

CREATE POLICY "Full GMs can delete schedule"
ON public.schedule_entries
FOR DELETE
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- Narrative events: Full GMs can create, all GMs can update
DROP POLICY IF EXISTS "GMs can create narrative events" ON public.narrative_events;
DROP POLICY IF EXISTS "Authors can update narrative events" ON public.narrative_events;
DROP POLICY IF EXISTS "Authors can delete narrative events" ON public.narrative_events;

CREATE POLICY "Full GMs can create narrative events"
ON public.narrative_events
FOR INSERT
WITH CHECK (
  (auth.uid() = author_id) 
  AND public.has_full_gm_access(campaign_id, auth.uid())
);

CREATE POLICY "GMs can update narrative events"
ON public.narrative_events
FOR UPDATE
USING (
  (auth.uid() = author_id)
  OR public.is_campaign_gm(campaign_id, auth.uid())
);

CREATE POLICY "Full GMs can delete narrative events"
ON public.narrative_events
FOR DELETE
USING (
  (auth.uid() = author_id)
  OR public.has_full_gm_access(campaign_id, auth.uid())
);

-- Battle rounds: Full GMs only
DROP POLICY IF EXISTS "GMs can manage rounds" ON public.battle_rounds;
CREATE POLICY "Full GMs can manage rounds"
ON public.battle_rounds
FOR ALL
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- Battle matches: Full GMs for management
DROP POLICY IF EXISTS "GMs can manage matches" ON public.battle_matches;
CREATE POLICY "Full GMs can manage matches"
ON public.battle_matches
FOR ALL
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- Wargame rules: Full GMs for create/delete, all GMs for update
DROP POLICY IF EXISTS "GMs can insert rules" ON public.wargame_rules;
DROP POLICY IF EXISTS "GMs can update rules" ON public.wargame_rules;
DROP POLICY IF EXISTS "GMs can delete rules" ON public.wargame_rules;

CREATE POLICY "Full GMs can create rules"
ON public.wargame_rules
FOR INSERT
WITH CHECK (public.has_full_gm_access(campaign_id, auth.uid()));

CREATE POLICY "All GMs can update rules"
ON public.wargame_rules
FOR UPDATE
USING (public.is_campaign_gm(campaign_id, auth.uid()));

CREATE POLICY "Full GMs can delete rules"
ON public.wargame_rules
FOR DELETE
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- Campaign maps: Full GMs only
DROP POLICY IF EXISTS "GMs can insert maps" ON public.campaign_maps;
DROP POLICY IF EXISTS "GMs can update maps" ON public.campaign_maps;
DROP POLICY IF EXISTS "GMs can delete maps" ON public.campaign_maps;

CREATE POLICY "Full GMs can create maps"
ON public.campaign_maps
FOR INSERT
WITH CHECK (public.has_full_gm_access(campaign_id, auth.uid()));

CREATE POLICY "All GMs can update maps"
ON public.campaign_maps
FOR UPDATE
USING (public.is_campaign_gm(campaign_id, auth.uid()));

CREATE POLICY "Full GMs can delete maps"
ON public.campaign_maps
FOR DELETE
USING (public.has_full_gm_access(campaign_id, auth.uid()));

-- Map markers: All GMs can manage
DROP POLICY IF EXISTS "GMs can manage markers" ON public.map_markers;
CREATE POLICY "GMs can manage markers"
ON public.map_markers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaign_maps cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_markers.map_id
    AND public.is_campaign_gm(c.id, auth.uid())
  )
);

-- Map legend items: All GMs can manage
DROP POLICY IF EXISTS "GMs can manage legend items" ON public.map_legend_items;
CREATE POLICY "GMs can manage legend items"
ON public.map_legend_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaign_maps cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_legend_items.map_id
    AND public.is_campaign_gm(c.id, auth.uid())
  )
);

-- Map fog regions: Full GMs only
DROP POLICY IF EXISTS "GM can manage fog regions" ON public.map_fog_regions;
CREATE POLICY "Full GMs can manage fog regions"
ON public.map_fog_regions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaign_maps cm
    JOIN campaigns c ON c.id = cm.campaign_id
    WHERE cm.id = map_fog_regions.map_id
    AND public.has_full_gm_access(c.id, auth.uid())
  )
);

-- Dice roll history: All GMs can delete
DROP POLICY IF EXISTS "GMs can delete roll history" ON public.dice_roll_history;
CREATE POLICY "GMs can delete roll history"
ON public.dice_roll_history
FOR DELETE
USING (public.is_campaign_gm(campaign_id, auth.uid()));
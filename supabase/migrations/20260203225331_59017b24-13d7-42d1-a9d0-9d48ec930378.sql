-- Battle Tracker Schema

-- 1) Battle Rounds table
CREATE TABLE public.battle_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Round 1',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  pairing_system TEXT NOT NULL DEFAULT 'manual',
  starts_at DATE,
  ends_at DATE,
  constraints_config JSONB DEFAULT '{}',
  scoring_config JSONB DEFAULT '{"win": 3, "draw": 1, "loss": 0, "requireNarrative": false, "autoApprove": false, "quickResultAllowed": true}'::jsonb,
  report_fields_config JSONB DEFAULT '{"narrative": true, "injuries": true, "loot": true, "events": true, "resources": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, round_index)
);

-- 2) Battle Matches table
CREATE TABLE public.battle_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.battle_rounds(id) ON DELETE CASCADE,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{playerId, playerName, warbandId?, side: 'a'|'b'|'c'|'d'}]
  status TEXT NOT NULL DEFAULT 'unplayed' CHECK (status IN ('unplayed', 'played', 'submitted', 'approved', 'disputed')),
  is_bye BOOLEAN NOT NULL DEFAULT false,
  provisional_results JSONB DEFAULT '{}'::jsonb, -- {playerId: {outcome: 'win'|'loss'|'draw', points: number}}
  final_results JSONB DEFAULT '{}'::jsonb,
  match_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Battle Reports table
CREATE TABLE public.battle_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.battle_matches(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL,
  player_side TEXT NOT NULL DEFAULT 'a', -- which side is submitting
  outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss', 'draw')),
  points_earned INTEGER DEFAULT 0,
  narrative TEXT,
  injuries JSONB DEFAULT '[]'::jsonb, -- [{unitName, injury, notes}]
  notable_events JSONB DEFAULT '[]'::jsonb, -- [{tag, description}]
  loot_found JSONB DEFAULT '[]'::jsonb, -- [{item, quantity, notes}]
  resources JSONB DEFAULT '{}'::jsonb, -- {gained: number, spent: number}
  attachments JSONB DEFAULT '[]'::jsonb, -- [{url, type, name}]
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) Battle Audit Trail table
CREATE TABLE public.battle_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'round', 'match', 'report'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'approve', 'dispute_resolve'
  changed_by UUID NOT NULL,
  changes JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_battle_rounds_campaign ON public.battle_rounds(campaign_id);
CREATE INDEX idx_battle_matches_round ON public.battle_matches(round_id);
CREATE INDEX idx_battle_matches_campaign ON public.battle_matches(campaign_id);
CREATE INDEX idx_battle_reports_match ON public.battle_reports(match_id);
CREATE INDEX idx_battle_audit_campaign ON public.battle_audit_trail(campaign_id);

-- Enable RLS on all tables
ALTER TABLE public.battle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_audit_trail ENABLE ROW LEVEL SECURITY;

-- Enable realtime for matches and reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_reports;

-- RLS Policies for battle_rounds
CREATE POLICY "Campaign members can view rounds"
ON public.battle_rounds FOR SELECT
USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = battle_rounds.campaign_id AND campaign_players.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = battle_rounds.campaign_id AND campaigns.owner_id = auth.uid())
);

CREATE POLICY "GMs can manage rounds"
ON public.battle_rounds FOR ALL
USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = battle_rounds.campaign_id AND campaigns.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = battle_rounds.campaign_id AND campaign_players.user_id = auth.uid() AND campaign_players.role = 'gm')
);

-- RLS Policies for battle_matches
CREATE POLICY "Campaign members can view matches"
ON public.battle_matches FOR SELECT
USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = battle_matches.campaign_id AND campaign_players.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = battle_matches.campaign_id AND campaigns.owner_id = auth.uid())
);

CREATE POLICY "GMs can manage matches"
ON public.battle_matches FOR ALL
USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = battle_matches.campaign_id AND campaigns.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = battle_matches.campaign_id AND campaign_players.user_id = auth.uid() AND campaign_players.role = 'gm')
);

CREATE POLICY "Players can update their matches"
ON public.battle_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM battle_rounds br 
    WHERE br.id = battle_matches.round_id 
    AND br.status = 'open'
  )
  AND (
    battle_matches.participants::jsonb @> jsonb_build_array(jsonb_build_object('playerId', auth.uid()::text))
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(battle_matches.participants) AS p 
      WHERE p->>'playerId' = auth.uid()::text
    )
  )
);

-- RLS Policies for battle_reports
CREATE POLICY "Campaign members can view reports"
ON public.battle_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM battle_matches bm 
    JOIN campaign_players cp ON cp.campaign_id = bm.campaign_id 
    WHERE bm.id = battle_reports.match_id AND cp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM battle_matches bm 
    JOIN campaigns c ON c.id = bm.campaign_id 
    WHERE bm.id = battle_reports.match_id AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Participants can submit reports"
ON public.battle_reports FOR INSERT
WITH CHECK (
  auth.uid() = submitted_by
  AND EXISTS (
    SELECT 1 FROM battle_matches bm 
    JOIN battle_rounds br ON br.id = bm.round_id
    WHERE bm.id = battle_reports.match_id 
    AND br.status = 'open'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(bm.participants) AS p 
      WHERE p->>'playerId' = auth.uid()::text
    )
  )
);

CREATE POLICY "Authors can update own reports"
ON public.battle_reports FOR UPDATE
USING (auth.uid() = submitted_by);

CREATE POLICY "GMs can manage reports"
ON public.battle_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM battle_matches bm 
    JOIN campaigns c ON c.id = bm.campaign_id 
    WHERE bm.id = battle_reports.match_id AND c.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM battle_matches bm 
    JOIN campaign_players cp ON cp.campaign_id = bm.campaign_id 
    WHERE bm.id = battle_reports.match_id AND cp.user_id = auth.uid() AND cp.role = 'gm'
  )
);

-- RLS Policies for battle_audit_trail
CREATE POLICY "GMs can view audit trail"
ON public.battle_audit_trail FOR SELECT
USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = battle_audit_trail.campaign_id AND campaigns.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = battle_audit_trail.campaign_id AND campaign_players.user_id = auth.uid() AND campaign_players.role = 'gm')
);

CREATE POLICY "System can insert audit entries"
ON public.battle_audit_trail FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Triggers for updated_at
CREATE TRIGGER update_battle_rounds_updated_at
BEFORE UPDATE ON public.battle_rounds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_battle_matches_updated_at
BEFORE UPDATE ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_battle_reports_updated_at
BEFORE UPDATE ON public.battle_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
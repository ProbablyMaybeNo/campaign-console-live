-- =============================================
-- CENTRALIZED GAME SYSTEMS LIBRARY
-- =============================================

-- 1. Game Systems - Master list of available wargames (admin-controlled)
CREATE TABLE public.game_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  repo_url TEXT,
  repo_type TEXT NOT NULL DEFAULT 'battlescribe' CHECK (repo_type IN ('battlescribe', 'custom', 'manual')),
  version TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'deprecated')),
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Master Factions - Factions/catalogues per game system
CREATE TABLE public.master_factions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_system_id UUID NOT NULL REFERENCES public.game_systems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  source_file TEXT,
  rules_text JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_system_id, slug)
);

-- 3. Master Units - All units from parsed repositories
CREATE TABLE public.master_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_system_id UUID NOT NULL REFERENCES public.game_systems(id) ON DELETE CASCADE,
  faction_id UUID NOT NULL REFERENCES public.master_factions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_cost INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  abilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '{}'::jsonb,
  source_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_system_id, faction_id, source_id)
);

-- 4. Master Rules - Game-wide and shared rules
CREATE TABLE public.master_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_system_id UUID NOT NULL REFERENCES public.game_systems(id) ON DELETE CASCADE,
  faction_id UUID REFERENCES public.master_factions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'gm_only')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_system_id, rule_key)
);

-- 5. Add game_system_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN game_system_id UUID REFERENCES public.game_systems(id) ON DELETE SET NULL;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_master_factions_game_system ON public.master_factions(game_system_id);
CREATE INDEX idx_master_units_game_system ON public.master_units(game_system_id);
CREATE INDEX idx_master_units_faction ON public.master_units(faction_id);
CREATE INDEX idx_master_rules_game_system ON public.master_rules(game_system_id);
CREATE INDEX idx_master_rules_faction ON public.master_rules(faction_id);
CREATE INDEX idx_campaigns_game_system ON public.campaigns(game_system_id);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_game_systems_updated_at
  BEFORE UPDATE ON public.game_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_factions_updated_at
  BEFORE UPDATE ON public.master_factions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_units_updated_at
  BEFORE UPDATE ON public.master_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_rules_updated_at
  BEFORE UPDATE ON public.master_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.game_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_rules ENABLE ROW LEVEL SECURITY;

-- Game Systems: Public read for authenticated users
CREATE POLICY "Authenticated users can view active game systems"
  ON public.game_systems
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Master Factions: Public read for authenticated users
CREATE POLICY "Authenticated users can view master factions"
  ON public.master_factions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Master Units: Public read for authenticated users  
CREATE POLICY "Authenticated users can view master units"
  ON public.master_units
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Master Rules: Public read for authenticated users (respecting visibility)
CREATE POLICY "Authenticated users can view public master rules"
  ON public.master_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND visibility = 'public');
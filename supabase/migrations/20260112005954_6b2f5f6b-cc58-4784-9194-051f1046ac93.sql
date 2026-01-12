-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules_repo_url TEXT,
  rules_repo_ref TEXT,
  points_limit INTEGER DEFAULT 1000,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create campaign_players table (join table for players in campaigns)
CREATE TABLE public.campaign_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('gm', 'player')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

-- Create dashboard_components table
CREATE TABLE public.dashboard_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  component_type TEXT NOT NULL,
  data_source TEXT NOT NULL DEFAULT 'custom',
  config JSONB DEFAULT '{}',
  position_x INTEGER NOT NULL DEFAULT 100,
  position_y INTEGER NOT NULL DEFAULT 100,
  width INTEGER NOT NULL DEFAULT 300,
  height INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create warbands table
CREATE TABLE public.warbands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  faction TEXT,
  sub_faction TEXT,
  points_total INTEGER DEFAULT 0,
  roster JSONB DEFAULT '[]',
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, owner_id)
);

-- Create narrative_events table
CREATE TABLE public.narrative_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  event_type TEXT DEFAULT 'story' CHECK (event_type IN ('story', 'battle', 'milestone', 'announcement')),
  image_url TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'gm_only')),
  event_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create schedule_entries table
CREATE TABLE public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  scenario TEXT,
  scheduled_date TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Campaigns policies
CREATE POLICY "Anyone can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = owner_id);

-- Campaign players policies
CREATE POLICY "Anyone can view campaign players" ON public.campaign_players FOR SELECT USING (true);
CREATE POLICY "Campaign owners can add players" ON public.campaign_players FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));
CREATE POLICY "Campaign owners or self can remove" ON public.campaign_players FOR DELETE 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));

-- Dashboard components policies
CREATE POLICY "Campaign members can view components" ON public.dashboard_components FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = dashboard_components.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));
CREATE POLICY "GMs can manage components" ON public.dashboard_components FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = dashboard_components.campaign_id AND user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "GMs can update components" ON public.dashboard_components FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = dashboard_components.campaign_id AND user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "GMs can delete components" ON public.dashboard_components FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = dashboard_components.campaign_id AND user_id = auth.uid() AND role = 'gm'));

-- Messages policies
CREATE POLICY "Campaign members can view messages" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = messages.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));
CREATE POLICY "Campaign members can post messages" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = author_id AND (
    EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = messages.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  ));
CREATE POLICY "Authors can delete their messages" ON public.messages FOR DELETE USING (auth.uid() = author_id);

-- Warbands policies
CREATE POLICY "Campaign members can view warbands" ON public.warbands FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = warbands.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));
CREATE POLICY "Users can create own warband" ON public.warbands FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own warband" ON public.warbands FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own warband" ON public.warbands FOR DELETE USING (auth.uid() = owner_id);

-- Narrative events policies
CREATE POLICY "View narrative events" ON public.narrative_events FOR SELECT 
  USING ((visibility = 'public' AND (
    EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = narrative_events.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
  )) OR (visibility = 'gm_only' AND (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = narrative_events.campaign_id AND user_id = auth.uid() AND role = 'gm')
  )));
CREATE POLICY "GMs can create narrative events" ON public.narrative_events FOR INSERT 
  WITH CHECK (auth.uid() = author_id AND (
    EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = narrative_events.campaign_id AND user_id = auth.uid() AND role = 'gm')
  ));
CREATE POLICY "Authors can update narrative events" ON public.narrative_events FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors can delete narrative events" ON public.narrative_events FOR DELETE USING (auth.uid() = author_id);

-- Schedule entries policies
CREATE POLICY "Campaign members can view schedule" ON public.schedule_entries FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = schedule_entries.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid()));
CREATE POLICY "GMs can manage schedule" ON public.schedule_entries FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = schedule_entries.campaign_id AND user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "GMs can update schedule" ON public.schedule_entries FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = schedule_entries.campaign_id AND user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "GMs can delete schedule" ON public.schedule_entries FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.campaign_players WHERE campaign_id = schedule_entries.campaign_id AND user_id = auth.uid() AND role = 'gm'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dashboard_components_updated_at BEFORE UPDATE ON public.dashboard_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warbands_updated_at BEFORE UPDATE ON public.warbands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
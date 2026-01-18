-- =====================================================
-- RULES IMPORT SYSTEM V2 - CANONICAL DATA MODEL
-- =====================================================

-- 1) Rules Sources - top-level container for each import
CREATE TABLE public.rules_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'paste', 'github_json')),
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  storage_path TEXT, -- For PDFs only
  github_repo_url TEXT, -- For github_json only
  github_json_path TEXT, -- For github_json only
  github_imported_at TIMESTAMPTZ,
  index_status TEXT NOT NULL DEFAULT 'not_indexed' CHECK (index_status IN ('not_indexed', 'indexing', 'indexed', 'failed')),
  index_stats JSONB DEFAULT '{}',
  index_error JSONB,
  last_indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Rules Pages - canonical page-by-page storage
CREATE TABLE public.rules_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Rules Sections - grouped hierarchy derived from pages
CREATE TABLE public.rules_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  section_path TEXT[] DEFAULT '{}', -- ["Chapter", "Section", "Subsection"]
  page_start INTEGER,
  page_end INTEGER,
  text TEXT,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Rules Chunks - retrieval units for AI search
CREATE TABLE public.rules_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.rules_sections(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  section_path TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  keywords TEXT[] DEFAULT '{}',
  score_hints JSONB DEFAULT '{}', -- { hasRollRanges, hasTablePattern }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) Rules Tables - first-class table objects
CREATE TABLE public.rules_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.rules_sections(id) ON DELETE SET NULL,
  title_guess TEXT,
  header_context TEXT,
  page_number INTEGER,
  raw_text TEXT,
  parsed_rows JSONB, -- Best-effort structured rows
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) Rules Datasets - structured data collections
CREATE TABLE public.rules_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dataset_type TEXT NOT NULL DEFAULT 'other' CHECK (dataset_type IN ('equipment', 'skills', 'spells', 'tables', 'injuries', 'other')),
  fields JSONB DEFAULT '[]', -- Field definitions
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) Dataset Rows - individual rows in a dataset
CREATE TABLE public.rules_dataset_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.rules_datasets(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  page_number INTEGER, -- Provenance
  source_path TEXT, -- For github_json provenance
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Add visibility column to dashboard_components
ALTER TABLE public.dashboard_components 
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all_players' 
CHECK (visibility IN ('gm_only', 'all_players'));

-- 9) Add data source reference columns to dashboard_components
ALTER TABLE public.dashboard_components
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.rules_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_table_id UUID REFERENCES public.rules_tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_dataset_id UUID REFERENCES public.rules_datasets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_chunk_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS linked_section_ids UUID[] DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.rules_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_dataset_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rules_sources (campaign members can read, owner can write)
CREATE POLICY "Campaign members can view rules sources"
  ON public.rules_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_players
      WHERE campaign_players.campaign_id = rules_sources.campaign_id
        AND campaign_players.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = rules_sources.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules sources"
  ON public.rules_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = rules_sources.campaign_id
        AND campaigns.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_pages
CREATE POLICY "Campaign members can view rules pages"
  ON public.rules_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rs.id = rules_pages.source_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_pages.source_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules pages"
  ON public.rules_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_pages.source_id AND c.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_sections
CREATE POLICY "Campaign members can view rules sections"
  ON public.rules_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rs.id = rules_sections.source_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_sections.source_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules sections"
  ON public.rules_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_sections.source_id AND c.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_chunks
CREATE POLICY "Campaign members can view rules chunks"
  ON public.rules_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rs.id = rules_chunks.source_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_chunks.source_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules chunks"
  ON public.rules_chunks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_chunks.source_id AND c.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_tables
CREATE POLICY "Campaign members can view rules tables"
  ON public.rules_tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rs.id = rules_tables.source_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_tables.source_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules tables"
  ON public.rules_tables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_tables.source_id AND c.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_datasets
CREATE POLICY "Campaign members can view rules datasets"
  ON public.rules_datasets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rs.id = rules_datasets.source_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_datasets.source_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage rules datasets"
  ON public.rules_datasets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_sources rs
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rs.id = rules_datasets.source_id AND c.owner_id = auth.uid()
    )
  );

-- RLS Policies for rules_dataset_rows
CREATE POLICY "Campaign members can view dataset rows"
  ON public.rules_dataset_rows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_datasets rd
      JOIN public.rules_sources rs ON rs.id = rd.source_id
      JOIN public.campaign_players cp ON cp.campaign_id = rs.campaign_id
      WHERE rd.id = rules_dataset_rows.dataset_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.rules_datasets rd
      JOIN public.rules_sources rs ON rs.id = rd.source_id
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rd.id = rules_dataset_rows.dataset_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Campaign owner can manage dataset rows"
  ON public.rules_dataset_rows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rules_datasets rd
      JOIN public.rules_sources rs ON rs.id = rd.source_id
      JOIN public.campaigns c ON c.id = rs.campaign_id
      WHERE rd.id = rules_dataset_rows.dataset_id AND c.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_rules_sources_campaign ON public.rules_sources(campaign_id);
CREATE INDEX idx_rules_sources_status ON public.rules_sources(index_status);
CREATE INDEX idx_rules_pages_source ON public.rules_pages(source_id);
CREATE INDEX idx_rules_pages_number ON public.rules_pages(source_id, page_number);
CREATE INDEX idx_rules_sections_source ON public.rules_sections(source_id);
CREATE INDEX idx_rules_chunks_source ON public.rules_chunks(source_id);
CREATE INDEX idx_rules_chunks_section ON public.rules_chunks(section_id);
CREATE INDEX idx_rules_tables_source ON public.rules_tables(source_id);
CREATE INDEX idx_rules_tables_confidence ON public.rules_tables(confidence);
CREATE INDEX idx_rules_datasets_source ON public.rules_datasets(source_id);
CREATE INDEX idx_rules_dataset_rows_dataset ON public.rules_dataset_rows(dataset_id);
CREATE INDEX idx_dashboard_components_visibility ON public.dashboard_components(visibility);

-- Trigger for updated_at on rules_sources
CREATE TRIGGER update_rules_sources_updated_at
  BEFORE UPDATE ON public.rules_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
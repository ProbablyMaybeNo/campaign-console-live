-- Rules Library Canonical Store Schema
-- Supports PDF, Paste, and GitHub JSON source types with per-source indexing

-- Update rules_sources table structure for new requirements
ALTER TABLE public.rules_sources 
ADD COLUMN IF NOT EXISTS type_source VARCHAR(20) DEFAULT 'pdf',
ADD COLUMN IF NOT EXISTS raw_text TEXT,
ADD COLUMN IF NOT EXISTS github_sha VARCHAR(40),
ADD COLUMN IF NOT EXISTS pseudo_page_size INTEGER DEFAULT 8000;

-- Update existing index_status column to have proper values
UPDATE public.rules_sources 
SET index_status = 'not_indexed' 
WHERE index_status IS NULL OR index_status = '';

-- Add sectionId to rules_chunks if not exists
ALTER TABLE public.rules_chunks
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.rules_sections(id) ON DELETE CASCADE;

-- Add order_index to rules_chunks if not exists  
ALTER TABLE public.rules_chunks
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add score_hints to rules_chunks for AI auto-pick
ALTER TABLE public.rules_chunks
ADD COLUMN IF NOT EXISTS score_hints JSONB DEFAULT '{}';

-- Add confidence to rules_tables if not exists
ALTER TABLE public.rules_tables
ADD COLUMN IF NOT EXISTS confidence VARCHAR(20) DEFAULT 'medium';

-- Add section_id to rules_tables for linking
ALTER TABLE public.rules_tables
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.rules_sections(id) ON DELETE CASCADE;

-- Add keywords array to rules_tables
ALTER TABLE public.rules_tables  
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- Create rules_datasets table if not exists (for structured lists like equipment, skills)
CREATE TABLE IF NOT EXISTS public.rules_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES public.rules_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dataset_type VARCHAR(50) DEFAULT 'other', -- equipment, skills, spells, tables, other
  fields JSONB DEFAULT '[]',
  confidence VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rules_dataset_rows table if not exists
CREATE TABLE IF NOT EXISTS public.rules_dataset_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.rules_datasets(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  page_number INTEGER,
  source_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update dashboard_components to support linked_chunk_ids and linked_section_ids arrays
ALTER TABLE public.dashboard_components
ADD COLUMN IF NOT EXISTS linked_chunk_ids TEXT[],
ADD COLUMN IF NOT EXISTS linked_section_ids TEXT[],
ADD COLUMN IF NOT EXISTS linked_table_id UUID REFERENCES public.rules_tables(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_dataset_id UUID REFERENCES public.rules_datasets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.rules_sources(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rules_chunks_source_id ON public.rules_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_rules_chunks_section_id ON public.rules_chunks(section_id);
CREATE INDEX IF NOT EXISTS idx_rules_sections_source_id ON public.rules_sections(source_id);
CREATE INDEX IF NOT EXISTS idx_rules_tables_source_id ON public.rules_tables(source_id);
CREATE INDEX IF NOT EXISTS idx_rules_tables_section_id ON public.rules_tables(section_id);
CREATE INDEX IF NOT EXISTS idx_rules_datasets_source_id ON public.rules_datasets(source_id);
CREATE INDEX IF NOT EXISTS idx_rules_dataset_rows_dataset_id ON public.rules_dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_components_source_id ON public.dashboard_components(source_id);

-- Enable RLS on new tables
ALTER TABLE public.rules_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules_dataset_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for rules_datasets (campaign-scoped via source)
CREATE POLICY "Users can view rules datasets for their campaigns" 
ON public.rules_datasets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rules_sources rs
    JOIN public.campaigns c ON c.id = rs.campaign_id
    LEFT JOIN public.campaign_players cp ON cp.campaign_id = c.id AND cp.user_id = auth.uid()
    WHERE rs.id = rules_datasets.source_id 
    AND (c.owner_id = auth.uid() OR cp.user_id IS NOT NULL)
  )
);

CREATE POLICY "GMs can manage rules datasets" 
ON public.rules_datasets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rules_sources rs
    JOIN public.campaigns c ON c.id = rs.campaign_id
    LEFT JOIN public.campaign_players cp ON cp.campaign_id = c.id AND cp.user_id = auth.uid()
    WHERE rs.id = rules_datasets.source_id 
    AND (c.owner_id = auth.uid() OR (cp.user_id IS NOT NULL AND cp.role = 'gm'))
  )
);

-- RLS policies for rules_dataset_rows
CREATE POLICY "Users can view dataset rows for their campaigns" 
ON public.rules_dataset_rows 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rules_datasets rd
    JOIN public.rules_sources rs ON rs.id = rd.source_id
    JOIN public.campaigns c ON c.id = rs.campaign_id
    LEFT JOIN public.campaign_players cp ON cp.campaign_id = c.id AND cp.user_id = auth.uid()
    WHERE rd.id = rules_dataset_rows.dataset_id 
    AND (c.owner_id = auth.uid() OR cp.user_id IS NOT NULL)
  )
);

CREATE POLICY "GMs can manage dataset rows" 
ON public.rules_dataset_rows 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.rules_datasets rd
    JOIN public.rules_sources rs ON rs.id = rd.source_id
    JOIN public.campaigns c ON c.id = rs.campaign_id
    LEFT JOIN public.campaign_players cp ON cp.campaign_id = c.id AND cp.user_id = auth.uid()
    WHERE rd.id = rules_dataset_rows.dataset_id 
    AND (c.owner_id = auth.uid() OR (cp.user_id IS NOT NULL AND cp.role = 'gm'))
  )
);
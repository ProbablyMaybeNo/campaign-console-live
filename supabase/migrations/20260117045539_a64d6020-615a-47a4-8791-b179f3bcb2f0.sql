-- Create extraction_jobs table for tracking progress
CREATE TABLE public.extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_sections INT DEFAULT 0,
  completed_sections INT DEFAULT 0,
  detected_sections JSONB DEFAULT '[]'::jsonb,
  source_name TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view extraction jobs for campaigns they are part of
CREATE POLICY "Users can view extraction jobs for their campaigns"
ON public.extraction_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = extraction_jobs.campaign_id
    AND (c.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.campaign_players cp
      WHERE cp.campaign_id = c.id AND cp.user_id = auth.uid()
    ))
  )
);

-- Campaign owners can insert extraction jobs
CREATE POLICY "Campaign owners can create extraction jobs"
ON public.extraction_jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = extraction_jobs.campaign_id
    AND c.owner_id = auth.uid()
  )
);

-- Campaign owners can update extraction jobs
CREATE POLICY "Campaign owners can update extraction jobs"
ON public.extraction_jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = extraction_jobs.campaign_id
    AND c.owner_id = auth.uid()
  )
);

-- Add columns to wargame_rules for extraction tracking
ALTER TABLE public.wargame_rules 
ADD COLUMN IF NOT EXISTS extraction_job_id UUID REFERENCES public.extraction_jobs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_section TEXT,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'complete';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wargame_rules_extraction_job ON public.wargame_rules(extraction_job_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_campaign ON public.extraction_jobs(campaign_id);

-- Enable realtime for extraction_jobs so we can track progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.extraction_jobs;

-- Add trigger for updated_at
CREATE TRIGGER update_extraction_jobs_updated_at
BEFORE UPDATE ON public.extraction_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create storage bucket for campaign documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-documents', 'campaign-documents', false);

-- Storage policies for campaign documents
CREATE POLICY "Campaign members can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-documents' AND
  (
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = (storage.foldername(name))[1]::uuid
      AND campaign_players.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = (storage.foldername(name))[1]::uuid
      AND campaigns.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Campaign members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-documents' AND
  (
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = (storage.foldername(name))[1]::uuid
      AND campaign_players.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = (storage.foldername(name))[1]::uuid
      AND campaigns.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own uploaded documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-documents' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Create table to track campaign documents metadata
CREATE TABLE public.campaign_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaign_documents
CREATE POLICY "Campaign members can view documents"
ON public.campaign_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_players
    WHERE campaign_players.campaign_id = campaign_documents.campaign_id
    AND campaign_players.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_documents.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

CREATE POLICY "Campaign members can upload documents"
ON public.campaign_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = campaign_documents.campaign_id
      AND campaign_players.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_documents.campaign_id
      AND campaigns.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete own uploaded documents"
ON public.campaign_documents FOR DELETE
USING (auth.uid() = uploaded_by);
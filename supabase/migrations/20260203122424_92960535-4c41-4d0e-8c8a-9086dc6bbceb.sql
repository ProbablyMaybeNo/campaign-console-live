-- Create storage bucket for campaign images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow campaign members to view images (public bucket but with campaign scoping)
CREATE POLICY "Campaign members can view images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'campaign-images'
);

-- Allow GMs and campaign owners to upload images
CREATE POLICY "Campaign GMs can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images' AND
  auth.uid() IS NOT NULL AND
  (
    -- Check if user is campaign owner
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    -- Check if user has GM role in campaign
    EXISTS (
      SELECT 1 FROM public.campaign_players
      WHERE campaign_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'gm'
    )
  )
);

-- Allow GMs and campaign owners to update images
CREATE POLICY "Campaign GMs can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-images' AND
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.campaign_players
      WHERE campaign_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'gm'
    )
  )
);

-- Allow GMs and campaign owners to delete images
CREATE POLICY "Campaign GMs can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-images' AND
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.campaign_players
      WHERE campaign_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND role = 'gm'
    )
  )
);
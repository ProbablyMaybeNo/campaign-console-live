-- Fix storage RLS policies for campaign-documents bucket.
-- IMPORTANT: In storage.objects policies, unqualified `name` inside subqueries can accidentally bind to campaigns.name.
-- Always reference the outer row explicitly via storage.objects.name.

DROP POLICY IF EXISTS "Campaign members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Campaign members can view documents" ON storage.objects;

CREATE POLICY "Campaign members can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-documents'
  AND (
    -- User is a member of the campaign (folder name = campaign_id)
    EXISTS (
      SELECT 1
      FROM public.campaign_players cp
      WHERE cp.campaign_id = (storage.foldername(storage.objects.name))[1]::uuid
        AND cp.user_id = auth.uid()
    )
    OR
    -- User is the campaign owner
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = (storage.foldername(storage.objects.name))[1]::uuid
        AND c.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Campaign members can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'campaign-documents'
  AND (
    EXISTS (
      SELECT 1
      FROM public.campaign_players cp
      WHERE cp.campaign_id = (storage.foldername(storage.objects.name))[1]::uuid
        AND cp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.campaigns c
      WHERE c.id = (storage.foldername(storage.objects.name))[1]::uuid
        AND c.owner_id = auth.uid()
    )
  )
);

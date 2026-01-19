-- Fix the storage policy for campaign-documents uploads
-- The existing policy incorrectly references campaigns.name instead of objects.name

DROP POLICY IF EXISTS "Campaign members can upload documents" ON storage.objects;

CREATE POLICY "Campaign members can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-documents' AND
  (
    -- User is a member of the campaign (folder name = campaign_id)
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = (storage.foldername(name))[1]::uuid
      AND campaign_players.user_id = auth.uid()
    )
    OR
    -- User is the campaign owner
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = (storage.foldername(name))[1]::uuid
      AND campaigns.owner_id = auth.uid()
    )
  )
);

-- Also fix the SELECT policy if needed (same issue might exist)
DROP POLICY IF EXISTS "Campaign members can view documents" ON storage.objects;

CREATE POLICY "Campaign members can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'campaign-documents' AND
  (
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = (storage.foldername(name))[1]::uuid
      AND campaign_players.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = (storage.foldername(name))[1]::uuid
      AND campaigns.owner_id = auth.uid()
    )
  )
);
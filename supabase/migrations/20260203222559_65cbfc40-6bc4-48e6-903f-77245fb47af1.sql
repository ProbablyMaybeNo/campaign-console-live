-- Fix the Campaign GMs can upload images policy - was referencing campaigns.name instead of objects.name
DROP POLICY IF EXISTS "Campaign GMs can upload images" ON storage.objects;

CREATE POLICY "Campaign GMs can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'campaign-images'
  AND auth.uid() IS NOT NULL
  AND (
    -- Campaign owner can upload
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id::text = (storage.foldername(objects.name))[1]
      AND campaigns.owner_id = auth.uid()
    )
    OR
    -- Campaign GM can upload
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id::text = (storage.foldername(objects.name))[1]
      AND campaign_players.user_id = auth.uid()
      AND campaign_players.role = 'gm'
    )
  )
);
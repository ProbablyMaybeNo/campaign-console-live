-- Add recipient_id for direct/private messages
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id);

-- Add read status tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Create index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread 
ON public.messages(recipient_id, is_read) WHERE is_read = false;

-- Create index for efficient recipient queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient 
ON public.messages(recipient_id);

-- Drop existing view policy and create new one for private messages
DROP POLICY IF EXISTS "Campaign members can view messages" ON public.messages;

CREATE POLICY "View messages" ON public.messages
FOR SELECT USING (
  -- Public campaign messages (no recipient)
  (recipient_id IS NULL AND (
    EXISTS (SELECT 1 FROM campaign_players WHERE campaign_id = messages.campaign_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM campaigns WHERE id = messages.campaign_id AND owner_id = auth.uid())
  ))
  OR
  -- Private messages (sender or recipient)
  (recipient_id IS NOT NULL AND (author_id = auth.uid() OR recipient_id = auth.uid()))
);

-- Allow updating read status for recipients
CREATE POLICY "Recipients can mark messages read" ON public.messages
FOR UPDATE USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
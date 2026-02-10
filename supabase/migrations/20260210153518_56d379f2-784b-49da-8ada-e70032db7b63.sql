-- Remove the legacy plaintext password column from campaigns table
-- Passwords are already properly handled via password_hash + edge functions
ALTER TABLE public.campaigns DROP COLUMN IF EXISTS password;
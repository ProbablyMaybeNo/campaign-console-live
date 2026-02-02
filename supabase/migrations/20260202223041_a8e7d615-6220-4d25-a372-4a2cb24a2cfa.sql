-- Add subscription fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'supporter')),
ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'none')),
ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id text UNIQUE NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents >= 100 AND amount_cents <= 25000),
  currency text NOT NULL DEFAULT 'usd',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);

-- Enable RLS on donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Users can read their own donations
CREATE POLICY "Users can view own donations"
ON public.donations
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert donations (via webhook)
-- No INSERT policy for authenticated users - webhook uses service role

-- Users can update their own profile (for existing policy compatibility)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
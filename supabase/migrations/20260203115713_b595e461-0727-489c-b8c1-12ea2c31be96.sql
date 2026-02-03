-- Create table for donor feedback messages
CREATE TABLE public.donor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  feedback_type text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false,
  admin_response text DEFAULT NULL,
  responded_at timestamp with time zone DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.donor_feedback ENABLE ROW LEVEL SECURITY;

-- Users who have donated can submit feedback
CREATE POLICY "Donors can submit feedback"
ON public.donor_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM donations WHERE donations.user_id = auth.uid()
  )
);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.donor_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view and manage all feedback
CREATE POLICY "Admins can manage all feedback"
ON public.donor_feedback
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add has_donated column to profiles for quick badge lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_donated boolean NOT NULL DEFAULT false;

-- Create a trigger to update has_donated when a donation is made
CREATE OR REPLACE FUNCTION public.update_donor_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET has_donated = true 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_donation_created
AFTER INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.update_donor_status();
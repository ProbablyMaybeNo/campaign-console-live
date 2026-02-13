-- Create error_reports table for automatic bug tracking
CREATE TABLE public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  stack_trace text,
  component_stack text,
  url text,
  route text,
  user_id uuid,
  user_agent text,
  error_type text NOT NULL DEFAULT 'js_error',
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  occurrence_count integer NOT NULL DEFAULT 1,
  last_occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  fingerprint text NOT NULL
);

-- Create index on fingerprint for deduplication lookups
CREATE INDEX idx_error_reports_fingerprint ON public.error_reports(fingerprint);

-- Create index on status for filtering
CREATE INDEX idx_error_reports_status ON public.error_reports(status);

-- Create index on created_at for time-based queries
CREATE INDEX idx_error_reports_created_at ON public.error_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT error reports (including unauthenticated users)
CREATE POLICY "Anyone can insert error reports"
ON public.error_reports
FOR INSERT
WITH CHECK (true);

-- Only admins can view error reports
CREATE POLICY "Admins can view error reports"
ON public.error_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update error reports (change status)
CREATE POLICY "Admins can update error reports"
ON public.error_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete error reports
CREATE POLICY "Admins can delete error reports"
ON public.error_reports
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
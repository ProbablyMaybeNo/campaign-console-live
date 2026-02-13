
CREATE TABLE public.subscriber_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.subscriber_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interest" ON public.subscriber_interest
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own interest" ON public.subscriber_interest
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interest" ON public.subscriber_interest
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

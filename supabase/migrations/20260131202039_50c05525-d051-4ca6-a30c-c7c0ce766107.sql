-- Add new campaign configuration columns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS max_players integer DEFAULT 8,
ADD COLUMN IF NOT EXISTS total_rounds integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS round_length text DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS join_code text UNIQUE,
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS game_system text,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS current_round integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS display_settings jsonb DEFAULT '{"showId": true, "showPoints": true, "showPlayers": true, "showRound": true, "showDates": true, "showStatus": true, "showGameSystem": true}'::jsonb,
ADD COLUMN IF NOT EXISTS title_color text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS border_color text DEFAULT '#22c55e';

-- Create a function to generate a unique 6-character join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- Create trigger function to auto-generate join code on insert
CREATE OR REPLACE FUNCTION public.set_campaign_join_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.join_code IS NULL THEN
    LOOP
      new_code := public.generate_join_code();
      SELECT EXISTS(SELECT 1 FROM campaigns WHERE join_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.join_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS trigger_set_campaign_join_code ON public.campaigns;
CREATE TRIGGER trigger_set_campaign_join_code
  BEFORE INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_join_code();

-- Generate join codes for existing campaigns that don't have one
UPDATE public.campaigns 
SET join_code = public.generate_join_code() 
WHERE join_code IS NULL;
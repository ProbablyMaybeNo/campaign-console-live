-- Add new columns to schedule_entries for calendar functionality
ALTER TABLE public.schedule_entries
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'round';

-- Add comment for clarity
COMMENT ON COLUMN public.schedule_entries.start_date IS 'Start date for rounds/events';
COMMENT ON COLUMN public.schedule_entries.end_date IS 'End date for rounds (null for single-day events)';
COMMENT ON COLUMN public.schedule_entries.color IS 'Display color hex for calendar bars';
COMMENT ON COLUMN public.schedule_entries.entry_type IS 'Type: round or event';
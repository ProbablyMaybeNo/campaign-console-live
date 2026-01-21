-- Drop foreign key constraints from dashboard_components first
ALTER TABLE public.dashboard_components DROP CONSTRAINT IF EXISTS dashboard_components_source_id_fkey;
ALTER TABLE public.dashboard_components DROP CONSTRAINT IF EXISTS dashboard_components_linked_table_id_fkey;
ALTER TABLE public.dashboard_components DROP CONSTRAINT IF EXISTS dashboard_components_linked_dataset_id_fkey;

-- Remove orphaned FK columns from dashboard_components
ALTER TABLE public.dashboard_components DROP COLUMN IF EXISTS source_id;
ALTER TABLE public.dashboard_components DROP COLUMN IF EXISTS linked_table_id;
ALTER TABLE public.dashboard_components DROP COLUMN IF EXISTS linked_dataset_id;
ALTER TABLE public.dashboard_components DROP COLUMN IF EXISTS linked_chunk_ids;
ALTER TABLE public.dashboard_components DROP COLUMN IF EXISTS linked_section_ids;

-- Drop all 7 rules_* tables (cascade will handle their policies)
DROP TABLE IF EXISTS public.rules_dataset_rows CASCADE;
DROP TABLE IF EXISTS public.rules_datasets CASCADE;
DROP TABLE IF EXISTS public.rules_tables CASCADE;
DROP TABLE IF EXISTS public.rules_chunks CASCADE;
DROP TABLE IF EXISTS public.rules_sections CASCADE;
DROP TABLE IF EXISTS public.rules_pages CASCADE;
DROP TABLE IF EXISTS public.rules_sources CASCADE;
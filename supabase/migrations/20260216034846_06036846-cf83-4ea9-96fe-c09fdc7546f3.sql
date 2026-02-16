
-- Add icon_url column to map_legend_items for custom uploaded icons
ALTER TABLE public.map_legend_items
ADD COLUMN icon_url text DEFAULT NULL;

-- Enable realtime for map tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_maps;
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_legend_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_markers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.map_fog_regions;
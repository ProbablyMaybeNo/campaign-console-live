import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignMap, MapLegendItem, MapMarker, MarkerShape, MarkerVisibility, MapFogRegion } from '@/components/map/types';
import { toast } from 'sonner';

// ============ Fetch Map Data ============
export function useCampaignMap(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-map', campaignId],
    queryFn: async () => {
      // Fetch map
      const { data: map, error: mapError } = await supabase
        .from('campaign_maps')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (mapError) throw mapError;

      if (!map) {
        return { map: null, legendItems: [], markers: [], fogRegions: [] };
      }

      // Fetch legend items
      const { data: legendItems, error: legendError } = await supabase
        .from('map_legend_items')
        .select('*')
        .eq('map_id', map.id)
        .order('order_index');

      if (legendError) throw legendError;

      // Fetch markers
      const { data: markers, error: markersError } = await supabase
        .from('map_markers')
        .select('*')
        .eq('map_id', map.id);

      if (markersError) throw markersError;

      // Fetch fog regions
      const { data: fogRegions, error: fogError } = await supabase
        .from('map_fog_regions')
        .select('*')
        .eq('map_id', map.id);

      if (fogError) throw fogError;

      // Join legend items to markers
      const legendMap = new Map((legendItems || []).map(l => [l.id, l]));
      const enrichedMarkers = (markers || []).map(m => ({
        ...m,
        visibility: m.visibility as MarkerVisibility,
        legend_item: m.legend_item_id ? legendMap.get(m.legend_item_id) : undefined,
      }));

      return {
        map: map as CampaignMap,
        legendItems: (legendItems || []).map(l => ({ ...l, shape: l.shape as MarkerShape })) as MapLegendItem[],
        markers: enrichedMarkers as MapMarker[],
        fogRegions: (fogRegions || []) as MapFogRegion[],
      };
    },
    enabled: !!campaignId,
  });
}

// ============ Real-time Subscription ============
export function useMapRealtime(campaignId: string, mapId: string | null | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!campaignId || !mapId) return;

    const channelName = `map-realtime-${mapId}`;
    
    // Create channel with subscriptions to all map-related tables
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_maps',
          filter: `id=eq.${mapId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_legend_items',
          filter: `map_id=eq.${mapId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_markers',
          filter: `map_id=eq.${mapId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_fog_regions',
          filter: `map_id=eq.${mapId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [campaignId, mapId, queryClient]);
}

// ============ Map CRUD ============
export function useCreateMap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ campaignId, imageUrl, title }: { campaignId: string; imageUrl: string; title?: string }) => {
      const { data, error } = await supabase
        .from('campaign_maps')
        .insert({
          campaign_id: campaignId,
          image_url: imageUrl,
          title: title || 'Campaign Map',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaign_id] });
      toast.success('Map created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create map: ${error.message}`);
    },
  });
}

export function useUpdateMap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mapId, imageUrl, title }: { mapId: string; imageUrl?: string; title?: string }) => {
      const updates: Partial<CampaignMap> = {};
      if (imageUrl !== undefined) updates.image_url = imageUrl;
      if (title !== undefined) updates.title = title;
      
      const { data, error } = await supabase
        .from('campaign_maps')
        .update(updates)
        .eq('id', mapId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaign_id] });
      toast.success('Map updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update map: ${error.message}`);
    },
  });
}

export function useDeleteMap() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mapId, campaignId }: { mapId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('campaign_maps')
        .delete()
        .eq('id', mapId);
      
      if (error) throw error;
      return { campaignId };
    },
    onSuccess: ({ campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
      toast.success('Map deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete map: ${error.message}`);
    },
  });
}

// ============ Legend Item CRUD ============
export function useCreateLegendItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mapId, name, shape, color, iconUrl, campaignId }: { 
      mapId: string; 
      name: string; 
      shape: MarkerShape; 
      color: string;
      iconUrl?: string;
      campaignId: string;
    }) => {
      // Get max order_index
      const { data: existing } = await supabase
        .from('map_legend_items')
        .select('order_index')
        .eq('map_id', mapId)
        .order('order_index', { ascending: false })
        .limit(1);
      
      const orderIndex = existing?.[0]?.order_index !== undefined ? existing[0].order_index + 1 : 0;
      
      const { data, error } = await supabase
        .from('map_legend_items')
        .insert({
          map_id: mapId,
          name,
          shape,
          color,
          order_index: orderIndex,
          icon_url: iconUrl || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
      toast.success('Legend item added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add legend item: ${error.message}`);
    },
  });
}

export function useUpdateLegendItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, name, shape, color, iconUrl, campaignId }: { 
      itemId: string; 
      name?: string; 
      shape?: MarkerShape; 
      color?: string;
      iconUrl?: string | null;
      campaignId: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (shape !== undefined) updates.shape = shape;
      if (color !== undefined) updates.color = color;
      if (iconUrl !== undefined) updates.icon_url = iconUrl;
      
      const { data, error } = await supabase
        .from('map_legend_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update legend item: ${error.message}`);
    },
  });
}

export function useDeleteLegendItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, campaignId }: { itemId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('map_legend_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return { campaignId };
    },
    onSuccess: ({ campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
      toast.success('Legend item removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove legend item: ${error.message}`);
    },
  });
}

// ============ Marker CRUD ============
export function useCreateMarker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mapId, legendItemId, label, positionX, positionY, visibility, campaignId }: { 
      mapId: string;
      legendItemId?: string;
      label?: string;
      positionX: number;
      positionY: number;
      visibility?: MarkerVisibility;
      campaignId: string;
    }) => {
      const { data, error } = await supabase
        .from('map_markers')
        .insert({
          map_id: mapId,
          legend_item_id: legendItemId || null,
          label: label || null,
          position_x: positionX,
          position_y: positionY,
          visibility: visibility || 'all',
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add marker: ${error.message}`);
    },
  });
}

export function useUpdateMarker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ markerId, legendItemId, label, positionX, positionY, visibility, campaignId }: { 
      markerId: string;
      legendItemId?: string | null;
      label?: string | null;
      positionX?: number;
      positionY?: number;
      visibility?: MarkerVisibility;
      campaignId: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (legendItemId !== undefined) updates.legend_item_id = legendItemId;
      if (label !== undefined) updates.label = label;
      if (positionX !== undefined) updates.position_x = positionX;
      if (positionY !== undefined) updates.position_y = positionY;
      if (visibility !== undefined) updates.visibility = visibility;
      
      const { data, error } = await supabase
        .from('map_markers')
        .update(updates)
        .eq('id', markerId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update marker: ${error.message}`);
    },
  });
}

export function useDeleteMarker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ markerId, campaignId }: { markerId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('map_markers')
        .delete()
        .eq('id', markerId);
      
      if (error) throw error;
      return { campaignId };
    },
    onSuccess: ({ campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove marker: ${error.message}`);
    },
  });
}

// ============ Fog Region CRUD ============
export function useCreateFogRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mapId, positionX, positionY, width, height, campaignId }: { 
      mapId: string;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      campaignId: string;
    }) => {
      const { data, error } = await supabase
        .from('map_fog_regions')
        .insert({
          map_id: mapId,
          position_x: positionX,
          position_y: positionY,
          width,
          height,
          revealed: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add fog region: ${error.message}`);
    },
  });
}

export function useUpdateFogRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ regionId, revealed, campaignId }: { 
      regionId: string;
      revealed?: boolean;
      campaignId: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (revealed !== undefined) updates.revealed = revealed;
      
      const { data, error } = await supabase
        .from('map_fog_regions')
        .update(updates)
        .eq('id', regionId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', data.campaignId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fog region: ${error.message}`);
    },
  });
}

export function useDeleteFogRegion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ regionId, campaignId }: { regionId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('map_fog_regions')
        .delete()
        .eq('id', regionId);
      
      if (error) throw error;
      return { campaignId };
    },
    onSuccess: ({ campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-map', campaignId] });
      toast.success('Fog region removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove fog region: ${error.message}`);
    },
  });
}

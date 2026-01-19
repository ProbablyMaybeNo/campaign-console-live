export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'star';
export type MarkerVisibility = 'all' | 'gm_only';

export interface CampaignMap {
  id: string;
  campaign_id: string;
  image_url: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MapLegendItem {
  id: string;
  map_id: string;
  name: string;
  shape: MarkerShape;
  color: string;
  order_index: number;
  created_at: string;
}

export interface MapMarker {
  id: string;
  map_id: string;
  legend_item_id: string | null;
  label: string | null;
  position_x: number;
  position_y: number;
  visibility: MarkerVisibility;
  created_at: string;
  // Joined from legend item
  legend_item?: MapLegendItem;
}

export interface MapFogRegion {
  id: string;
  map_id: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  revealed: boolean;
  created_at: string;
}

export interface MapData {
  map: CampaignMap | null;
  legendItems: MapLegendItem[];
  markers: MapMarker[];
  fogRegions: MapFogRegion[];
}

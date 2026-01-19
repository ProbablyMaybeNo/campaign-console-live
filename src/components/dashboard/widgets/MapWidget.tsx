import { Map as MapIcon, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { DashboardComponent } from "@/hooks/useDashboardComponents";
import { useCampaignMap, useMapRealtime } from "@/hooks/useMapData";
import { MarkerIcon } from "@/components/map/MarkerIcon";

interface MapWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

export function MapWidget({ component, isGM }: MapWidgetProps) {
  const campaignId = component.campaign_id;
  const { data, isLoading } = useCampaignMap(campaignId);
  const [zoom, setZoom] = useState(1);

  // Enable real-time updates
  useMapRealtime(campaignId, data?.map?.id);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  const { map, legendItems, markers, fogRegions } = data || { map: null, legendItems: [], markers: [], fogRegions: [] };

  // No map - show placeholder
  if (!map || !map.image_url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <MapIcon className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">
          {isGM ? "Open Map overlay to upload" : "No map available"}
        </p>
      </div>
    );
  }

  // Create legend lookup
  const legendLookup = new Map(legendItems.map(l => [l.id, l]));
  
  // Filter markers and fog for player view
  const visibleMarkers = isGM ? markers : markers.filter(m => m.visibility === 'all');
  const visibleFog = fogRegions;

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="pb-2 border-b border-border mb-2">
        <p className="text-xs font-mono text-primary">{map.title}</p>
      </div>

      {/* Map Image with Markers */}
      <div className="flex-1 relative group overflow-hidden rounded bg-black/20">
        <div
          className="w-full h-full overflow-auto"
          style={{ cursor: zoom > 1 ? "move" : "default" }}
        >
          <div className="relative inline-block min-w-full min-h-full">
            <img
              src={map.image_url}
              alt={map.title}
              className="transition-transform origin-top-left"
              style={{ transform: `scale(${zoom})`, minWidth: "100%", minHeight: "100%" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
            
            {/* Fog of War Regions */}
            {visibleFog.map((region) => {
              // Players see unrevealed regions as opaque fog
              const showAsFog = !isGM && !region.revealed;
              
              if (!isGM && region.revealed) return null;
              
              return (
                <div
                  key={region.id}
                  className={`absolute ${showAsFog ? 'bg-black/90' : 'bg-black/40 border border-dashed border-amber-500/30'}`}
                  style={{
                    left: `${region.position_x}%`,
                    top: `${region.position_y}%`,
                    width: `${region.width}%`,
                    height: `${region.height}%`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                />
              );
            })}
            
            {/* Markers */}
            {visibleMarkers.map((marker) => {
              const legend = marker.legend_item_id ? legendLookup.get(marker.legend_item_id) : null;
              if (!legend) return null;
              
              const isGmOnly = marker.visibility === 'gm_only';
              
              return (
                <div
                  key={marker.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${isGmOnly ? 'opacity-60' : ''}`}
                  style={{
                    left: `${marker.position_x * zoom}%`,
                    top: `${marker.position_y * zoom}%`,
                  }}
                  title={marker.label || undefined}
                >
                  <MarkerIcon shape={legend.shape} color={legend.color} size={20} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-2 right-2 flex gap-1 bg-background/80 rounded p-1">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1 hover:bg-accent rounded"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] px-1 flex items-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            className="p-1 hover:bg-accent rounded"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {/* Legend (condensed) */}
      {legendItems.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border mt-2">
          {legendItems.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center gap-1 text-[10px]">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate max-w-[60px]">{item.name}</span>
            </div>
          ))}
          {legendItems.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{legendItems.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  );
}
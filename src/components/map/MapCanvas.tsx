import { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, Trash2, X } from 'lucide-react';
import { MarkerIcon } from './MarkerIcon';
import type { MapMarker, MapLegendItem, MarkerVisibility } from './types';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { TerminalButton } from '@/components/ui/TerminalButton';

interface MapCanvasProps {
  imageUrl: string;
  markers: MapMarker[];
  legendItems: MapLegendItem[];
  isGM: boolean;
  // Placement state
  placementMode: 'select' | 'place';
  selectedLegendItemId: string | null;
  gmOnlyMode: boolean;
  // Callbacks
  onAddMarker: (posX: number, posY: number, legendItemId: string, visibility: MarkerVisibility) => void;
  onUpdateMarker: (markerId: string, updates: { label?: string | null; positionX?: number; positionY?: number; visibility?: MarkerVisibility }) => void;
  onDeleteMarker: (markerId: string) => void;
}

export function MapCanvas({
  imageUrl,
  markers,
  legendItems,
  isGM,
  placementMode,
  selectedLegendItemId,
  gmOnlyMode,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  const legendMap = new Map(legendItems.map(l => [l.id, l]));

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGM || placementMode !== 'place' || !selectedLegendItemId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    onAddMarker(x, y, selectedLegendItemId, gmOnlyMode ? 'gm_only' : 'all');
  };

  const handleMarkerClick = (e: React.MouseEvent, marker: MapMarker) => {
    e.stopPropagation();
    if (!isGM) return;
    
    if (placementMode === 'select') {
      setEditingMarkerId(marker.id);
      setEditLabel(marker.label || '');
    }
  };

  const handleSaveLabel = () => {
    if (editingMarkerId) {
      onUpdateMarker(editingMarkerId, { label: editLabel || null });
      setEditingMarkerId(null);
      setEditLabel('');
    }
  };

  const handleDeleteMarker = () => {
    if (editingMarkerId) {
      onDeleteMarker(editingMarkerId);
      setEditingMarkerId(null);
    }
  };

  const handleToggleVisibility = () => {
    if (editingMarkerId) {
      const marker = markers.find(m => m.id === editingMarkerId);
      if (marker) {
        onUpdateMarker(editingMarkerId, { 
          visibility: marker.visibility === 'all' ? 'gm_only' : 'all' 
        });
      }
    }
  };

  return (
    <div className="relative w-full h-[500px] bg-muted/30 border border-border rounded-lg overflow-hidden" ref={containerRef}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        panning={{ disabled: placementMode === 'place' && isGM }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-10 flex gap-1 bg-background/80 backdrop-blur rounded-lg p-1">
              <button onClick={() => zoomIn()} className="p-2 hover:bg-muted rounded" title="Zoom in">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => zoomOut()} className="p-2 hover:bg-muted rounded" title="Zoom out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <button onClick={() => resetTransform()} className="p-2 hover:bg-muted rounded" title="Reset view">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <div 
                className="relative"
                onClick={handleMapClick}
                style={{ cursor: isGM && placementMode === 'place' ? 'crosshair' : 'default' }}
              >
                <img
                  src={imageUrl}
                  alt="Campaign map"
                  className="max-w-full h-auto"
                  draggable={false}
                />
                
                {/* Markers */}
                {markers.map((marker) => {
                  const legend = marker.legend_item_id ? legendMap.get(marker.legend_item_id) : null;
                  if (!legend) return null;
                  
                  const isEditing = editingMarkerId === marker.id;
                  const isHovered = hoveredMarkerId === marker.id;
                  const isGmOnly = marker.visibility === 'gm_only';
                  
                  return (
                    <div
                      key={marker.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform ${
                        isGM ? 'cursor-pointer hover:scale-110' : ''
                      } ${isGmOnly ? 'opacity-60' : ''}`}
                      style={{
                        left: `${marker.position_x}%`,
                        top: `${marker.position_y}%`,
                      }}
                      onClick={(e) => handleMarkerClick(e, marker)}
                      onMouseEnter={() => setHoveredMarkerId(marker.id)}
                      onMouseLeave={() => setHoveredMarkerId(null)}
                    >
                      <MarkerIcon shape={legend.shape} color={legend.color} size={32} />
                      
                      {/* Label tooltip on hover */}
                      {(isHovered || isEditing) && marker.label && !isEditing && (
                        <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                          {marker.label}
                          {isGmOnly && <span className="ml-1 text-amber-400">(GM)</span>}
                        </div>
                      )}
                      
                      {/* Edit popover */}
                      {isEditing && (
                        <div 
                          className="absolute left-1/2 -translate-x-1/2 top-10 bg-background border border-border rounded-lg p-3 shadow-xl z-20 min-w-[200px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Edit Marker</span>
                            <button onClick={() => setEditingMarkerId(null)} className="p-0.5 hover:bg-muted rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <TerminalInput
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Label (optional)"
                            className="text-xs mb-2"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel()}
                          />
                          
                          <div className="flex gap-1 justify-between">
                            <div className="flex gap-1">
                              <TerminalButton 
                                size="sm" 
                                variant="outline"
                                onClick={handleToggleVisibility}
                                className="text-xs px-2"
                              >
                                {marker.visibility === 'all' ? 'Make GM Only' : 'Make Visible'}
                              </TerminalButton>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={handleDeleteMarker}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <TerminalButton size="sm" onClick={handleSaveLabel} className="text-xs">
                                Save
                              </TerminalButton>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      
      {/* Placement mode indicator */}
      {isGM && placementMode === 'place' && selectedLegendItemId && (
        <div className="absolute bottom-2 left-2 z-10 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
          <span>Click on map to place marker</span>
          {legendMap.get(selectedLegendItemId) && (
            <MarkerIcon 
              shape={legendMap.get(selectedLegendItemId)!.shape} 
              color={legendMap.get(selectedLegendItemId)!.color} 
              size={20} 
            />
          )}
        </div>
      )}
    </div>
  );
}

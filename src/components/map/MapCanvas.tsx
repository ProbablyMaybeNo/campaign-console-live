import { useState, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, Trash2, X, Move } from 'lucide-react';
import { MarkerIcon } from './MarkerIcon';
import type { MapMarker, MapLegendItem, MarkerVisibility, MapFogRegion } from './types';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { TerminalButton } from '@/components/ui/TerminalButton';

interface MapCanvasProps {
  imageUrl: string;
  markers: MapMarker[];
  legendItems: MapLegendItem[];
  fogRegions: MapFogRegion[];
  isGM: boolean;
  // Placement state
  placementMode: 'select' | 'place' | 'fog';
  selectedLegendItemId: string | null;
  gmOnlyMode: boolean;
  // Callbacks
  onAddMarker: (posX: number, posY: number, legendItemId: string, visibility: MarkerVisibility) => void;
  onUpdateMarker: (markerId: string, updates: { label?: string | null; positionX?: number; positionY?: number; visibility?: MarkerVisibility }) => void;
  onDeleteMarker: (markerId: string) => void;
  onAddFogRegion: (posX: number, posY: number, width: number, height: number) => void;
  onToggleFogRegion: (regionId: string, revealed: boolean) => void;
  onDeleteFogRegion: (regionId: string) => void;
}

export function MapCanvas({
  imageUrl,
  markers,
  legendItems,
  fogRegions,
  isGM,
  placementMode,
  selectedLegendItemId,
  gmOnlyMode,
  onAddMarker,
  onUpdateMarker,
  onDeleteMarker,
  onAddFogRegion,
  onToggleFogRegion,
  onDeleteFogRegion,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  
  // Drag state for markers
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Fog drawing state
  const [fogDrawStart, setFogDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [fogDrawCurrent, setFogDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  const legendMap = new Map(legendItems.map(l => [l.id, l]));
  
  // Calculate position from mouse event relative to image
  const getRelativePosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);
  
  // Marker drag handlers
  const handleMarkerDragStart = useCallback((e: React.MouseEvent, marker: MapMarker) => {
    if (!isGM || placementMode !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingMarkerId(marker.id);
    setDragStart({ x: marker.position_x, y: marker.position_y });
    setDragOffset({ x: 0, y: 0 });
  }, [isGM, placementMode]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle marker dragging
    if (draggingMarkerId && dragStart) {
      const pos = getRelativePosition(e);
      if (pos) {
        const marker = markers.find(m => m.id === draggingMarkerId);
        if (marker) {
          setDragOffset({
            x: pos.x - dragStart.x,
            y: pos.y - dragStart.y
          });
        }
      }
    }
    
    // Handle fog drawing
    if (fogDrawStart && placementMode === 'fog') {
      const pos = getRelativePosition(e);
      if (pos) {
        setFogDrawCurrent(pos);
      }
    }
  }, [draggingMarkerId, dragStart, fogDrawStart, placementMode, getRelativePosition, markers]);
  
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Finish marker drag
    if (draggingMarkerId && dragStart) {
      const pos = getRelativePosition(e);
      if (pos) {
        onUpdateMarker(draggingMarkerId, { positionX: pos.x, positionY: pos.y });
      }
      setDraggingMarkerId(null);
      setDragStart(null);
      setDragOffset({ x: 0, y: 0 });
    }
    
    // Finish fog drawing
    if (fogDrawStart && fogDrawCurrent && placementMode === 'fog') {
      const width = Math.abs(fogDrawCurrent.x - fogDrawStart.x);
      const height = Math.abs(fogDrawCurrent.y - fogDrawStart.y);
      if (width > 2 && height > 2) {
        const posX = Math.min(fogDrawStart.x, fogDrawCurrent.x);
        const posY = Math.min(fogDrawStart.y, fogDrawCurrent.y);
        onAddFogRegion(posX, posY, width, height);
      }
      setFogDrawStart(null);
      setFogDrawCurrent(null);
    }
  }, [draggingMarkerId, dragStart, fogDrawStart, fogDrawCurrent, placementMode, getRelativePosition, onUpdateMarker, onAddFogRegion]);

  const handleMapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGM) return;
    
    if (placementMode === 'fog') {
      const pos = getRelativePosition(e);
      if (pos) {
        setFogDrawStart(pos);
        setFogDrawCurrent(pos);
      }
    }
  };
  
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGM || placementMode !== 'place' || !selectedLegendItemId) return;
    
    const pos = getRelativePosition(e);
    if (pos) {
      onAddMarker(pos.x, pos.y, selectedLegendItemId, gmOnlyMode ? 'gm_only' : 'all');
    }
  };

  const handleMarkerClick = (e: React.MouseEvent, marker: MapMarker) => {
    e.stopPropagation();
    if (!isGM || draggingMarkerId) return;
    
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

  const getCursor = () => {
    if (!isGM) return 'default';
    if (placementMode === 'place') return 'crosshair';
    if (placementMode === 'fog') return 'crosshair';
    return 'default';
  };

  return (
    <div className="relative w-full h-[500px] bg-muted/30 border border-border rounded-lg overflow-hidden" ref={containerRef}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
        panning={{ disabled: (placementMode === 'place' || placementMode === 'fog' || !!draggingMarkerId) && isGM }}
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
                className="relative select-none"
                onClick={handleMapClick}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: getCursor() }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Campaign map"
                  className="max-w-full h-auto"
                  draggable={false}
                />
                
                {/* Fog of War Regions */}
                {fogRegions.map((region) => {
                  // Players see unrevealed regions as opaque fog
                  // GM sees all regions with visual indicator
                  const showAsFog = !isGM && !region.revealed;
                  const gmUnrevealed = isGM && !region.revealed;
                  
                  if (!isGM && region.revealed) return null; // Don't show revealed regions to players
                  
                  return (
                    <div
                      key={region.id}
                      className={`absolute ${showAsFog ? 'bg-black/90' : gmUnrevealed ? 'bg-black/60 border-2 border-dashed border-amber-500/50' : 'bg-emerald-500/20 border-2 border-emerald-500/50'}`}
                      style={{
                        left: `${region.position_x}%`,
                        top: `${region.position_y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isGM && placementMode === 'select') {
                          // Toggle reveal on click
                          onToggleFogRegion(region.id, !region.revealed);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (isGM) {
                          onDeleteFogRegion(region.id);
                        }
                      }}
                    >
                      {isGM && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                          {region.revealed ? '✓ Revealed' : 'Hidden'}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Fog drawing preview */}
                {fogDrawStart && fogDrawCurrent && (
                  <div
                    className="absolute bg-black/40 border-2 border-dashed border-amber-500"
                    style={{
                      left: `${Math.min(fogDrawStart.x, fogDrawCurrent.x)}%`,
                      top: `${Math.min(fogDrawStart.y, fogDrawCurrent.y)}%`,
                      width: `${Math.abs(fogDrawCurrent.x - fogDrawStart.x)}%`,
                      height: `${Math.abs(fogDrawCurrent.y - fogDrawStart.y)}%`,
                    }}
                  />
                )}
                
                {/* Markers */}
                {markers.map((marker) => {
                  const legend = marker.legend_item_id ? legendMap.get(marker.legend_item_id) : null;
                  if (!legend) return null;
                  
                  const isEditing = editingMarkerId === marker.id;
                  const isHovered = hoveredMarkerId === marker.id;
                  const isGmOnly = marker.visibility === 'gm_only';
                  const isDragging = draggingMarkerId === marker.id;
                  
                  // Calculate display position (original + drag offset if dragging)
                  const displayX = isDragging ? marker.position_x + dragOffset.x : marker.position_x;
                  const displayY = isDragging ? marker.position_y + dragOffset.y : marker.position_y;
                  
                  return (
                    <div
                      key={marker.id}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform ${
                        isGM && placementMode === 'select' ? 'cursor-grab active:cursor-grabbing hover:scale-110' : isGM ? 'cursor-pointer' : ''
                      } ${isGmOnly ? 'opacity-60' : ''} ${isDragging ? 'z-50 scale-110' : ''}`}
                      style={{
                        left: `${displayX}%`,
                        top: `${displayY}%`,
                      }}
                      onClick={(e) => handleMarkerClick(e, marker)}
                      onMouseDown={(e) => handleMarkerDragStart(e, marker)}
                      onMouseEnter={() => !isDragging && setHoveredMarkerId(marker.id)}
                      onMouseLeave={() => setHoveredMarkerId(null)}
                    >
                      <MarkerIcon shape={legend.shape} color={legend.color} size={32} />
                      
                      {/* Drag indicator for GM */}
                      {isGM && placementMode === 'select' && isHovered && !isDragging && !isEditing && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-background/90 rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 whitespace-nowrap">
                          <Move className="w-2.5 h-2.5" /> Drag to move
                        </div>
                      )}
                      
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
      
      {/* Fog mode indicator */}
      {isGM && placementMode === 'fog' && (
        <div className="absolute bottom-2 left-2 z-10 bg-amber-600/90 text-white px-3 py-1.5 rounded-lg text-sm">
          Draw rectangle to add fog region • Click fog to reveal/hide • Right-click to delete
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, HelpCircle, X, Loader2 } from 'lucide-react';
import { OverlayLoading, OverlayEmpty } from '@/components/ui/OverlayPanel';
import { MapUploader } from './MapUploader';
import { MapCanvas } from './MapCanvas';
import { LegendEditor } from './LegendEditor';
import { MarkerPalette } from './MarkerPalette';
import { MarkerIcon } from './MarkerIcon';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { useCreateComponent } from '@/hooks/useDashboardComponents';
import { getSpawnPosition } from '@/lib/canvasPlacement';
import { toast } from 'sonner';
import { uploadCampaignImage, ImageUploadError } from '@/lib/imageStorage';
import {
  useCampaignMap,
  useMapRealtime,
  useCreateMap,
  useUpdateMap,
  useDeleteMap,
  useCreateLegendItem,
  useUpdateLegendItem,
  useDeleteLegendItem,
  useCreateMarker,
  useUpdateMarker,
  useDeleteMarker,
  useCreateFogRegion,
  useUpdateFogRegion,
  useDeleteFogRegion,
} from '@/hooks/useMapData';
import type { MarkerShape, MarkerVisibility } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MapManagerProps {
  campaignId: string;
  isGM: boolean;
}

// Check if map instructions have been shown for this campaign
function hasSeenMapInstructions(campaignId: string): boolean {
  return localStorage.getItem(`campaign-${campaignId}-map-instructions-seen`) === 'true';
}

function markMapInstructionsSeen(campaignId: string): void {
  localStorage.setItem(`campaign-${campaignId}-map-instructions-seen`, 'true');
}

export function MapManager({ campaignId, isGM }: MapManagerProps) {
  const { data, isLoading, error } = useCampaignMap(campaignId);
  const createMap = useCreateMap();
  const updateMap = useUpdateMap();
  const deleteMap = useDeleteMap();
  const createLegendItem = useCreateLegendItem();
  const updateLegendItem = useUpdateLegendItem();
  const deleteLegendItem = useDeleteLegendItem();
  const createMarker = useCreateMarker();
  const updateMarkerMutation = useUpdateMarker();
  const deleteMarker = useDeleteMarker();
  const createFogRegion = useCreateFogRegion();
  const updateFogRegion = useUpdateFogRegion();
  const deleteFogRegion = useDeleteFogRegion();
  const createComponent = useCreateComponent();

  // Enable real-time updates
  useMapRealtime(campaignId, data?.map?.id);

  const [placementMode, setPlacementMode] = useState<'select' | 'place' | 'fog'>('select');
  const [selectedLegendItemId, setSelectedLegendItemId] = useState<string | null>(null);
  const [gmOnlyMode, setGmOnlyMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isReplacingMap, setIsReplacingMap] = useState(false);
  const replaceMapInputRef = useRef<HTMLInputElement>(null);

  // Show instructions on first open per campaign (for GMs only)
  useEffect(() => {
    if (isGM && data?.map?.image_url && !hasSeenMapInstructions(campaignId)) {
      setShowInstructions(true);
      markMapInstructionsSeen(campaignId);
    }
  }, [isGM, data?.map?.image_url, campaignId]);

  const handleAddMapToDashboard = async () => {
    const placement = getSpawnPosition(450, 400);
    try {
      await createComponent.mutateAsync({
        campaign_id: campaignId,
        name: 'Campaign Map',
        component_type: 'map',
        config: {},
        position_x: placement.position_x,
        position_y: placement.position_y,
        width: 450,
        height: 400,
      });
      toast.success('Map component added to dashboard!');
    } catch {
      toast.error('Failed to add map component');
    }
  };

  if (isLoading) {
    return <OverlayLoading />;
  }

  if (error) {
    return (
      <OverlayEmpty
        icon={<span className="text-4xl">⚠️</span>}
        title="Failed to load map"
        description={error.message}
      />
    );
  }

  const { map, legendItems, markers, fogRegions } = data || { map: null, legendItems: [], markers: [], fogRegions: [] };

  // No map uploaded yet
  if (!map || !map.image_url) {
    if (!isGM) {
      return (
        <OverlayEmpty
          icon={<span className="text-4xl">🗺️</span>}
          title="No Campaign Map"
          description="The Game Master hasn't uploaded a map yet."
        />
      );
    }

    return (
      <MapUploader
        campaignId={campaignId}
        onUpload={(imageUrl) => createMap.mutate({ campaignId, imageUrl })}
        isLoading={createMap.isPending}
      />
    );
  }

  // Map exists - show map with controls
  return (
    <div className="space-y-4">
      <Tabs defaultValue="map" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="map">Map</TabsTrigger>
              <TabsTrigger value="legend">Legend ({legendItems.length})</TabsTrigger>
              {isGM && fogRegions.length > 0 && (
                <TabsTrigger value="fog">Fog ({fogRegions.length})</TabsTrigger>
              )}
            </TabsList>
            
            {/* Help button */}
            <button
              onClick={() => setShowInstructions(true)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Map Instructions"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          
          {isGM && (
            <div className="flex items-center gap-2">
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={handleAddMapToDashboard}
                disabled={createComponent.isPending}
                className="gap-1"
              >
                <Plus className="w-3 h-3" />
                Add to Dashboard
              </TerminalButton>
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={() => replaceMapInputRef.current?.click()}
                disabled={isReplacingMap}
              >
                {isReplacingMap ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Replace Map'
                )}
              </TerminalButton>
              <input
                ref={replaceMapInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setIsReplacingMap(true);
                  try {
                    const result = await uploadCampaignImage(campaignId, file, 'maps');
                    updateMap.mutate({ mapId: map.id, imageUrl: result.url });
                  } catch (error) {
                    if (error instanceof ImageUploadError) {
                      toast.error(error.message);
                    } else {
                      toast.error('Failed to upload replacement map');
                    }
                  } finally {
                    setIsReplacingMap(false);
                    if (replaceMapInputRef.current) {
                      replaceMapInputRef.current.value = '';
                    }
                  }
                }}
              />
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </TerminalButton>
            </div>
          )}
        </div>

        <TabsContent value="map" className="space-y-4">
          {/* GM Marker Palette */}
          {isGM && (
            <MarkerPalette
              legendItems={legendItems}
              selectedItemId={selectedLegendItemId}
              onSelectItem={setSelectedLegendItemId}
              placementMode={placementMode}
              onModeChange={setPlacementMode}
              gmOnlyMode={gmOnlyMode}
              onGmOnlyModeChange={setGmOnlyMode}
            />
          )}

          {/* Map Canvas */}
          <MapCanvas
            imageUrl={map.image_url}
            markers={isGM ? markers : markers.filter(m => m.visibility === 'all')}
            legendItems={legendItems}
            fogRegions={fogRegions}
            isGM={isGM}
            placementMode={placementMode}
            selectedLegendItemId={selectedLegendItemId}
            gmOnlyMode={gmOnlyMode}
            onAddMarker={(posX, posY, legendItemId, visibility) => {
              createMarker.mutate({
                mapId: map.id,
                legendItemId,
                positionX: posX,
                positionY: posY,
                visibility,
                campaignId,
              });
            }}
            onUpdateMarker={(markerId, updates) => {
              updateMarkerMutation.mutate({
                markerId,
                ...updates,
                campaignId,
              });
            }}
            onDeleteMarker={(markerId) => {
              deleteMarker.mutate({ markerId, campaignId });
            }}
            onAddFogRegion={(posX, posY, width, height) => {
              createFogRegion.mutate({
                mapId: map.id,
                positionX: posX,
                positionY: posY,
                width,
                height,
                campaignId,
              });
            }}
            onToggleFogRegion={(regionId, revealed) => {
              updateFogRegion.mutate({ regionId, revealed, campaignId });
            }}
            onDeleteFogRegion={(regionId) => {
              deleteFogRegion.mutate({ regionId, campaignId });
            }}
          />

          {/* Legend Reference (always visible) */}
          {legendItems.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              {legendItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <MarkerIcon shape={item.shape} color={item.color} size={16} iconUrl={item.icon_url} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legend">
          <LegendEditor
            legendItems={legendItems}
            onAdd={(name, shape, color, iconUrl) => {
              createLegendItem.mutate({ mapId: map.id, name, shape, color, iconUrl, campaignId });
            }}
            onUpdate={(itemId, updates) => {
              updateLegendItem.mutate({ 
                itemId, 
                name: updates.name, 
                shape: updates.shape as MarkerShape, 
                color: updates.color,
                iconUrl: updates.icon_url,
                campaignId 
              });
            }}
            onDelete={(itemId) => {
              deleteLegendItem.mutate({ itemId, campaignId });
            }}
            isGM={isGM}
            campaignId={campaignId}
          />
        </TabsContent>

        {/* Fog of War Management Tab */}
        {isGM && (
          <TabsContent value="fog">
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Fog of War Regions</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Manage hidden areas on your map. Click to reveal/hide, or delete regions you no longer need.
                </p>
                
                {fogRegions.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No fog regions yet. Use the "Fog" tool on the Map tab to draw hidden areas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {fogRegions.map((region, index) => (
                      <div
                        key={region.id}
                        className="flex items-center justify-between p-3 bg-background/50 border border-border rounded"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded ${region.revealed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div>
                            <p className="text-sm font-mono">Region {index + 1}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(region.width)}% × {Math.round(region.height)}% • {region.revealed ? 'Revealed' : 'Hidden'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TerminalButton
                            variant="outline"
                            size="sm"
                            onClick={() => updateFogRegion.mutate({ regionId: region.id, revealed: !region.revealed, campaignId })}
                          >
                            {region.revealed ? 'Hide' : 'Reveal'}
                          </TerminalButton>
                          <TerminalButton
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFogRegion.mutate({ regionId: region.id, campaignId })}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </TerminalButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign Map?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the map, all legend items, and all markers.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMap.mutate({ mapId: map.id, campaignId });
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Map
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Map Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-card border-primary/30 max-w-md">
          <button
            onClick={() => setShowInstructions(false)}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <DialogHeader>
            <DialogTitle className="text-primary uppercase tracking-wider text-sm flex items-center gap-2">
              🗺️ Map Controls
            </DialogTitle>
            <DialogDescription>
              Quick reference for map features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-semibold text-foreground mb-1">📍 Placing Markers</h4>
                <p className="text-xs text-muted-foreground">
                  Create legend items first, then select one and use "Place Mode" to click on the map.
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-semibold text-foreground mb-1">✏️ Editing Markers</h4>
                <p className="text-xs text-muted-foreground">
                  In Select mode, click a marker to add a label, change visibility, or delete it. Drag markers to reposition.
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <h4 className="text-sm font-semibold text-amber-400 mb-1">🌫️ Fog of War</h4>
                <p className="text-xs text-muted-foreground">
                  Select "Fog" mode and draw rectangles to hide areas. Click fog regions to reveal/hide. Right-click to delete, or use the Fog tab for management.
                </p>
              </div>

              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-semibold text-foreground mb-1">🔍 Navigation</h4>
                <p className="text-xs text-muted-foreground">
                  Scroll to zoom, drag to pan. Use the zoom controls in the top-right corner.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <TerminalButton onClick={() => setShowInstructions(false)}>
              Got it!
            </TerminalButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

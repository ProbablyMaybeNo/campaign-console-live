import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2 } from 'lucide-react';
import { OverlayLoading, OverlayEmpty } from '@/components/ui/OverlayPanel';
import { MapUploader } from './MapUploader';
import { MapCanvas } from './MapCanvas';
import { LegendEditor } from './LegendEditor';
import { MarkerPalette } from './MarkerPalette';
import { TerminalButton } from '@/components/ui/TerminalButton';
import {
  useCampaignMap,
  useCreateMap,
  useUpdateMap,
  useDeleteMap,
  useCreateLegendItem,
  useUpdateLegendItem,
  useDeleteLegendItem,
  useCreateMarker,
  useUpdateMarker,
  useDeleteMarker,
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

interface MapManagerProps {
  campaignId: string;
  isGM: boolean;
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

  const [placementMode, setPlacementMode] = useState<'select' | 'place'>('select');
  const [selectedLegendItemId, setSelectedLegendItemId] = useState<string | null>(null);
  const [gmOnlyMode, setGmOnlyMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const { map, legendItems, markers } = data || { map: null, legendItems: [], markers: [] };

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
          <TabsList>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="legend">Legend ({legendItems.length})</TabsTrigger>
          </TabsList>
          
          {isGM && (
            <div className="flex items-center gap-2">
              <TerminalButton
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        updateMap.mutate({ mapId: map.id, imageUrl: event.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
              >
                Replace Map
              </TerminalButton>
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
            markers={markers}
            legendItems={legendItems}
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
          />

          {/* Legend Reference (always visible) */}
          {legendItems.length > 0 && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/30 border border-border rounded-lg">
              {legendItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-4 h-4 rounded-sm border border-border"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legend">
          <LegendEditor
            legendItems={legendItems}
            onAdd={(name, shape, color) => {
              createLegendItem.mutate({ mapId: map.id, name, shape, color, campaignId });
            }}
            onUpdate={(itemId, updates) => {
              updateLegendItem.mutate({ 
                itemId, 
                name: updates.name, 
                shape: updates.shape as MarkerShape, 
                color: updates.color, 
                campaignId 
              });
            }}
            onDelete={(itemId) => {
              deleteLegendItem.mutate({ itemId, campaignId });
            }}
            isGM={isGM}
          />
        </TabsContent>
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
    </div>
  );
}

import { MousePointer2, Eye, EyeOff, Cloud } from 'lucide-react';
import { MarkerIcon } from './MarkerIcon';
import type { MapLegendItem } from './types';

interface MarkerPaletteProps {
  legendItems: MapLegendItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string | null) => void;
  placementMode: 'select' | 'place' | 'fog';
  onModeChange: (mode: 'select' | 'place' | 'fog') => void;
  gmOnlyMode: boolean;
  onGmOnlyModeChange: (gmOnly: boolean) => void;
}

export function MarkerPalette({
  legendItems,
  selectedItemId,
  onSelectItem,
  placementMode,
  onModeChange,
  gmOnlyMode,
  onGmOnlyModeChange,
}: MarkerPaletteProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border rounded-lg flex-wrap">
      {/* Mode Toggle */}
      <button
        onClick={() => onModeChange('select')}
        className={`p-2 rounded ${placementMode === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        title="Select mode - click markers to edit, drag to move"
      >
        <MousePointer2 className="w-4 h-4" />
      </button>
      
      <div className="w-px h-6 bg-border" />
      
      {/* Legend Items as Placeable Markers */}
      {legendItems.length === 0 ? (
        <span className="text-xs text-muted-foreground px-2">Add legend items first</span>
      ) : (
        legendItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onModeChange('place');
              onSelectItem(item.id);
            }}
            className={`p-1.5 rounded border transition-colors ${
              placementMode === 'place' && selectedItemId === item.id 
                ? 'border-primary bg-primary/10' 
                : 'border-transparent hover:bg-muted'
            }`}
            title={`Place ${item.name}`}
          >
            <MarkerIcon shape={item.shape} color={item.color} size={24} iconUrl={item.icon_url} />
          </button>
        ))
      )}
      
      <div className="w-px h-6 bg-border" />
      
      {/* Fog of War Tool */}
      <button
        onClick={() => onModeChange('fog')}
        className={`p-2 rounded flex items-center gap-1 text-xs ${
          placementMode === 'fog' ? 'bg-amber-500/20 text-amber-400 border border-amber-500' : 'hover:bg-muted'
        }`}
        title="Fog of war - draw regions to hide from players"
      >
        <Cloud className="w-4 h-4" />
        <span className="hidden sm:inline">Fog</span>
      </button>
      
      <div className="w-px h-6 bg-border" />
      
      {/* Visibility Toggle */}
      <button
        onClick={() => onGmOnlyModeChange(!gmOnlyMode)}
        className={`p-2 rounded flex items-center gap-1 text-xs ${gmOnlyMode ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-muted'}`}
        title={gmOnlyMode ? 'New markers: GM only' : 'New markers: Visible to all'}
      >
        {gmOnlyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        <span className="hidden sm:inline">{gmOnlyMode ? 'GM Only' : 'All'}</span>
      </button>
    </div>
  );
}
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TerminalButton } from "@/components/ui/TerminalButton";
import { 
  Map, 
  Upload, 
  Link, 
  Plus, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  Circle,
  Square,
  Triangle,
  Star,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MapMarker {
  id: string;
  icon: string;
  color: string;
  name: string;
  x: number;
  y: number;
}

interface LegendItem {
  id: string;
  icon: string;
  color: string;
  name: string;
}

interface MapEditorOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  isGM: boolean;
}

const ICON_OPTIONS = [
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "square", icon: Square, label: "Square" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
  { id: "star", icon: Star, label: "Star" },
];

const COLOR_OPTIONS = [
  { id: "red", class: "bg-red-500", label: "Red" },
  { id: "blue", class: "bg-blue-500", label: "Blue" },
  { id: "green", class: "bg-green-500", label: "Green" },
  { id: "yellow", class: "bg-yellow-500", label: "Yellow" },
  { id: "white", class: "bg-white", label: "White" },
  { id: "purple", class: "bg-purple-500", label: "Purple" },
];

export function MapEditorOverlay({
  open,
  onOpenChange,
  campaignId,
  isGM,
}: MapEditorOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mapImage, setMapImage] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [mapVisible, setMapVisible] = useState(true);
  
  const [legend, setLegend] = useState<LegendItem[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  
  const [showLegendForm, setShowLegendForm] = useState(false);
  const [newLegendIcon, setNewLegendIcon] = useState("circle");
  const [newLegendColor, setNewLegendColor] = useState("red");
  const [newLegendName, setNewLegendName] = useState("");
  
  const [selectedLegendItem, setSelectedLegendItem] = useState<LegendItem | null>(null);
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMapImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      setMapImage(urlValue.trim());
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  const handleAddLegendItem = () => {
    if (!newLegendName.trim()) return;
    
    const newItem: LegendItem = {
      id: `legend-${Date.now()}`,
      icon: newLegendIcon,
      color: newLegendColor,
      name: newLegendName.trim(),
    };
    
    setLegend([...legend, newItem]);
    setNewLegendName("");
    setShowLegendForm(false);
  };

  const handleRemoveLegendItem = (id: string) => {
    setLegend(legend.filter(item => item.id !== id));
    setMarkers(markers.filter(marker => !marker.id.startsWith(id)));
    if (selectedLegendItem?.id === id) {
      setSelectedLegendItem(null);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedLegendItem || !isGM) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: MapMarker = {
      id: `${selectedLegendItem.id}-marker-${Date.now()}`,
      icon: selectedLegendItem.icon,
      color: selectedLegendItem.color,
      name: selectedLegendItem.name,
      x,
      y,
    };

    setMarkers([...markers, newMarker]);
  };

  const handleRemoveMarker = (id: string) => {
    setMarkers(markers.filter(m => m.id !== id));
  };

  const getIconComponent = (iconId: string) => {
    const iconOption = ICON_OPTIONS.find(i => i.id === iconId);
    return iconOption?.icon || Circle;
  };

  const getColorClass = (colorId: string) => {
    const colorOption = COLOR_OPTIONS.find(c => c.id === colorId);
    return colorOption?.class || "bg-white";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/30 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-primary/20 flex-row items-center justify-between">
          <DialogTitle className="text-primary uppercase tracking-widest text-sm flex items-center gap-2">
            <Map className="w-4 h-4" />
            Campaign Map Editor
          </DialogTitle>
          {isGM && mapImage && (
            <button
              onClick={() => setMapVisible(!mapVisible)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors",
                mapVisible
                  ? "bg-primary/10 border-primary/50 text-primary"
                  : "bg-muted/10 border-border text-muted-foreground"
              )}
            >
              {mapVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {mapVisible ? "Visible" : "Hidden"}
            </button>
          )}
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Legend Panel */}
          <div className="w-64 border-r border-primary/20 flex flex-col">
            <div className="p-3 border-b border-primary/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Map Legend
              </p>
              {isGM && (
                <TerminalButton onClick={() => setShowLegendForm(true)} size="sm" className="w-full">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Symbol
                </TerminalButton>
              )}
            </div>

            {/* Legend Form */}
            {showLegendForm && (
              <div className="p-3 border-b border-primary/10 space-y-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Icon
                  </label>
                  <div className="flex gap-1">
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setNewLegendIcon(opt.id)}
                        className={cn(
                          "p-2 rounded border transition-colors",
                          newLegendIcon === opt.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <opt.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Color
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setNewLegendColor(opt.id)}
                        className={cn(
                          "w-6 h-6 rounded border-2 transition-colors",
                          opt.class,
                          newLegendColor === opt.id
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newLegendName}
                    onChange={(e) => setNewLegendName(e.target.value)}
                    className="w-full bg-input border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    placeholder="Symbol name..."
                  />
                </div>

                <div className="flex gap-2">
                  <TerminalButton
                    size="sm"
                    onClick={handleAddLegendItem}
                    disabled={!newLegendName.trim()}
                    className="flex-1"
                  >
                    Add
                  </TerminalButton>
                  <TerminalButton
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLegendForm(false)}
                  >
                    <X className="w-3 h-3" />
                  </TerminalButton>
                </div>
              </div>
            )}

            {/* Legend Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {legend.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-4">
                  No legend items yet
                </p>
              ) : (
                legend.map((item) => {
                  const IconComponent = getIconComponent(item.icon);
                  const isSelected = selectedLegendItem?.id === item.id;
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group",
                        isSelected
                          ? "bg-primary/10 border border-primary/50"
                          : "hover:bg-accent/30 border border-transparent"
                      )}
                      onClick={() => setSelectedLegendItem(isSelected ? null : item)}
                    >
                      <IconComponent
                        className={cn(
                          "w-4 h-4",
                          item.color === "white" ? "text-white" :
                          item.color === "red" ? "text-red-500" :
                          item.color === "blue" ? "text-blue-500" :
                          item.color === "green" ? "text-green-500" :
                          item.color === "yellow" ? "text-yellow-500" :
                          item.color === "purple" ? "text-purple-500" :
                          "text-white"
                        )}
                        fill="currentColor"
                      />
                      <span className="text-xs font-mono flex-1 truncate">{item.name}</span>
                      {isGM && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLegendItem(item.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {selectedLegendItem && (
              <div className="p-3 border-t border-primary/10 bg-primary/5">
                <p className="text-[10px] text-primary font-mono">
                  Click on map to place marker
                </p>
              </div>
            )}
          </div>

          {/* Map Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {mapImage ? (
              <div
                className="flex-1 relative overflow-hidden bg-black/20 cursor-crosshair"
                onClick={handleMapClick}
              >
                <img
                  src={mapImage}
                  alt="Campaign Map"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />

                {/* Markers */}
                {markers.map((marker) => {
                  const IconComponent = getIconComponent(marker.icon);
                  return (
                    <div
                      key={marker.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    >
                      <IconComponent
                        className={cn(
                          "w-5 h-5 drop-shadow-lg",
                          marker.color === "white" ? "text-white" :
                          marker.color === "red" ? "text-red-500" :
                          marker.color === "blue" ? "text-blue-500" :
                          marker.color === "green" ? "text-green-500" :
                          marker.color === "yellow" ? "text-yellow-500" :
                          marker.color === "purple" ? "text-purple-500" :
                          "text-white"
                        )}
                        fill="currentColor"
                      />
                      {isGM && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMarker(marker.id);
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                        >
                          <X className="w-2 h-2 text-destructive-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Legend Overlay */}
                {legend.length > 0 && (
                  <div className="absolute bottom-4 right-4 bg-background/90 border border-border rounded p-2 space-y-1">
                    {legend.map((item) => {
                      const IconComponent = getIconComponent(item.icon);
                      return (
                        <div key={item.id} className="flex items-center gap-2">
                          <IconComponent
                            className={cn(
                              "w-3 h-3",
                              item.color === "white" ? "text-white" :
                              item.color === "red" ? "text-red-500" :
                              item.color === "blue" ? "text-blue-500" :
                              item.color === "green" ? "text-green-500" :
                              item.color === "yellow" ? "text-yellow-500" :
                              item.color === "purple" ? "text-purple-500" :
                              "text-white"
                            )}
                            fill="currentColor"
                          />
                          <span className="text-[10px] font-mono">{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Remove Map Button */}
                {isGM && (
                  <button
                    onClick={() => setMapImage("")}
                    className="absolute top-4 right-4 bg-destructive/80 text-destructive-foreground p-2 rounded hover:bg-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {isGM ? (
                  <>
                    {showUrlInput ? (
                      <div className="w-full max-w-md space-y-2 px-4">
                        <input
                          type="text"
                          value={urlValue}
                          onChange={(e) => setUrlValue(e.target.value)}
                          placeholder="Enter map image URL..."
                          className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                        />
                        <div className="flex gap-2">
                          <TerminalButton onClick={handleUrlSubmit} className="flex-1">
                            Set Map
                          </TerminalButton>
                          <TerminalButton variant="outline" onClick={() => setShowUrlInput(false)}>
                            Cancel
                          </TerminalButton>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Map className="w-16 h-16 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-sm">No map image set</p>
                        <div className="flex gap-3">
                          <TerminalButton onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Map
                          </TerminalButton>
                          <TerminalButton variant="outline" onClick={() => setShowUrlInput(true)}>
                            <Link className="w-4 h-4 mr-2" />
                            From URL
                          </TerminalButton>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Map className="w-16 h-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-sm">No map available</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isGM && mapImage && (
          <div className="px-6 py-4 border-t border-primary/20 flex justify-end">
            <TerminalButton onClick={() => onOpenChange(false)}>
              <Save className="w-4 h-4 mr-2" />
              Save & Close
            </TerminalButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

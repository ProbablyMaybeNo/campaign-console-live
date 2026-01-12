import { useState, useRef } from "react";
import { Upload, X, Link, Map, ZoomIn, ZoomOut } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface MapWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface MapConfig {
  imageUrl?: string;
  title?: string;
}

export function MapWidget({ component, isGM }: MapWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [zoom, setZoom] = useState(1);
  const [titleEdit, setTitleEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = (component.config as MapConfig) || {};
  const imageUrl = config.imageUrl || "";
  const title = config.title || "Campaign Map";

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      updateComponent.mutate({
        id: component.id,
        config: { ...config, imageUrl: urlValue.trim() },
      });
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      updateComponent.mutate({
        id: component.id,
        config: { ...config, imageUrl: base64 },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleTitleSave = (newTitle: string) => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, title: newTitle },
    });
    setTitleEdit(false);
  };

  const handleRemoveImage = () => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, imageUrl: "" },
    });
    setZoom(1);
  };

  // No map image - show upload options
  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {isGM ? (
          <>
            {showUrlInput ? (
              <div className="w-full space-y-2 px-4">
                <input
                  type="text"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="Enter map image URL..."
                  className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 bg-primary/20 border border-primary text-primary text-xs py-1 rounded hover:bg-primary/30"
                  >
                    Set Map
                  </button>
                  <button
                    onClick={() => setShowUrlInput(false)}
                    className="px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Map className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No map image set</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Upload className="w-3 h-3" /> Upload Map
                  </button>
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link className="w-3 h-3" /> URL
                  </button>
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
            <Map className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No map available</p>
          </>
        )}
      </div>
    );
  }

  // Map is set - display it with zoom controls
  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="pb-2 border-b border-border mb-2">
        {titleEdit && isGM ? (
          <input
            autoFocus
            type="text"
            defaultValue={title}
            className="w-full bg-input border border-primary rounded px-2 py-1 text-xs font-mono"
            onBlur={(e) => handleTitleSave(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setTitleEdit(false);
            }}
          />
        ) : (
          <p
            className={`text-xs font-mono text-primary ${isGM ? "cursor-pointer hover:underline" : ""}`}
            onClick={() => isGM && setTitleEdit(true)}
          >
            {title}
          </p>
        )}
      </div>

      {/* Map Image with Zoom */}
      <div className="flex-1 relative group overflow-hidden rounded bg-black/20">
        <div
          className="w-full h-full overflow-auto"
          style={{ cursor: zoom > 1 ? "move" : "default" }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="transition-transform origin-top-left"
            style={{ transform: `scale(${zoom})`, minWidth: "100%", minHeight: "100%" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
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

        {/* Remove button for GM */}
        {isGM && (
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove map"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

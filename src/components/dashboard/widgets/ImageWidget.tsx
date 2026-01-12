import { useState, useRef } from "react";
import { Upload, X, Link, Image as ImageIcon } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";

interface ImageWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface ImageConfig {
  imageUrl?: string;
  caption?: string;
}

export function ImageWidget({ component, isGM }: ImageWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [captionEdit, setCaptionEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = (component.config as ImageConfig) || {};
  const imageUrl = config.imageUrl || "";
  const caption = config.caption || "";

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

    // Convert to base64 for display (note: for production, use Supabase Storage)
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

  const handleCaptionSave = (newCaption: string) => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, caption: newCaption },
    });
    setCaptionEdit(false);
  };

  const handleRemoveImage = () => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, imageUrl: "" },
    });
  };

  // No image yet - show upload options
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
                  placeholder="Enter image URL..."
                  className="w-full bg-input border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
                  onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 bg-primary/20 border border-primary text-primary text-xs py-1 rounded hover:bg-primary/30"
                  >
                    Add Image
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
                <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No image set</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Upload className="w-3 h-3" /> Upload
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
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No image set</p>
          </>
        )}
      </div>
    );
  }

  // Image is set - display it
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative group overflow-hidden rounded">
        <img
          src={imageUrl}
          alt={caption || "Component image"}
          className="w-full h-full object-contain bg-black/20"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        {isGM && (
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Caption */}
      <div className="pt-2 border-t border-border mt-2">
        {captionEdit && isGM ? (
          <input
            autoFocus
            type="text"
            defaultValue={caption}
            placeholder="Add caption..."
            className="w-full bg-input border border-primary rounded px-2 py-1 text-xs"
            onBlur={(e) => handleCaptionSave(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCaptionSave((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setCaptionEdit(false);
            }}
          />
        ) : (
          <p
            className={`text-xs text-muted-foreground text-center ${isGM ? "cursor-pointer hover:text-foreground" : ""}`}
            onClick={() => isGM && setCaptionEdit(true)}
          >
            {caption || (isGM ? "Click to add caption" : "")}
          </p>
        )}
      </div>
    </div>
  );
}

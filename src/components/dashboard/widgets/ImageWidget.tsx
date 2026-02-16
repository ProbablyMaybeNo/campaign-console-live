import { useState, useRef } from "react";
import { Upload, X, Link, Image as ImageIcon, Loader2 } from "lucide-react";
import { DashboardComponent, useUpdateComponent } from "@/hooks/useDashboardComponents";
import { uploadCampaignImage, ImageUploadError, isBase64Image, deleteCampaignImage, getPathFromUrl } from "@/lib/imageStorage";
import { toast } from "sonner";

interface ImageWidgetProps {
  component: DashboardComponent;
  isGM: boolean;
}

interface ImageConfig {
  imageUrl?: string;
  imagePath?: string; // Storage path for cleanup
  caption?: string;
}

export function ImageWidget({ component, isGM }: ImageWidgetProps) {
  const updateComponent = useUpdateComponent();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [captionEdit, setCaptionEdit] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = (component.config as ImageConfig) || {};
  const imageUrl = config.imageUrl || "";
  const caption = config.caption || "";

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      updateComponent.mutate({
        id: component.id,
        config: { ...config, imageUrl: urlValue.trim(), imagePath: undefined },
      });
      setUrlValue("");
      setShowUrlInput(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadCampaignImage(component.campaign_id, file, "widgets");
      updateComponent.mutate({
        id: component.id,
        config: { ...config, imageUrl: result.url, imagePath: result.path },
      });
    } catch (error) {
      if (error instanceof ImageUploadError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to upload image");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCaptionSave = (newCaption: string) => {
    updateComponent.mutate({
      id: component.id,
      config: { ...config, caption: newCaption },
    });
    setCaptionEdit(false);
  };

  const handleRemoveImage = async () => {
    // Clean up stored image if it's from our storage
    const path = config.imagePath || getPathFromUrl(imageUrl);
    if (path && !isBase64Image(imageUrl)) {
      await deleteCampaignImage(path);
    }
    
    updateComponent.mutate({
      id: component.id,
      config: { ...config, imageUrl: "", imagePath: undefined },
    });
  };

  // No image yet - show upload options
  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        {isGM ? (
          <>
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
            ) : showUrlInput ? (
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
                <p className="text-[10px] text-muted-foreground/60">Max 10MB • JPG, PNG, GIF, WebP</p>
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
                  accept="image/jpeg,image/png,image/gif,image/webp"
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

  // Image is set - display it edge-to-edge (chromeless)
  return (
    <div className="h-full w-full relative group">
      <img
        src={imageUrl}
        alt={caption || "Component image"}
        className="w-full h-full object-contain"
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
  );
}

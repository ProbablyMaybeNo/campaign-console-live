import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { TerminalButton } from '@/components/ui/TerminalButton';
import { TerminalInput } from '@/components/ui/TerminalInput';
import { uploadCampaignImage, ImageUploadError } from '@/lib/imageStorage';
import { toast } from 'sonner';

interface MapUploaderProps {
  campaignId: string;
  onUpload: (imageUrl: string) => void;
  isLoading?: boolean;
}

export function MapUploader({ campaignId, onUpload, isLoading }: MapUploaderProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Use JPG, PNG, GIF, or WebP');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
      setPendingFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim()) {
      setPreview(urlValue.trim());
      setPendingFile(null); // URL, not a file
      setShowUrlInput(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    // If it's a file, upload to storage
    if (pendingFile) {
      setIsUploading(true);
      try {
        const result = await uploadCampaignImage(campaignId, pendingFile, 'maps');
        onUpload(result.url);
      } catch (error) {
        if (error instanceof ImageUploadError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to upload map image');
        }
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    } else {
      // It's a URL, use directly
      onUpload(preview);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setUrlValue('');
    setPendingFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30">
          <img 
            src={preview} 
            alt="Map preview" 
            className="w-full h-64 object-contain"
            onError={() => {
              setPreview(null);
              setPendingFile(null);
              toast.error('Failed to load image preview');
            }}
          />
          <button
            onClick={handleCancel}
            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
            disabled={isUploading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <TerminalButton variant="outline" size="sm" onClick={handleCancel} disabled={isUploading}>
            Cancel
          </TerminalButton>
          <TerminalButton size="sm" onClick={handleConfirm} disabled={isLoading || isUploading}>
            {isUploading || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Use This Map'
            )}
          </TerminalButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/20">
      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-2">Upload Campaign Map</p>
      <p className="text-sm text-muted-foreground mb-2 text-center">
        Upload an image file or paste a URL to your campaign territory map
      </p>
      <p className="text-xs text-muted-foreground/60 mb-6">
        Max 10MB • JPG, PNG, GIF, WebP
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {showUrlInput ? (
        <div className="flex gap-2 w-full max-w-md">
          <TerminalInput
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://example.com/map.jpg"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <TerminalButton size="sm" onClick={handleUrlSubmit}>
            Load
          </TerminalButton>
          <TerminalButton variant="outline" size="sm" onClick={() => setShowUrlInput(false)}>
            Cancel
          </TerminalButton>
        </div>
      ) : (
        <div className="flex gap-3">
          <TerminalButton onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Choose File
          </TerminalButton>
          <TerminalButton variant="outline" onClick={() => setShowUrlInput(true)}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Paste URL
          </TerminalButton>
        </div>
      )}
    </div>
  );
}
